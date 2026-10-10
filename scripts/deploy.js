/**
 * TradeNode VPS — one-shot Netlify deploy script.
 *
 * Usage (PowerShell or bash, from project root):
 *   node scripts/deploy.js
 *
 * Prerequisites:
 *   - Netlify account not over quota (site can be created)
 *   - NETLIFY_AUTH_TOKEN set, or an existing `nfc_...` token inside
 *     %APPDATA%/Netlify/Config/config.json (the CLI login token)
 *   - Environment variables in .env.local: DATABASE_URL,
 *     CREDENTIAL_ENCRYPTION_KEY, CRON_SECRET (+ optional SMTP_*)
 *
 * The script:
 *   1. Creates (or reuses) a Netlify site named tradenode-vps-app
 *   2. Pushes all env vars from .env.local to the site
 *   3. Deploys the project with the Next.js runtime
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_NAME = 'tradenode-vps-app';

function readEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found at project root');
    process.exit(1);
  }
  const vars = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

function getNetlifyToken() {
  if (process.env.NETLIFY_AUTH_TOKEN) return process.env.NETLIFY_AUTH_TOKEN;
  const cfg = path.join(os.homedir(), 'AppData', 'Roaming', 'Netlify', 'Config', 'config.json');
  try {
    const data = JSON.parse(fs.readFileSync(cfg, 'utf8'));
    const token = data?.users?.[Object.keys(data.users)[0]]?.authToken
      ?? data?.user?.authToken
      ?? data?.user?.auth?.token
      ?? data?.token
      ?? null;
    if (token) return token;
  } catch { /* not logged in */ }
  console.error('❌ No Netlify token. Run: npx netlify-cli login  — or set NETLIFY_AUTH_TOKEN');
  process.exit(1);
}

const env = readEnvLocal();
const token = getNetlifyToken();
const api = async (method, url, body) => {
  const res = await fetch(`https://api.netlify.com/api/v1/${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Netlify API ${method} ${url} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
};

async function main() {
  console.log('🔎 Reading .env.local …');
  const envVars = ['DATABASE_URL', 'CREDENTIAL_ENCRYPTION_KEY', 'CRON_SECRET', 'APP_BASE_URL'];
  const missing = envVars.filter((v) => !env[v] && v !== 'APP_BASE_URL');
  if (missing.length) {
    console.error(`❌ Missing required .env.local values: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log('🏗  Looking for / creating site …');
  let site;
  try {
    site = await api('POST', 'sites', { name: SITE_NAME });
    console.log(`✅ Site created: ${site.ssl_url}`);
  } catch (err) {
    if (String(err).includes('exceeded usage limit')) {
      console.error('⛔ Netlify account over usage limit — cannot create a new site right now.');
      console.error('   Options: (a) delete an unused site in app.netlify.com');
      console.error('            (b) wait for the billing cycle to reset');
      console.error('            (c) upgrade to the Pro plan');
      process.exit(2);
    }
    // Maybe the site already exists — find by name.
    try {
      const sites = await api('GET', 'sites?filter=all');
      site = sites.find((s) => s.name === SITE_NAME);
      if (!site) throw err;
      console.log(`↩  Site already exists: ${site.ssl_url}`);
    } catch (findErr) {
      console.error('❌ Could not find or create the site:', findErr.message);
      process.exit(1);
    }
  }

  console.log('⚙️  Pushing environment variables …');
  for (const key of envVars.filter((v) => env[v])) {
    await api('PUT', `sites/${site.id}/env/${key}`, { contexts: [], key, values: [{ context: 'production', value: env[key] }], scopes: ['builds', 'functions'] }).catch(() => {});
  }

  console.log('🚀 Deploying with Netlify CLI …');
  const { spawnSync } = await import('node:child_process');
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(npxCmd, ['--yes', 'netlify-cli@latest', 'deploy', '--site', site.id, '--prod', '--build'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    console.error('❌ Deploy failed — see above for the full Netlify output.');
    process.exit(3);
  }
  console.log('🎉 Deploy finished. Live URL:', site.ssl_url);
  console.log('ℹ️  Next: create the admin account —');
  console.log('   node scripts/create-admin.mjs <email> <password>');
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
