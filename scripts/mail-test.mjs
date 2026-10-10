import nodemailer from 'nodemailer';

for (const [port, secure] of [[465, true], [587, false]]) {
  try {
    console.log(`Testing port ${port} (secure=${secure})...`);
    const t = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port,
      secure,
      auth: { user: 'alnader2026r@gmail.com', pass: process.argv[2] || '' },
      connectionTimeout: 12000,
    });
    await t.verify();
    console.log(`PORT ${port}: VERIFIED OK`);
    const info = await t.sendMail({
      from: 'TradeNode VPS <alnader2026r@gmail.com>',
      to: 'alnader2026r@gmail.com',
      subject: '✅ TradeNode VPS — SMTP test من المنفذ ' + port,
      html: '<div dir="rtl" style="font-family:Arial,sans-serif;padding:24px"><h2 style="color:#1d4ed8">اختبار SMTP ناجح 🎉</h2><p>هذه رسالة حقيقية أُرسلت عبر Gmail SMTP من المنفذ <b>' + port + '</b>.</p></div>',
    });
    console.log('sent message id:', info.messageId);
    process.exit(0);
  } catch (e) {
    console.log(`PORT ${port}: FAIL —`, String(e.message).slice(0, 120));
  }
}
console.log('All ports failed');
process.exit(1);
