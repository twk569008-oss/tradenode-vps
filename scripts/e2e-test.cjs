const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:3000';

async function jf(url, opts = {}, cookie = null) {
  const headers = { ...(opts.headers || {}) };
  if (cookie) headers['Cookie'] = cookie;
  if (opts.body && typeof opts.body === 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const r = await fetch(BASE + url, { ...opts, headers });
  const txt = await r.text();
  let data = null; try { data = JSON.parse(txt); } catch { data = txt.slice(0, 200); }
  return { status: r.status, data, cookie: r.headers.get('set-cookie')?.split(';')[0] ?? null };
}

// 1×1 blue PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const results = [];

  function login(email, password) { return jf('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); }

  const cust = await login('demo.test@tradenode.local', 'DemoPass123!');
  results.push(['customer login', cust.status]);
  const custCookie = cust.cookie;

  const admin = await login('alnader2026r@gmail.com', 'Tnode#Admin2026');
  results.push(['admin login', admin.status]);
  const adminCookie = admin.cookie;

  // Create order (annual, Starter at $19.92)
  const ord = await jf('/api/orders', { method: 'POST', headers: { Cookie: custCookie }, body: JSON.stringify({ planId: 'pl_starter', period: 'annual' }) }, custCookie);
  results.push(['order created', ord.status, ord.data.orderNumber, 'total:', ord.data.total]);
  const orderNumber = ord.data.orderNumber;

  // Get order id
  const od = await jf(`/api/customer/orders?number=${encodeURIComponent(orderNumber)}`, {}, custCookie);
  const orderId = od.data.order.id;

  // Upload proof
  const fd = new FormData();
  fd.append('network', 'TRC20-USDT');
  fd.append('txHash', 'e2etesthash1234567890abcdef12345678');
  fd.append('screenshot', new Blob([PNG], { type: 'image/png' }), 'proof.png');
  const up = await fetch(`${BASE}/api/orders/${encodeURIComponent(orderNumber)}/proof`, { method: 'POST', headers: { Cookie: custCookie }, body: fd });
  results.push(['proof upload', up.status, await up.text()]);

  // Admin list submissions
  const queue = await jf('/api/admin/submissions?status=pending', {}, adminCookie);
  const mine = queue.data.submissions.find((s) => s.order_number === orderNumber);
  results.push(['queue contains new submission', !!mine, mine?.id]);
  if (!mine) { for (const r of results) console.log(r.join(' | ')); process.exit(1); }

  // Customer sees under_review (via his orders)
  const o2 = await jf(`/api/customer/orders?number=${encodeURIComponent(orderNumber)}`, {}, custCookie);
  results.push(['customer sees status', o2.data.order.status]);

  // Admin approves payment
  const apr = await jf(`/api/admin/orders/${orderId}`, { method: 'POST', body: JSON.stringify({ action: 'approve_payment', submissionId: mine.id, reason: 'hash verified on tronscan' }) }, adminCookie);
  results.push(['payment approved', apr.status]);

  // Admin delivery details
  const del = await jf(`/api/admin/orders/${orderId}/delivery`, {
    method: 'POST', body: JSON.stringify({
      hostname: 'vps-e2e-1', ip: '203.0.113.10', rdpPort: 3389, username: 'Administrator',
      password: 'E2ePass!2026#x', os: 'Windows Server', specs: '1 vCPU / 3 GB / 30 GB SSD',
      setupInstructions: 'Connect via RDP on port 3389.', sendToCustomer: true,
    }),
  }, adminCookie);
  results.push(['VPS delivered', del.status, JSON.stringify(del.data)]);

  // Admin re-fetch: password must come back (audited)
  const dv = await jf(`/api/admin/orders/${orderId}/delivery`, {}, adminCookie);
  results.push(['admin delivery read (audited)', dv.status, 'password present:', !!dv.data.instance?.password]);

  // Customer sees VPS
  const custVps = await jf(`/api/customer/orders?number=${encodeURIComponent(orderNumber)}`, {}, custCookie);
  results.push(['customer sees VPS', custVps.data.vps?.hostname, 'ip:', custVps.data.vps?.ip, 'port:', custVps.data.vps?.rdp_port, 'status:', custVps.data.order.status]);
  results.push(['customer sees password? (must be undefined)', custVps.data.vps?.password === undefined ? 'GOOD' : 'BAD']);

  // Customer subscriptions visible
  const ov = await jf('/api/customer/overview', {}, custCookie);
  results.push(['customer activeSubs', ov.data.activeSubs?.length, 'vpsCount:', ov.data.vpsCount]);

  // Customer cannot access proof URL from another user
  const other = await jf('/api/admin/submissions', {}, custCookie);
  results.push(['customer blocked from admin API', other.status === 403]);

  // Isolation: another customer can't read the order
  const cust2 = await jf('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'rnd' + Date.now().toString(36), email: `rnd${Date.now()}@tradenode.local`, password: 'RandomPw!2026x' }) });
  const c2 = cust2.cookie;
  const other_view = await jf(`/api/customer/orders?number=${encodeURIComponent(orderNumber)}`, {}, c2);
  results.push(['cross-customer access blocked', other_view.status === 404]);

  // Second flow: reject path
  const ord2 = await jf('/api/orders', { method: 'POST', body: JSON.stringify({ planId: 'pl_scalper', period: 'monthly' }) }, custCookie);
  const num2 = ord2.data.orderNumber;
  const od2 = await jf(`/api/customer/orders?number=${encodeURIComponent(num2)}`, {}, custCookie);
  const fd2 = new FormData();
  fd2.append('network', 'BTC');
  fd2.append('txHash', 'rejectcasehash1234567890abcdef12345');
  fd2.append('screenshot', new Blob([PNG], { type: 'image/png' }), 'bad.png');
  await fetch(`${BASE}/api/orders/${encodeURIComponent(num2)}/proof`, { method: 'POST', headers: { Cookie: custCookie }, body: fd2 });
  const q2 = await jf('/api/admin/submissions?status=pending', {}, adminCookie);
  const s2 = q2.data.submissions.find((s) => s.order_number === num2);
  const rej = await jf(`/api/admin/orders/${od2.data.order.id}`, { method: 'POST', body: JSON.stringify({ action: 'reject_payment', submissionId: s2.id, reason: 'Amount on screenshot does not match the required amount.' }) }, adminCookie);
  const rejCheck = await jf(`/api/customer/orders?number=${encodeURIComponent(num2)}`, {}, custCookie);
  results.push(['payment rejected', rej.status, 'reason:', rejCheck.data.order.rejection_reason, 'status:', rejCheck.data.order.status]);

  console.log('═'.repeat(70));
  for (const r of results) console.log('  ', ...r);
  console.log('═'.repeat(70));
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
