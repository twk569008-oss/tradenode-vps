# 🚀 دليل الرفع على الإنترنت + الفهرسة في جوجل

## الخطوة ١ — حل سريع لرفع الموقع اليوم (Render.com — بدون تعديل كود)

> 💡 **ليش Render؟** لأن كودك الحالي يستخدم SQLite on-disk و uploads في مجلد. Render يوفر قرص دائم، عكس Netlify.

### أ) ارفع الكود على GitHub
1. أنشئ حساباً على [github.com](https://github.com) (لو ما عندك).
2. أنشئ repository **خاص (private)** اسمه `tradenode-vps`.
3. من جهازك في مجلد المشروع:
```bash
git init
git add .
git commit -m "Initial commit - TradeNode VPS"
git branch -M main
git remote add origin https://github.com/[اسم-حسابك]/tradenode-vps.git
git push -u origin main
```
4. **⚠️ مهم:** تأكد أن `.gitignore` يحتوي `tradenode-data/` و `.env*` — (موجود، لا تغيّره).

### ب) أنشئ حساباً على Render
1. [render.com](https://render.com) → سجّل بـ GitHub.
2. **New +** → **Web Service** → اختر repo `tradenode-vps`.
3. الإعدادات:
   - **Language:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. **Advanced → Add Disk**:
   - **Name:** `data`
   - **Mount Path:** `/app/data`
   - **Size:** 1 GB (free)
5. **Environment Variables** (انسخ بالكامل):
   ```
   TRADENODE_DATA_DIR = /app/data
   CREDENTIAL_ENCRYPTION_KEY = 38a000f5ecb0180bb349438566060cf74a49bc6e72ffd9ca78379f6910f79524
   CRON_SECRET = [القيمة اللي في .env.local]
   APP_BASE_URL = https://[اسم-الموقع].onrender.com
   NODE_VERSION = 22
   ```
6. اضغط **Create Web Service** وانتظر 3–5 دقائق.
7. سيعطيك رابط مثل `https://tradenode-vps.onrender.com` — **هذا موقعك المباشر**.

### ج) أنشئ حساب الأدمن على Render
1. من لوحة Render → موقعك → **Shell** (باتش terminal مباشر).
2. نفّذ:
```bash
node scripts/create-admin.cjs alnader2026r@gmail.com 'Tnode#Admin2026'
```
3. سجّل دخول من `/login` — ستنتقل لـ `/admin` تلقائياً.

### د) اربط دومين حقيقي (اختياري لكن مهم للفهرسة)
1. اشترِ دومين من [namecheap.com](https://namecheap.com) أو [cloudflare.com](https://cloudflare.com) (~$10/سنة).
2. في إدارة الدومين → DNS → أضف:
   - **CNAME record**: `@` → `tradenode-vps.onrender.com` (أو `www`)
3. في Render → **Settings → Custom Domains → Add** → اكتب دومينك.
4. HTTPS يُفعّل تلقائياً خلال ساعة.

</details>

---

## الخطوة ٢ — إعداد البريد ليصل فعلياً (Gmail SMTP مجاناً)

### ليش وصلت رسائل أو_errors؟
الكود يخزنها في قاعدة البيانات بوضع **queued** لكن لا قدرة على الإرسال بدون SMTP. لإصلاحه:

### إعداد Gmail خطوة بخطوة:
1. في Gmail الحساب [alnader2026r@gmail.com](mailto:alnader2026r@gmail.com):
   - اذهب إلى: https://myaccount.google.com/security
   - فعّل **2-Step Verification** (إن لم تكن مفعل).
2. أنشئ **App Password**:
   - اذهب إلى: https://myaccount.google.com/apppasswords
   - اختر **Other** واكتب اسم "TradeNode VPS"
   - انسخ الـ 16 رمز (مثل `abcd efgh ijkl mnop`)
3. في Render → Environment Variables أضف:
   ```
   SMTP_HOST = smtp.gmail.com
   SMTP_PORT = 587
   SMTP_USER = alnader2026r@gmail.com
   SMTP_PASS = [هنا الـ 16 رمز بدون مسافات]
   SMTP_FROM = TradeNode VPS <alnader2026r@gmail.com>
   SMTP_SECURE = false
   ```
4. أعد النشر (**Manual Deploy → Deploy latest commit**).
5. اختبر: أنشئ حساباً جديداً من الموقع → ستصل رسالة الترحيب على الفور.

---

## 🔍 الخطوة ٣ — فهرسة الموقع في Google و Bing (مجاناً)

### أ) Google Search Console (الأهم)
1. اذهب إلى: https://search.google.com/search-console
2. اضغط **Add Property** → اختر **URL prefix** → أدخل رابط موقعك `https://tradenode-vps.onrender.com`
3. للتحقق اختر **HTML tag**، ستعطيك كود مثل:
   ```html
   <meta name="google-site-verification" content="abc123xyz..." />
   ```
   **انسخ الـ `content` فقط** وأخبرني به — سأضيفه لك في الموقع.
4. بعد التحقق، في القائمة الجانبية: **Sitemaps** → أضف:
   ```
   sitemap.xml
   ```
   واضغط **Submit**.
5. لإضافة فورية، في **URL Inspection** (شريط البحث بالأعلى) ضع رابط كل صفحة واضغط **Request Indexing**.

### 🔗 روابط صفحاتك كلها التي تحتاج فهرسة:
بعد ما يصير موقعك live، أرسل هذه الروابط واحدة تلو الأخرى في URL Inspection:

```
https://your-site.com/
https://your-site.com/plans
https://your-site.com/features
https://your-site.com/how-it-works
https://your-site.com/faq
https://your-site.com/contact
https://your-site.com/about
https://your-site.com/terms
https://your-site.com/privacy
https://your-site.com/refund-policy
https://your-site.com/order-status
https://your-site.com/vps/forex-vps
https://your-site.com/vps/mt4-vps
https://your-site.com/vps/mt5-vps
https://your-site.com/vps/xauusd-scalping-vps
https://your-site.com/vps/ea-vps
https://your-site.com/vps/windows-vps
```

### ب) Bing Webmaster Tools
1. https://www.bing.com/webmasters
2. **Get started** → **Import from Google Search Console** (يعمل تلقائياً).

### ج) روابط لرفع الموقع في محركات ومجلدات (مجاناً)
- Google: https://search.google.com/search-console
- Bing: https://www.bing.com/webmasters
- Yandex: https://webmaster.yandex.com
- IndexNow (فهرسة فورية): https://www.indexnow.org (يدعم Bing + Yandex)
- URL Opener للتسليم الدفعي: https://www.submitstart.com

### د) موجز الموقع (Sitemap) المُجهز تلقائياً
بعد الرفع، سيعمل تلقائياً:
- `https://your-site.com/sitemap.xml` — خريطة كل صفحاتك
- `https://your-site.com/robots.txt` — يحظر `/admin` و `/dashboard`

كلاهما جاهز، وجوجل يكتشفهما تلقائياً بعد الرفع.

---

## ⚡ بدائل سريعة (لو ما تريد Render)

| المنصة |时间长 | السعر | العملة |
|--------|--------|-------|--------|
| **Render.com** | 10 دقائق | مجاناً (مع نوم الموقع بعد 15 د خمول) | كبد بسيط |
| **Railway.app** | 10 دقائق | $5/شهر بعد Tier Free | كبد بسيط |
| **Fly.io** | 15 دقيقة | Free tier | متوسط |
| **VPS + Coolify** | 30 دقيقة | $4/شهر (Hetzner) | متوسط |
| **Netlify + Supabase** | 4-6 ساعات | مجاناً | صعب — يحتاج تحويل DB من SQLite إلى Postgres |

**توصيتي لبدء سريع:** Render مجاني (مع تحذير أن الموقع ينام بعد 15 دقيقة بلا زيارات — يصحى تلقائياً في 30 ثانية). لو تريد دائماً مستيقظاً، اشترِ **Starter Plan بـ $7/شهر**.

---

## الخطوة ٤ — تشغيل مهام الأشتراكات (تذكير التجديد والانتهاء)

بعد الرفع، سجّل في [cron-job.org](https://cron-job.org) مجاناً:
- **URL:** `https://your-site.com/api/cron/run-jobs`
- **Header:** `x-cron-secret: [قيمة CRON_SECRET من .env.local]`
- **Schedule:** كل ساعة أو مرة يومياً

سيقوم تلقائياً بإرسال:
- تذكير قبل 7 و3 و1 أيام من انتهاء الاشتراك
- إشعار يوم انتهاء الاشتراك مع رابط التجديد

---

## ✅ قائمة تحقق نهائية بعد الرفع

- [ ] الموقع يفتح في المتصفح (رابط Render).
- [ ] تسجيل الدخول للأدمن يعمل.
- [ ] سجّل حساباً تجريبياً → وصلك إيميل الترحيب فخم.
- [ ] أطلب خطة → ارفع Screenshot → فعّلها من الأدمن → وصلك إيميل الموافقة.
- [ ] فعّل حساب تجريبي آخر → جرب فتح تذكرة → أرسل رسالة من الأدمن → وصلت إشعارات.
- [ ] أرسل sitemap.xml إلى Google Search Console.
- [ ] حلل تحليلات الموقع (اختياري): أضف Google Analytics أو Plausible.

## الأخطاء الشائعة وحلولها

| الخطأ | لأنه | الحل |
|------|------|------|
| `500 Internal Server Error` عند أول عملية | Disك SQLite غير جاهز | تأكد Mount Path `/app/data` صحيح |
| `Admin redirect to /login` في أدمن | لم تُنشئ الأدمن | نفّذ `node scripts/create-admin.cjs ...` في Shell |
| `email stays queued` | SMTP غير معرف | أضف SMTP_% المتغيرات في Render |
| `payment screenshot not saving` | Mount Path غير `/app/data` | راجع Disk في Render |
| `500 error on /payment/xyz` | طلب غير موجود أو ليس لك | أعد المحاول من لوحة العميل |
