const BASE = process.env.E2E_BASE || 'http://localhost:55586';

async function j(method, path, opts = {}, cookie) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { method, headers, body: opts.body, redirect: 'manual' });
  const setCookie = res.headers.get('set-cookie');
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json, setCookie, res };
}

function pickSession(sc) {
  if (!sc) return null;
  const m = sc.match(/tn_session=([^;]+)/);
  return m ? `tn_session=${m[1]}` : null;
}

(async () => {
  const results = [];
  const t = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };

  // 1. Register a fresh customer
  const email = `e2e_${Date.now()}@test.local`;
  const reg = await j('POST', '/api/auth/register', { body: JSON.stringify({ name: `tester${Date.now() % 100000}`, email, password: 'Str0ng!Pass2026', locale: 'en' }) });
  const custCookie = pickSession(reg.setCookie);
  t('register', reg.status === 201, `status=${reg.status}`);

  // 2. Create an order (annual Starter = $19.92)
  const order = await j('POST', '/api/orders', { body: JSON.stringify({ planId: 'pl_starter', period: 'annual' }) }, custCookie);
  t('create order', order.status === 201, `status=${order.status} total=${order.json?.total}`);
  const orderNumber = order.json?.orderNumber;

  // 3. Submit proof (PNG screenshot + tx hash)
  const png = Buffer.from('89504e470d0a1a0a0000000d494844520000000100000001080600000' + '0'.repeat(40) + '0'.repeat(40), 'hex');
  const pngBuf = Buffer.concat([png, Buffer.alloc(60, 7)]);
  const form = new FormData();
  form.append('network', 'TRC20-USDT');
  form.append('txHash', 'a'.repeat(64));
  form.append('screenshot', new Blob([pngBuf], { type: 'image/png' }), 'proof.png');
  const proof = await fetch(`${BASE}/api/orders/${orderNumber}/proof`, { method: 'POST', headers: { Cookie: custCookie }, body: form });
  t('submit proof', proof.status === 201, `status=${proof.status}`);

  // 4. Admin login
  const alog = await j('POST', '/api/auth/login', { body: JSON.stringify({ email: 'alnader2026r@gmail.com', password: 'Tnode#Admin2026' }) });
  const adminCookie = pickSession(alog.setCookie);
  t('admin login', alog.status === 200 && alog.json?.role === 'admin');

  // 5. Admin sees the submission in queue
  const queue = await j('GET', '/api/admin/submissions?status=pending', {}, adminCookie);
  t('admin queue', queue.status === 200 && queue.json?.submissions?.length >= 1, `count=${queue.json?.submissions?.length}`);

  // 6. Admin views the proof image
  const submissionId = queue.json?.submissions?.[0]?.id;
  const proofView = await j('GET', `/api/admin/proof?submissionId=${submissionId}`, {}, adminCookie);
  t('admin view proof', proofView.status === 200 && proofView.res.headers.get('content-type')?.includes('image'), `status=${proofView.status} ct=${proofView.res.headers.get('content-type')}`);

  // 7. Admin approves
  const orderId = queue.json?.submissions?.[0]?.order_id;
  const approve = await j('POST', `/api/admin/orders/${orderId}`, { body: JSON.stringify({ action: 'approve_payment' }) }, adminCookie);
  t('admin approve', approve.status === 200, `status=${approve.status}`);

  // 8. Admin delivers VPS details
  const deliver = await j('POST', `/api/admin/orders/${orderId}/delivery`, {
    body: JSON.stringify({
      hostname: 'node01.tradenode.local', ip: '10.0.0.55', rdpPort: 3389, username: 'trader',
      password: 'Temp!Pass2026x', os: 'Windows Server 2022', specs: '3GB RAM / 1 vCPU',
      sendToCustomer: true,
    }),
  }, adminCookie);
  t('admin deliver', deliver.status === 200, `status=${deliver.status}`);

  // 9. Customer sees the VPS
  const myOrders = await j('GET', `/api/customer/orders?number=${orderNumber}`, {}, custCookie);
  const vps = myOrders.json?.vps;
  t('customer sees VPS', myOrders.status === 200 && vps && vps.ip === '10.0.0.55' && vps.sent_to_customer === true, `ip=${vps?.ip}`);

  // 10. Cross-customer isolation: register second user, try reading first order
  const reg2 = await j('POST', '/api/auth/register', { body: JSON.stringify({ name: `snoop${Date.now() % 100000}`, email: `snoop_${Date.now()}@test.local`, password: 'Str0ng!Pass2026', locale: 'en' }) });
  const snoopCookie = pickSession(reg2.setCookie);
  const snoop = await j('GET', `/api/customer/orders?number=${orderNumber}`, {}, snoopCookie);
  t('customer isolation', snoop.status === 404, `status=${snoop.status}`);

  // 11. Public order-status page works
  const pub = await j('GET', `/api/order-status?order=${orderNumber}&email=${encodeURIComponent(email)}`);
  t('public order status', pub.status === 200 && pub.json?.order?.status === 'active', `status=${pub.json?.order?.status}`);

  console.log(results.join('\n'));
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('E2E CRASH:', e.message); process.exit(1); });
