/**
 * Branded HTML email templates. Inline CSS only (email clients strip <style>).
 * Bilingual: pass lang 'en' | 'ar'; Arabic gets dir="rtl" and Arabic copy.
 */

const BRAND_BG = '#0c1322';
/** Visual banner shown atop every branded email. Points at the live site's
 * public hero illustration; harmless if blocked (email renders text-only). */
const BANNER_URL = process.env.APP_BASE_URL
  ? `${process.env.APP_BASE_URL.replace(/\/$/, '')}/hero-trading.svg`
  : 'https://tradenode-vps-production.up.railway.app/hero-trading.svg';
const CARD_BG = '#111b30';
const STROKE = '#24395a';
const ACCENT = '#4c8dff';
const ACCENT_2 = '#74b3ff';
const TEXT = '#f4f8fd';
const MUTED = '#8ea1bd';
const GREEN = '#34d399';
const RED = '#f87171';
const AMBER = '#fbbf24';

function wrap(opts: { title: string; bodyHtml: string; lang: 'en' | 'ar'; footerNote?: string }): string {
  const rtl = opts.lang === 'ar';
  const dir = rtl ? 'rtl' : 'ltr';
  const align = rtl ? 'right' : 'left';
  return `<!DOCTYPE html>
<html lang="${opts.lang}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:${TEXT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_BG};padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <!-- Logo row -->
  <tr><td style="padding:0 0 20px 0;text-align:center;">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
      <td style="background:${CARD_BG};border:1px solid ${STROKE};border-radius:14px;padding:14px 28px;">
        <span style="font-size:22px;font-weight:800;color:${TEXT};letter-spacing:-0.5px;">TradeNode&nbsp;<span style="color:${ACCENT};">VPS</span></span>
      </td>
    </tr></table>
  </td></tr>
  <!-- Card -->
  <tr><td style="background:${CARD_BG};border:1px solid ${STROKE};border-radius:16px;overflow:hidden;">
    <div style="height:6px;background:linear-gradient(90deg,${ACCENT},#26a869,${ACCENT});font-size:0;line-height:0;">&nbsp;</div>
    <div style="padding:0 32px 0 32px;">
      <img src="${BANNER_URL}" alt="" width="536" height="180" style="display:block;width:100%;max-width:536px;height:auto;border:none;outline:none;text-decoration:none;margin:0;padding:26px 0 0 0;"/>
    </div>
    <div style="padding:22px 32px 36px 32px;">
    <div style="text-align:${align};">
      ${opts.bodyHtml}
    </div>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:24px 8px 0 8px;text-align:center;">
    <p style="font-size:11px;color:${MUTED};margin:0 0 6px 0;line-height:1.6;">${opts.footerNote ?? (rtl
      ? 'هذه رسالة آلية من TradeNode VPS — خدمة استضافة مخصصة للمتداولين.'
      : 'This is an automated message from TradeNode VPS — hosting built for traders.')}</p>
    <p style="font-size:11px;color:${MUTED};margin:0;">© ${new Date().getFullYear()} TradeNode VPS</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function h1(text: string, _lang?: 'en' | 'ar'): string {
  void _lang;
  return `<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:800;color:${TEXT};line-height:1.3;">${text}</h1>`;
}
function p(text: string, lang?: 'en' | 'ar'): string {
  const align = lang === 'ar' ? 'right' : 'left';
  return `<p style="margin:0 0 14px 0;font-size:14px;color:${MUTED};line-height:1.7;text-align:${align};">${text}</p>`;
}
function btn(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr><td style="background:${ACCENT};border-radius:10px;">
    <a href="${href}" style="display:inline-block;padding:13px 30px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">${label}</a>
  </td></tr></table>`;
}
function infoBox(rows: Array<[string, string]>, lang: 'en' | 'ar'): string {
  const trs = rows.map(([k, v]) => `
    <tr>
      <td style="padding:10px 14px;color:${MUTED};font-size:13px;white-space:nowrap;">${k}</td>
      <td style="padding:10px 14px;color:${TEXT};font-size:13px;font-weight:600;text-align:${lang === 'ar' ? 'left' : 'right'};font-family:monospace;">${v}</td>
    </tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(76,141,255,0.06);border:1px solid ${STROKE};border-radius:12px;margin:18px 0;">
    ${trs}
  </table>`;
}
function callout(text: string, color: string, lang: 'en' | 'ar'): string {
  const align = lang === 'ar' ? 'right' : 'left';
  return `<div style="background:rgba(255,255,255,0.04);border-inline-start:3px solid ${color};border-radius:8px;padding:14px 18px;margin:18px 0;">
    <p style="margin:0;font-size:13px;color:${TEXT};line-height:1.7;text-align:${align};">${text}</p>
  </div>`;
}

// ── Welcome (account created) — premium forex-branded hero ─
export function welcomeEmail(name: string, _email: string, lang: 'en' | 'ar'): string {
  const en = lang === 'en';
  const base = process.env.APP_BASE_URL ?? 'https://tradenode-vps-production.up.railway.app';
  const body = `
    <!-- Big forex hero banner -->
    <div style="text-align:center;margin:0 0 8px 0;">
      <img src="${base}/hero-trading.svg" alt="${en ? 'Live forex & gold trading on a dedicated VPS' : 'تداول الفوريكس والذهب على خادم مخصص'}" width="600" height="300" style="display:block;width:100%;max-width:536px;height:auto;border:none;outline:none;text-decoration:none;margin:0 auto;border-radius:14px;border:1px solid ${STROKE};"/>
    </div>
    <div style="text-align:center;margin:12px 0 20px 0;">
      <div style="display:inline-block;background:linear-gradient(90deg,${ACCENT},#26a869);border-radius:50px;padding:10px 26px;font-size:13px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">
        ${en ? '⚡ YOUR TRADING DESK IS READY' : '⚡ مكتب تداولك جاهز'}
      </div>
    </div>
    ${h1(en ? `Welcome to the trading floor, ${name}! 🏆` : `أهلاً بك في قاعة التداول، ${name}! 🏆`, lang)}
    ${p(en
      ? `Your TradeNode VPS account is <strong>live</strong>. From this moment, your MetaTrader terminals, Expert Advisors and gold scalping bots have a dedicated home — one that never closes its laptop lid, never loses internet, and never sleeps.`
      : `حسابك في TradeNode VPS <strong>مفعل الآن</strong>. من هذه اللحظة، أطراف MetaTrader وخبراتك الآلية وروبوتات السكالبينج على الذهب أصبح لها بيت خاص — لا يُغلق أنبوبه، ولا يفقد الإنترنت، ولا ينام أبداً.`, lang)}
    <!-- Stats-style highlight row -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="padding:6px;">
          <div style="background:rgba(76,141,255,0.10);border:1px solid ${STROKE};border-radius:12px;padding:16px 10px;text-align:center;">
            <div style="font-size:22px;font-weight:900;color:${ACCENT_2};">MT4 · MT5</div>
            <div style="font-size:11px;color:${MUTED};margin-top:4px;">${en ? 'Full compatibility' : 'توافق كامل'}</div>
          </div>
        </td>
        <td style="padding:6px;">
          <div style="background:rgba(52,211,153,0.10);border:1px solid ${STROKE};border-radius:12px;padding:16px 10px;text-align:center;">
            <div style="font-size:22px;font-weight:900;color:${GREEN};">24/7</div>
            <div style="font-size:11px;color:${MUTED};margin-top:4px;">${en ? 'Always-on operation' : 'عمل بدون توقف'}</div>
          </div>
        </td>
        <td style="padding:6px;">
          <div style="background:rgba(251,191,36,0.10);border:1px solid ${STROKE};border-radius:12px;padding:16px 10px;text-align:center;">
            <div style="font-size:22px;font-weight:900;color:${AMBER};">$2</div>
            <div style="font-size:11px;color:${MUTED};margin-top:4px;">${en ? 'Entry plan / month' : 'خطة البداية شهرياً'}</div>
          </div>
        </td>
      </tr>
    </table>
    ${btn(`${base}/plans`, en ? '🚀  Start Trading on Your VPS →' : '🚀 ابدأ التداول على خادمك →')}
    ${p(en
      ? 'Pick the plan that fits your terminal count, complete checkout in under two minutes, and your VPS shows up in your dashboard — hand-verified by a real person, not a bot.'
      : 'اختر الخطة المناسبة لعدد أطرافك، أكمل الطلب في أقل من دقيقتين، وسيظهر خادمك في لوحتك — يتحقق منه شخص حقيقي لا روبوت.', lang)}
    ${callout(en
      ? '🛡  Every order goes through human verification before your VPS is delivered — that is how we keep your funds and trading safe.'
      : '🛡  كل طلب يمرّ بمراجعة بشرية قبل تسليم خادمك — هكذا نحافظ على أموالك وتداولك بأمان.', GREEN, lang)}
    ${p(en
      ? 'Need help choosing a plan or setting up your first terminal? Open a support ticket from your dashboard — a real person answers, usually within one business day.'
      : 'تحتاج مساعدة في اختيار خطة أو إعداد أول طرف تداول؟ افتح تذكرة من لوحتك — يجيبك شخص حقيقي عادةً خلال يوم عمل.', lang)}
  `;
  return wrap({
    title: en ? 'Welcome to the trading floor — TradeNode VPS' : 'أهلاً بك في قاعة التداول — TradeNode VPS',
    bodyHtml: body,
    lang,
    footerNote: en
      ? 'You received this email because an account was created with this address. If this was not you, ignore it — nobody can access your account without your password.'
      : 'تستلم هذه الرسالة لأنه تم إنشاء حساب بهذا العنوان. لم يكن أنت؟ تجاهلها — لا أحد يستطيع الوصول لحسابك دون كلمة مرورك.',
  });
}

// ── Payment approved ──────────────────────────────────────
export function paymentApprovedEmail(orderNumber: string, amount: string, lang: 'en' | 'ar'): string {
  const en = lang === 'en';
  const body = `
    <div style="text-align:center;margin-bottom:22px;">
      <div style="display:inline-block;width:52px;height:52px;background:${GREEN};border-radius:50%;line-height:52px;font-size:26px;">✅</div>
    </div>
    ${h1(en ? 'Payment verified — your VPS is being prepared' : 'تم التحقق من الدفع — جارٍ تجهيز خادمك', lang)}
    ${p(en
      ? `Great news. A human reviewed the transaction for order <strong>${orderNumber}</strong> and it has been approved. Your VPS is now in our provisioning queue.`
      : `خبر رائع. تمت مراجعة العملية للطلب <strong>${orderNumber}</strong> بواسطة شخص حقيقي وقد تمت الموافقة. خادمك الآن في قائمة التجهيز.`, lang)}
    ${infoBox([
      [en ? 'Order number' : 'رقم الطلب', orderNumber],
      [en ? 'Amount verified' : 'المبلغ المتحقق', amount],
      [en ? 'Status' : 'الحالة', en ? 'Confirmed — awaiting VPS setup' : 'مؤكدة — بانتظار تجهيز الخادم'],
    ], lang)}
    ${p(en
      ? 'We will notify you the moment your connection details are available in the dashboard. No action is needed from you right now.'
      : 'سنصلك إشعاراً فور توفر تفاصيل الاتصال في لوحتك. لا تحتاج لأي إجراء الآن.', lang)}
    ${btn(`${process.env.APP_BASE_URL ?? 'http://localhost:3000'}/dashboard`, en ? 'Open my dashboard →' : 'افتح لوحتي →')}
  `;
  return wrap({ title: en ? 'Payment approved' : 'تمت الموافقة على الدفعة', bodyHtml: body, lang });
}

// ── VPS ready ─────────────────────────────────────────────
export function vpsReadyEmail(orderNumber: string, host: string, lang: 'en' | 'ar'): string {
  const en = lang === 'en';
  const body = `
    <div style="text-align:center;margin-bottom:22px;">
      <div style="display:inline-block;width:52px;height:52px;background:${ACCENT};border-radius:50%;line-height:52px;font-size:26px;">🚀</div>
    </div>
    ${h1(en ? 'Your VPS is ready — connect now' : 'خادمك جاهز — اتصل الآن', lang)}
    ${p(en
      ? 'Your dedicated trading server has been provisioned and is live. Full connection details (IP, port, username) are waiting inside your dashboard under <strong>My VPS Servers</strong>.'
      : 'خادم التداول المخصص لك جاهز ويعمل. تفاصيل الاتصال الكاملة (IP، المنفذ، اسم المستخدم) بانتظارك داخل لوحتك في قسم <strong>خوادمي</strong>.', lang)}
    ${infoBox([
      [en ? 'Order' : 'الطلب', orderNumber],
      [en ? 'Server host' : 'مضيف الخادم', host],
      [en ? 'Status' : 'الحالة', en ? 'Live' : 'يعمل'],
    ], lang)}
    ${callout(en
      ? '🔐 For security, your password is delivered separately, not inside this email. Change it after your first login.'
      : '🔐 للأمان، كلمة المرور تُسلَّم بشكل منفصل، وليس داخل هذه الرسالة. غيّرها بعد أول تسجيل دخول.', AMBER, lang)}
    ${btn(`${process.env.APP_BASE_URL ?? 'http://localhost:3000'}/dashboard/vps`, en ? 'View my VPS servers →' : 'عرض خوادمي →')}
  `;
  return wrap({ title: en ? 'Your VPS is ready' : 'خادمك جاهز', bodyHtml: body, lang });
}

// ── Payment rejected ──────────────────────────────────────
export function paymentRejectedEmail(orderNumber: string, reason: string, lang: 'en' | 'ar'): string {
  const en = lang === 'en';
  const body = `
    <div style="text-align:center;margin-bottom:22px;">
      <div style="display:inline-block;width:52px;height:52px;background:${RED};border-radius:50%;line-height:52px;font-size:26px;">⚠️</div>
    </div>
    ${h1(en ? 'Payment could not be verified' : 'تعذر التحقق من الدفعة', lang)}
    ${p(en
      ? `We reviewed the transaction for order <strong>${orderNumber}</strong> and could not confirm it. No charge has landed on our side yet.`
      : `راجعنا العملية للطلب <strong>${orderNumber}</strong> ولم نتمكن من تأكيدها. لم تصل أي دفعة إلينا حتى الآن.`, lang)}
    ${callout(reason, RED, lang)}
    ${p(en
      ? 'Common fixes: make sure the screenshot clearly shows the amount, network, and receiving address; confirm the transaction hash is complete; and double-check you sent on the correct network.'
      : 'حلول شائعة: تأكد أن لقطة الشاشة تظهر المبلغ والشبكة والعنوان بوضوح؛ تأكد أن رمز العملية كامل؛ وتأكد أنك أرسلت عبر الشبكة الصحيحة.', lang)}
    ${btn(`${process.env.APP_BASE_URL ?? 'http://localhost:3000'}/dashboard/orders`, en ? 'Re-upload payment proof →' : 'أعد رفع إثبات الدفعة →')}
    ${p(en
      ? 'Believe this is an error? Open a support ticket and a human will review your case individually.'
      : 'تعتقد أن هذا خطأ؟ افتح تذكرة دعم وسيراجع شخص حالتك بشكل فردي.', lang)}
  `;
  return wrap({ title: en ? 'Payment rejected' : 'تم رفض الدفعة', bodyHtml: body, lang });
}

// ── Renewal reminder ───────────────────────────────────
export function subscriptionReminderEmail(orderNumber: string, endDate: string, daysLeft: number, lang: 'en' | 'ar'): string {
  const en = lang === 'en';
  const body = `
    <div style="text-align:center;margin-bottom:22px;">
      <div style="display:inline-block;width:52px;height:52px;background:${AMBER};border-radius:50%;line-height:52px;font-size:26px;">⏰</div>
    </div>
    ${h1(en ? `Your subscription ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : `انتهاء اشتراكك بعد ${daysLeft} يوم`, lang)}
    ${p(en ? `Renew now to keep your trading terminals online without interruption. If the subscription lapses, the VPS will be suspended and your Expert Advisors will stop.` : `قم بالتجديد الآن للحفاظ على أطراف التداول متصلة دون انقطاع. إذا انتهى الاشتراك، سيتم تعليق الخادم وتتوقف الخبرات الآلية.`, lang)}
    ${infoBox([
      [en ? 'Order' : 'الطلب', orderNumber],
      [en ? 'Expires on' : 'ينتهي في', new Date(endDate).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })],
      [en ? 'Days left' : 'الأيام المتبقية', String(daysLeft)],
    ], lang)}
    ${btn(`${process.env.APP_BASE_URL ?? 'http://localhost:3000'}/dashboard`, en ? 'Renew now →' : 'جدد الآن →')}
    ${callout(en ? 'Providers may occasionally have delays. Renewing early guarantees you stay online.' : 'قد يحدث تأخير أحياناً. التجديد المبكر يضمن استمرار اتصالك.', GREEN, lang)}
  `;
  return wrap({ title: en ? 'Subscription ending soon' : 'اشتراكك يقترب من النهاية', bodyHtml: body, lang });
}

// ── Subscription expired ─────────────────────────────────
export function subscriptionExpiredEmail(orderNumber: string, endDate: string, lang: 'en' | 'ar'): string {
  const en = lang === 'en';
  const body = `
    <div style="text-align:center;margin-bottom:22px;">
      <div style="display:inline-block;width:52px;height:52px;background:${RED};border-radius:50%;line-height:52px;font-size:26px;">🔔</div>
    </div>
    ${h1(en ? 'Your VPS subscription has expired' : 'انتهى اشتراك خادمك', lang)}
    ${p(en ? `Your order <strong>${orderNumber}</strong> reached its end date on ${new Date(endDate).toLocaleDateString()}. The VPS is now suspended — your Expert Advisors and terminals are stopped.`
         : `وصل الطلب <strong>${orderNumber}</strong> إلى تاريخ النهاية في ${new Date(endDate).toLocaleDateString()}. خادمك الآن موقوف — الخبرات الآلية والأطراف متوقفة.`, lang)}
    ${p(en ? 'Renew to reactivate the same VPS and keep your data and configuration intact, if possible. Contact support if you need an extension or have any questions.'
         : 'قم بالتجديد لإعادة تنشيط الخادم نفسه مع الحفاظ على بياناتك وإعداداتك إن أمكن. اتصل بالدعم إذا احتجت تمديداً أو واجهت أي مشكلة.', lang)}
    ${btn(`${process.env.APP_BASE_URL ?? 'http://localhost:3000'}/dashboard`, en ? 'Renew subscription →' : 'جدد الاشتراك →')}
  `;
  return wrap({ title: en ? 'Subscription expired' : 'انتهى الاشتراك', bodyHtml: body, lang });
}

// ── Password reset ────────────────────────────────────────
export function passwordResetEmail(link: string, lang: 'en' | 'ar'): string {
  const en = lang === 'en';
  const body = `
    <div style="text-align:center;margin-bottom:22px;">
      <div style="display:inline-block;width:52px;height:52px;background:${ACCENT_2};border-radius:50%;line-height:52px;font-size:26px;">🔑</div>
    </div>
    ${h1(en ? 'Password reset requested' : 'تم طلب استعادة كلمة المرور', lang)}
    ${p(en
      ? 'Someone (hopefully you) requested a password reset for your TradeNode VPS account. Use the single-use link below within 60 minutes.'
      : 'شخص ما (نأمل أنت) طلب استعادة كلمة مرور حسابك في TradeNode VPS. استخدم الرابط أعلاه خلال 60 دقيقة.', lang)}
    <div style="text-align:center;">${btn(link, en ? 'Set a new password →' : 'عيّن كلمة مرور جديدة →')}</div>
    ${callout(en
      ? 'Did not request this? Ignore this email — your current password stays active and untouched.'
      : 'لم تطلب هذا؟ تجاهل الرسالة — كلمة مرورك الحالية تبقى فعالة ولم تُلمَس.', ACCENT, lang)}
  `;
  return wrap({ title: en ? 'Password reset' : 'استعادة كلمة المرور', bodyHtml: body, lang });
}
