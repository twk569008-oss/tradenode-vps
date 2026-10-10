-- ═══════════════════════════════════════════════════════════════
-- TradeNode VPS — SQLite schema (v1)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
  theme TEXT NOT NULL DEFAULT 'dark' CHECK(theme IN ('dark','light')),
  is_active INTEGER NOT NULL DEFAULT 1,
  suspended_at TEXT,
  suspended_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  ip TEXT,
  user_agent TEXT,
  csurf_token TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
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
  bandwidth TEXT,
  monthly_price REAL NOT NULL,
  billing_periods TEXT NOT NULL DEFAULT 'monthly,quarterly,semiannual,annual',
  billing_discount_quarterly REAL DEFAULT 0.05,
  billing_discount_semiannual REAL DEFAULT 0.08,
  billing_discount_annual REAL DEFAULT 0.15,
  os TEXT NOT NULL DEFAULT 'Windows Server (if infrastructure supports)',
  capacity_title_en TEXT,
  capacity_title_ar TEXT,
  best_for_en TEXT,
  best_for_ar TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  is_soldout INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 100,
  custom_fields TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  billing_period TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  price_crypto TEXT,
  payment_network TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK(status IN ('pending_payment','payment_submitted','under_review','payment_approved','awaiting_vps','vps_provisioning','active','payment_rejected','cancelled','expired','refunded')),
  coupon_code TEXT,
  discount_amount REAL DEFAULT 0,
  renewal_reminder_sent INTEGER NOT NULL DEFAULT 0,
  admin_notes TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

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
  is_active INTEGER NOT NULL DEFAULT 1,
  confirmations_required INTEGER NOT NULL DEFAULT 1,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS payment_submissions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  network_code TEXT NOT NULL,
  transaction_hash TEXT,
  amount_crypto REAL,
  amount_usd REAL,
  screenshot_storage_key TEXT,
  screenshot_mime TEXT,
  screenshot_size INTEGER,
  submitted_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewer_id TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  reviewer_note TEXT
);

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
  provisioning_date TEXT,
  start_date TEXT,
  expiration_date TEXT,
  setup_instructions TEXT,
  private_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','provisioning','ready','active','suspended','expired')),
  sent_to_customer INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vps_id TEXT NOT NULL REFERENCES vps_instances(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'trial' CHECK(status IN ('trial','active','past_due','suspended','expired','cancelled')),
  auto_renew INTEGER NOT NULL DEFAULT 0,
  extended_by_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id),
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK(category IN ('technical','connection','payment','renewal','other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','answered','customer_replied','pending_customer','resolved','closed')),
  unread_admin INTEGER NOT NULL DEFAULT 1,
  unread_customer INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  sender_role TEXT NOT NULL CHECK(sender_role IN ('customer','admin')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
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
  code TEXT UNIQUE NOT NULL COLLATE NOCASE,
  discount_type TEXT NOT NULL CHECK(discount_type IN ('percent','fixed')),
  discount_value REAL NOT NULL,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  order_type TEXT NOT NULL DEFAULT 'all' CHECK(order_type IN ('all','new','renewal')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  email_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pricing_comparisons (
  id TEXT PRIMARY KEY,
  our_plan_id TEXT REFERENCES plans(id),
  competitor_name TEXT NOT NULL,
  competitor_plan TEXT NOT NULL,
  competitor_specs TEXT,
  competitor_price REAL NOT NULL,
  competitor_currency TEXT NOT NULL DEFAULT 'USD',
  billing_period TEXT NOT NULL,
  source_url TEXT,
  last_checked TEXT NOT NULL,
  our_price REAL NOT NULL,
  pct_diff REAL NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_log (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','failed')),
  related_type TEXT,
  related_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_busy_guard (
  id INTEGER PRIMARY KEY CHECK(id=1),
  seed_locked INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- Seed admin (bcrypt stub — replaced by scripts/create-admin.mjs)
INSERT OR IGNORE INTO users (id, name, email, password_hash, locale, role, theme, is_active, created_at, updated_at)
VALUES ('usr_seed_admin', 'Administrator', 'admin@tradenodevps.local', 'PENDING-BY-SETUP-SCRIPT', 'en', 'admin', 'dark', 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO payment_networks (id, code, name_en, name_ar, network_chain, deposit_address, is_active, confirmations_required, sort_order)
VALUES
  ('pn_trc20', 'TRC20-USDT', 'Tether USDT', 'تيثر USDT', 'TRON (TRC20)', 'TDhXhUyfV24TBRfMyYDUfE7fV1u5LX9Q7f', 1, 1, 1),
  ('pn_erc20', 'ERC20-USDT', 'Tether USDT', 'تيثر USDT', 'Ethereum (ERC20)', '0xc1a088cfcb7a378a09f7bb7181acd4860a17a79d', 1, 2, 2),
  ('pn_sol',   'SOL', 'Solana', 'سولانا', 'Solana', 'FitR4tQJeiFMA5V1GumsWrVrShUm1sUr7Suu1p5BTRMZ', 1, 1, 3),
  ('pn_bnb',   'BNB', 'BNB', 'بينانس كوين', 'BNB Smart Chain (BEP20)', '0xc1a088cfcb7a378a09f7bb7181acd4860a17a79d', 1, 1, 4),
  ('pn_btc',   'BTC', 'Bitcoin', 'بيتكوين', 'Bitcoin', 'bc1q7xdzz07e6ar9wer5hu59z6954dd6hpr2a7cya44h6m32pmp70tdqsv3tqy', 1, 2, 5);

INSERT OR IGNORE INTO plans (id, slug, name_en, name_ar, tagline_en, tagline_ar, cpu, ram, storage, bandwidth, monthly_price, billing_periods, os, capacity_title_en, capacity_title_ar, best_for_en, best_for_ar, is_active, is_soldout, featured, sort_order, created_at, updated_at, custom_fields)
VALUES
  ('pl_starter', 'starter-trader', 'Starter Trader', 'المتداول المبتدئ', 'Lightweight automated trading.',
 'تداول آلي خفيف.', '1 vCPU', '3 GB', '30 GB SSD', 'Unmetered*', 2.0, 'monthly,quarterly,semiannual,annual', 'Windows Server (if infrastructure supports)', '1–2 MetaTrader terminals', '1–2 طرف ميتاتريدر', 'Beginners and lightweight automated trading.', 'المبتدئون والتداول الآلي الخفيف.', 1, 0, 0, 1, datetime('now'), datetime('now'), NULL),
  ('pl_plus', 'trader-plus', 'Trader Plus', 'المتداول الإضافي', 'Several charts and EAs.', 'عدة رسوم بيانية وخبرات آلية.', '2 vCPU', '4 GB', '50 GB SSD', 'Unmetered*', 5.0, 'monthly,quarterly,semiannual,annual', 'Windows Server (if infrastructure supports)', '2–4 MetaTrader terminals', '2–4 طرف ميتاتريدر', 'Traders operating several charts and EAs.', 'المتداولون الذين يديرون عدة رسوم بيانية.', 1, 0, 1, 2, datetime('now'), datetime('now'), NULL),
  ('pl_pro', 'pro-trader', 'Pro Trader', 'المتداول المحترف', 'More demanding setups.', 'إعدادات أكثر تطلباً.', '2–4 vCPU', '6 GB', '80 GB SSD', 'Unmetered*', 8.0, 'monthly,quarterly,semiannual,annual', 'Windows Server (if infrastructure supports)', '4–6 MetaTrader terminals', '4–6 طرف ميتاتريدر', 'More demanding trading setups.', 'إعدادات التداول الأكثر تطلباً.', 1, 0, 0, 3, datetime('now'), datetime('now'), NULL),
  ('pl_scalper', 'scalper-pro', 'Scalper Pro', 'السكالبر المحترف', 'Advanced multi-terminal.', 'متعدد الأطراف للسكالبنج.', '4 vCPU', '8 GB', '100 GB SSD', 'Unmetered*', 12.0, 'monthly,quarterly,semiannual,annual', 'Windows Server (if infrastructure supports)', '6–10 MetaTrader terminals', '6–10 طرف ميتاتريدر', 'Advanced multi-terminal trading setups.', 'إعدادات التداول المتقدم متعدد الأطراف.', 1, 0, 0, 4, datetime('now'), datetime('now'), NULL),
  ('pl_ea', 'ea-power', 'EA Power', 'قوة الخبرة الآلية', 'Resource-intensive bots.', 'روبوتات مكثفة الموارد.', '6 vCPU', '16 GB', '160 GB SSD', 'Unmetered*', 18.0, 'monthly,quarterly,semiannual,annual', 'Windows Server (if infrastructure supports)', '10+ MetaTrader terminals (subject to performance testing)', 'أكثر من 10 أطراف (بشرط اختبار الأداء)', 'Resource-intensive automated trading.', 'التداول الآلي مكثف الموارد.', 1, 0, 0, 5, datetime('now'), datetime('now'), NULL);

INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('site.name', 'TradeNode VPS', datetime('now')),
  ('site.tagline_en', 'Trading-focused hosting. Simple plans. Competitive prices.', datetime('now')),
  ('site.tagline_ar', 'استضافة مخصصة للتداول. خطط بسيطة. أسعار تنافسية.', datetime('now')),
  ('site.support_email', 'support@example-not-yet-configured.com', datetime('now')),
  ('site.estimated_delivery_window', 'within 24 hours after payment approval (estimated, not guaranteed)', datetime('now')),
  ('payments.manual_review_required', 'true', datetime('now')),
  ('payments.allow_admin_manual_amount', 'true', datetime('now')),
  ('billing.max_upfront_months', '12', datetime('now')),
  ('security.upload_max_bytes', '5242880', datetime('now')),
  ('security.allowed_upload_mimes', 'image/png,image/jpeg,image/webp,application/pdf', datetime('now')),
  ('security.session_ttl_hours', '720', datetime('now')),
  ('provisioning.mode', 'manual', datetime('now')),
  ('provisioning.automation_enabled', 'false', datetime('now')),
  ('provisioning.provider', 'NONE — no provider API configured', datetime('now')),
  ('maintenance.show_fake_metrics', 'false', datetime('now'));

INSERT OR IGNORE INTO maintenance_busy_guard (id, seed_locked, updated_at) VALUES (1, 0, datetime('now'));
