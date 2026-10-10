-- TradeNode VPS — Supabase schema (Postgres), fully replacing SQLite
-- Run this once in Supabase → SQL Editor (or via supabase db push).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  theme TEXT NOT NULL DEFAULT 'dark',
  is_active BOOLEAN NOT NULL DEFAULT true,
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  ip TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  tagline_en TEXT,
  tagline_ar TEXT,
  cpu TEXT NOT NULL,
  ram TEXT NOT NULL,
  storage TEXT NOT NULL,
  bandwidth TEXT DEFAULT 'Unmetered*',
  monthly_price NUMERIC(10,2) NOT NULL,
  billing_periods TEXT NOT NULL DEFAULT 'monthly,quarterly,semiannual,annual',
  billing_discount_quarterly NUMERIC(4,2) DEFAULT 0.05,
  billing_discount_semiannual NUMERIC(4,2) DEFAULT 0.10,
  billing_discount_annual NUMERIC(4,2) DEFAULT 0.18,
  os TEXT NOT NULL DEFAULT 'Windows Server (if infrastructure supports)',
  capacity_title_en TEXT,
  capacity_title_ar TEXT,
  best_for_en TEXT,
  best_for_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_soldout BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 100,
  custom_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  billing_period TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  price_crypto NUMERIC(20,8),
  payment_network TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN
    ('pending_payment','payment_submitted','under_review','payment_approved','awaiting_vps','vps_provisioning','active','payment_rejected','cancelled','expired','refunded')),
  coupon_code TEXT,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  renewal_reminder_sent BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS payment_fields (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value TEXT NOT NULL,
  UNIQUE(order_id, field_key)
);

CREATE TABLE IF NOT EXISTS payment_networks (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  network_chain TEXT NOT NULL,
  deposit_address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  confirmations_required INTEGER NOT NULL DEFAULT 1,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS payment_submissions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  network_code TEXT NOT NULL,
  transaction_hash TEXT,
  amount_crypto NUMERIC(20,8),
  amount_usd NUMERIC(10,2),
  screenshot_storage_key TEXT,
  screenshot_mime TEXT,
  screenshot_size INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewer_id TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_submissions_order ON payment_submissions(order_id);

CREATE TABLE IF NOT EXISTS vps_instances (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  hostname TEXT,
  ip TEXT,
  rdp_port INTEGER,
  username TEXT,
  password_encrypted TEXT,
  password_hint TEXT,
  os TEXT,
  specs TEXT,
  provisioning_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  expiration_date TIMESTAMPTZ,
  setup_instructions TEXT,
  private_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','provisioning','ready','active','suspended','expired')),
  sent_to_customer BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vps_id TEXT NOT NULL REFERENCES vps_instances(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','suspended','expired','cancelled')),
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  extended_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subs_end ON subscriptions(end_date);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id),
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('technical','connection','payment','renewal','other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered','customer_replied','pending_customer','resolved','closed')),
  unread_admin BOOLEAN NOT NULL DEFAULT true,
  unread_customer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer','admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES ticket_messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  scan_flag TEXT
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  order_type TEXT NOT NULL DEFAULT 'all' CHECK (order_type IN ('all','new','renewal')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS pricing_comparisons (
  id TEXT PRIMARY KEY,
  our_plan_id TEXT REFERENCES plans(id),
  competitor_name TEXT NOT NULL,
  competitor_plan TEXT NOT NULL,
  competitor_specs TEXT,
  competitor_price NUMERIC(10,2) NOT NULL,
  competitor_currency TEXT NOT NULL DEFAULT 'USD',
  billing_period TEXT NOT NULL,
  source_url TEXT,
  last_checked TIMESTAMPTZ NOT NULL,
  our_price NUMERIC(10,2) NOT NULL,
  pct_diff NUMERIC(6,2) NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_log (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  related_type TEXT,
  related_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS _migration_ledger (
  file TEXT PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════ Seed data ═══════
INSERT INTO users (id, name, email, password_hash, locale, role, is_active, created_at, updated_at)
VALUES ('usr_seed_admin', 'Administrator', 'admin@tradenodevps.local', 'PENDING-RESET-BY-SCRIPT', 'en', 'admin', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_networks (id, code, name_en, name_ar, network_chain, deposit_address, is_active, confirmations_required, sort_order)
VALUES
  ('pn_trc20', 'TRC20-USDT', 'Tether USDT', 'تيثر USDT', 'TRON (TRC20)', 'TDhXhUyfV24TBRfMyYDUfE7fV1u5LX9Q7f', true, 1, 1),
  ('pn_erc20', 'ERC20-USDT', 'Tether USDT', 'تيثر USDT', 'Ethereum (ERC20)', '0xc1a088cfcb7a378a09f7bb7181acd4860a17a79d', true, 2, 2),
  ('pn_sol',   'SOL', 'Solana', 'سولانا', 'Solana', 'FitR4tQJeiFMA5V1GumsWrVrShUm1sUr7Suu1p5BTRMZ', true, 1, 3),
  ('pn_bnb',   'BNB', 'BNB', 'بينانس كوين', 'BNB Smart Chain (BEP20)', '0xc1a088cfcb7a378a09f7bb7181acd4860a17a79d', true, 1, 4),
  ('pn_btc',   'BTC', 'Bitcoin', 'بيتكوين', 'Bitcoin', 'bc1q7xdzz07e6ar9wer5hu59z6954dd6hpr2a7cya44h6m32pmp70tdqsv3tqy', true, 2, 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO plans (id, slug, name_en, name_ar, tagline_en, tagline_ar, cpu, ram, storage, monthly_price, os, capacity_title_en, capacity_title_ar, best_for_en, best_for_ar, is_active, featured, sort_order)
VALUES
  ('pl_starter', 'starter-trader', 'Starter Trader', 'المتداول المبتدئ', 'Lightweight automated trading.', 'تداول آلي خفيف.', '1 vCPU', '3 GB', '30 GB SSD', 2.0, 'Windows Server (if infrastructure supports)', '1–2 MetaTrader terminals', '1–2 طرف ميتاتريدر', 'Beginners and lightweight automated trading.', 'المبتدئون والتداول الآلي الخفيف.', true, false, 1),
  ('pl_plus', 'trader-plus', 'Trader Plus', 'المتداول الإضافي', 'Several charts and EAs.', 'عدة رسوم وخبرات آلية.', '2 vCPU', '4 GB', '50 GB SSD', 5.0, 'Windows Server (if infrastructure supports)', '2–4 MetaTrader terminals', '2–4 طرف ميتاتريدر', 'Traders operating several charts and EAs.', 'المتداولون الذين يديرون عدة رسوم بيانية.', true, true, 2),
  ('pl_pro', 'pro-trader', 'Pro Trader', 'المتداول المحترف', 'More demanding setups.', 'إعدادات أكثر تطلباً.', '2–4 vCPU', '6 GB', '80 GB SSD', 8.0, 'Windows Server (if infrastructure supports)', '4–6 MetaTrader terminals', '4–6 طرف ميتاتريدر', 'More demanding trading setups.', 'إعدادات التداول الأكثر تطلباً.', true, false, 3),
  ('pl_scalper', 'scalper-pro', 'Scalper Pro', 'السكالبر المحترف', 'Advanced multi-terminal.', 'متعدد الأطراف للسكالبنج.', '4 vCPU', '8 GB', '100 GB SSD', 12.0, 'Windows Server (if infrastructure supports)', '6–10 MetaTrader terminals', '6–10 طرف ميتاتريدر', 'Advanced multi-terminal trading setups.', 'إعدادات التداول المتقدم متعدد الأطراف.', true, false, 4),
  ('pl_ea', 'ea-power', 'EA Power', 'قوة الخبرة الآلية', 'Resource-intensive bots.', 'روبوتات مكثفة الموارد.', '6 vCPU', '16 GB', '160 GB SSD', 18.0, 'Windows Server (if infrastructure supports)', '10+ MetaTrader terminals (subject to performance testing)', 'أكثر من 10 أطراف (بشرط اختبار الأداء)', 'Resource-intensive automated trading.', 'التداول الآلي مكثف الموارد.', true, false, 5),
  ('pl_ult12', 'ultimate-12', 'Ultimate 12', 'ألتميت 12', 'Heavy multi-terminal and bot farms.', 'للمحطات المتعددة ومزارع البوتات الثقيلة.', '8 vCPU', '12 GB', '200 GB NVMe SSD', 25.0, 'Windows Server 2022', '8–15 MT terminals', '٨–١٥ طرف ميتاتريدر', 'Serious scalpers and multi-bot operators.', 'لسكالرز المحترفين ومشغلي البوتات المتعددين.', true, false, 6),
  ('pl_ult16', 'ultimate-16', 'Ultimate 16', 'ألتميت 16', 'The flagship: max RAM for dense EA fleets.', 'الرائدة: أقصى ذاكرة لأسراب الإكسبرتات.', '10 vCPU', '16 GB', '300 GB NVMe SSD', 32.0, 'Windows Server 2022', '15+ MT terminals', 'أكثر من ١٥ طرف ميتاتريدر', 'Institutional-grade bot fleets and heavy backtesting.', 'أساطيل بوتات بمستوى المؤسسات واختبارات ثقيلة.', true, true, 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO settings (key, value) VALUES
  ('site.name', 'TradeNode VPS'),
  ('site.tagline_en', 'Trading-focused hosting. Simple plans. Competitive prices.'),
  ('site.tagline_ar', 'استضافة مخصصة للتداول. خطط بسيطة. أسعار تنافسية.'),
  ('site.support_email', 'alnader2026r@gmail.com'),
  ('site.estimated_delivery_window', 'within 24 hours after payment approval (estimated, not guaranteed)'),
  ('payments.manual_review_required', 'true'),
  ('payments.allow_admin_manual_amount', 'true'),
  ('billing.max_upfront_months', '12'),
  ('security.upload_max_bytes', '5242880'),
  ('security.allowed_upload_mimes', 'image/png,image/jpeg,image/webp,application/pdf'),
  ('security.session_ttl_hours', '720'),
  ('provisioning.mode', 'manual'),
  ('provisioning.automation_enabled', 'false'),
  ('provisioning.provider', 'NONE—no provider API configured'),
  ('maintenance.show_fake_metrics', 'false')
ON CONFLICT (key) DO NOTHING;
