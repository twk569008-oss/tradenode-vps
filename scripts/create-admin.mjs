import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const email = process.argv[2] || 'admin@tradenode.local';
const password = process.argv[3];
if (!password) { console.error('Usage: node scripts/create-admin.mjs <email> <password>'); process.exit(1); }
if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
  console.error('Password must be 10+ chars with upper, lower, digit, symbol.');
  process.exit(1);
}

const conn = process.env.DATABASE_URL;
if (!conn) { console.error('DATABASE_URL env var must be set (Postgres connection string).'); process.exit(1); }

const pool = new pg.Pool({
  connectionString: conn,
  ssl: { rejectUnauthorized: false },
});

const id = `usr_${crypto.randomBytes(12).toString('hex')}`;
const now = new Date().toISOString();
const hash = bcrypt.hashSync(password, 12);

const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [email.toLowerCase()]);
if (existing.rows.length > 0) {
  await pool.query(`UPDATE users SET password_hash = $1, role = 'admin', is_active = true, updated_at = $2 WHERE id = $3`, [hash, now, existing.rows[0].id]);
  console.log(`Admin password reset for existing user: ${email}`);
} else {
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, locale, role, theme, is_active, created_at, updated_at)
     VALUES ($1, 'Administrator', $2, $3, 'en', 'admin', 'dark', true, $4, $5)`,
    [id, email.toLowerCase(), hash, now, now]
  );
  console.log(`Admin created: ${email}`);
}
console.log('Login at /login then you will be redirected to /admin.');
await pool.end();
