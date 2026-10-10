// Verify Gmail OAuth refresh token + Gmail API send flow (same logic as src/lib/mail.ts).
// Reads credentials from env: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
// Usage: node scripts/gmail-api-test.mjs [to-email]
const CID = process.env.GMAIL_CLIENT_ID;
const CSEC = process.env.GMAIL_CLIENT_SECRET;
const RT = process.env.GMAIL_REFRESH_TOKEN;
const TO = process.argv[2] || process.env.GMAIL_FROM || 'test@example.com';

if (!CID || !CSEC || !RT) {
  console.error('Missing env: set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN');
  process.exit(1);
}

const tokRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: CID,
    client_secret: CSEC,
    refresh_token: RT,
    grant_type: 'refresh_token',
  }),
});
const tok = await tokRes.json();
console.log('token status:', tokRes.status);
if (!tok.access_token) { console.log('TOKEN ERROR:', JSON.stringify(tok)); process.exit(1); }
console.log('access token OK, len:', tok.access_token.length);

const raw =
  `From: ${TO}\r\n` +
  `To: ${TO}\r\n` +
  `Subject: Gmail API test\r\n` +
  `MIME-Version: 1.0\r\n` +
  `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
  '<div dir="rtl" style="font-family:Arial,sans-serif;padding:24px"><h2>Send OK via Gmail API</h2></div>';

const b64 = Buffer.from(raw, 'utf8').toString('base64url');
const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
  method: 'POST',
  headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ raw: b64 }),
});
const sendJson = await sendRes.json();
console.log('send status:', sendRes.status);
console.log(sendRes.ok ? 'SEND OK — id: ' + sendJson.id : 'SEND ERROR: ' + JSON.stringify(sendJson).slice(0, 300));
