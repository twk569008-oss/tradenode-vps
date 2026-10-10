# Deployment Guide — TradeNode VPS on Netlify + Supabase

## ⚠️ Read this first (honest note)

Your app currently uses **better-sqlite3**, which stores the whole database on a single file on disk. That works great on a **regular server** (VPS, Render, Fly.io, Railway). It does **NOT work on Netlify Functions**, because:

- Netlify Functions are **serverless** — the filesystem is **read-only** and lives only for the duration of one request.
- Each request may run on a different instance; your SQLite file disappears between calls.

**So you have 2 real paths:**

| Path | Effort | Notes |
|------|--------|-------|
| A. Deploy to Render / Fly.io / a $4 VPS | ~30 min | Zero code change, SQLite keeps working, uploads stored on disk |
| B. Port to Supabase Postgres + Netlify | ~4–8 hours | Real serverless stack, storage moved to Supabase Storage |

Path B is what you asked for; here's the full recipe.

---

## Path A — simplest (recommended if you want it running today)

1. Push this repo to GitHub.
2. Sign up at [render.com](https://render.com) → **New → Web Service** → connect the repo.
3. Build command: `npm install && npm run build`  ·  Start command: `npm start`.
4. Add a persistent Disk mounted at `/app/data` (to keep SQLite + uploaded screenshots alive across redeploys).
5. Env vars: `TRADENODE_DATA_DIR=/app/data`, `CREDENTIAL_ENCRYPTION_KEY=<gen one with node -e ...>`, plus SMTP vars.
6. Create your admin: open the Render shell once and run `node scripts/create-admin.cjs alnader2026r@gmail.com 'YourStrongPass#2026'`.
7. Point your domain's `A/CNAME` at Render and enable auto HTTPS.

---

## Path B — Netlify + Supabase (full serverless)

### 0. Supabase project
1. Go to [supabase.com](https://supabase.com) → **New project** (free tier works). Remember your **database password**.
2. Open **Project Settings → Database → Connection string → URI**. Keep it secret.
3. In Supabase **Storage**, create two **private** buckets: `payment-proofs` and `ticket-attachments`.

### 1. Port the database layer
- Create a Supabase table matching each currently-used table (`users`, `orders`, `plans`, `payment_networks`, `payment_submissions`, `vps_instances`, `subscriptions`, `tickets`, `ticket_messages`, `coupons`, `notifications`, `audit_logs`, `settings`, `pricing_comparisons`, `email_log`).
- Fastest way: export `migrations/001_init.sql` and hand-convert it to Postgres SQL (mostly find-and-replace — SQLite `TEXT` → `TEXT`, `INTEGER` booleans → `BOOLEAN`, add `TIMESTAMPTZ` for date columns).
- Replace `getDb()` usage in `src/db/db.ts` with the Supabase client (`@supabase/supabase-js`).
- For file operations (proof screenshots), switch `src/app/api/orders/[orderNumber]/proof/route.ts` from `fs.writeFile` to `supabase.storage.from('payment-proofs').upload(...)`; switch reads to signed URLs (`createSignedUrl`).

### 2. Code changes needed in this app (checklist)
- [ ] `npm i @supabase/supabase-js` — remove `better-sqlite3`.
- [ ] Rewrite `src/db/db.ts` + all SQL call sites (search `getDb().prepare` — ~25 files).
- [ ] `bcryptjs` and AES-256-GCM (`src/lib/crypto.ts`) work fine in serverless — keep.
- [ ] Move file writes (`fs/promises`) to Supabase Storage in:
  - `src/app/api/orders/[orderNumber]/proof/route.ts`
  - `src/app/api/customer/proof/[submissionId]/route.ts`
  - `src/app/api/admin/proof/route.ts`
- [ ] Update `next.config.ts`: add `@netlify/plugin-nextjs` (auto-detected by `npx netlify-cli init`).

### 3. Netlify
1. `npx netlify-cli init` → link a new site.
2. `netlify.toml`:
   ```toml
   [build]
     command = "npm run build"
     publish = ".next"
   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```
3. **Site configuration → Environment variables** (paste the same values locally for `netlify dev` too):
   ```
   DATABASE_URL=postgresql://...          # from Supabase
   SUPABASE_URL=https://xxxx.supabase.co  # from Supabase
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # server-only, never client
   CREDENTIAL_ENCRYPTION_KEY=<64 hex>
   APP_BASE_URL=https://your-site.netlify.app
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your@gmail.com
   SMTP_PASS=<app password>
   SMTP_FROM=TradeNode VPS <your@gmail.com>
   CRON_SECRET=<random hex>
   ```
4. Deploy: `git push` (auto-deploy) or `netlify deploy --prod`.

### 4. Scheduled jobs (expiry reminders/expiry emails)
Netlify Scheduled Functions run on a fixed cron. Create `netlify/functions/run-jobs.ts` that calls `runSubscriptionJobs()`; schedule it daily. Alternative: point a free [cron-job.org](https://cron-job.org) job at `https://your-site.netlify.app/api/cron/run-jobs` with header `x-cron-secret: $CRON_SECRET`.

### 5. Admin creation on Supabase
Run `node scripts/create-admin.cjs alnader2026r@gmail.com 'YourStrongPass#2026'` locally **while pointed at Supabase**. You may need to add a small adapter in the script that writes through the Supabase client instead of better-sqlite3.

### 6. Verify deployment checklist
- [ ] Register a fresh account → welcome email arrives.
- [ ] Order created → proof uploaded → admin queue shows it.
- [ ] Admin approves → customer receives "Payment verified" email.
- [ ] Admin sends VPS details → customer sees them under "My VPS Servers".
- [ ] Dashboard does not leak other customers' data (test via incognito customer).
- [ ] Route `/admin` redirects anonymous users to login.

### 7. Monthly cost estimate
| Service | Free tier |
|---------|-----------|
| Supabase | Free: 500 MB DB, 1 GB storage, 50k MAU |
| Netlify | Free: 100 GB bandwidth / mo, 300 build minutes |
| Gmail SMTP | Free: ~500 mails/day with an app password |
| Cron-job.org | Free |

Total: **$0/mo** until you exceed free tiers — usually fine for the first ~100 customers.

---

## SMTP (the fix for "no email arrives")

To make queued emails actually send:

1. **Gmail**: enable 2FA on your Google account, then go to https://myaccount.google.com/apppasswords and generate an app password (16 characters).
2. Set the SMTP_* env vars above with `SMTP_FROM=TradeNode VPS <your-email@gmail.com>`.
3. Restart the app — every queued email (welcome, approval, delivery, renewal) is flushed on each successful login/cron run.

Without SMTP env the emails stay in `email_log` (admin can inspect them) — this is why you saw no email arrive.
