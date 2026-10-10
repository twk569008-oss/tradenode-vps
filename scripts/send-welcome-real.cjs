// Send the exact premium welcome email to a real inbox via Gmail API.
// Env: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_TO, GMAIL_HTML_PATH
const fs = require('fs');

const CID = process.env.GMAIL_CLIENT_ID;
const CSEC = process.env.GMAIL_CLIENT_SECRET;
const RT = process.env.GMAIL_REFRESH_TOKEN;
const TO = process.env.GMAIL_TO || 'alnader2026r@gmail.com';

let html = fs.readFileSync(process.argv[2] || '/tmp/welcome-body.txt', 'utf8');
// Un-escape CSV double-quote doubling + strip CSV "body" header row + HTML:: marker
html = html.replace(/^body\r?\n/, '').replace(/""/g, '"').replace(/^HTML::/, '').trim();
// Strip leading " to be safe (CSV quote)
html = html.replace(/^"/, '');

(async () => {
  const tokRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CID, client_secret: CSEC, refresh_token: RT, grant_type: 'refresh_token' }),
  });
  const tok = await tokRes.json();
  if (!tok.access_token) { console.error('TOKEN ERROR:', JSON.stringify(tok)); process.exit(1); }

  const from = 'TradeNode VPS <alnader2026r@gmail.com>';
  const raw =
    `From: ${from}\r\n` +
    `To: ${TO}\r\n` +
    `Subject: =?UTF-8?B?${Buffer.from('🎉 أهلاً بك في TradeNode VPS — تم إنشاء حسابك بنجاح').toString('base64')}?=\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
    html;
  const b64 = Buffer.from(raw, 'utf8').toString('base64url');
  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: b64 }),
  });
  const j = await sendRes.json();
  console.log(sendRes.ok ? 'SENT OK — Gmail id: ' + j.id : 'ERROR: ' + JSON.stringify(j).slice(0, 300));
})();
