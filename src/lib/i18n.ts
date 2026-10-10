export type Locale = 'en' | 'ar';

type Dict = Record<string, string>;

const en: Dict = {
  'home.heroTitle': 'Your Trading Runs. Your VPS Never Sleeps.',
  'home.heroSub': 'Affordable virtual servers built for MetaTrader, Expert Advisors, and automated trading workflows.',
  'home.ctaPrimary': 'Explore VPS Plans',
  'home.ctaSecondary': 'How It Works',

  'plans.title': 'VPS Plans',
  'plans.selectPlan': 'Select plan',

  'features.title': 'Features & Infrastructure',
  'faq.title': 'Frequently Asked Questions',
  'contact.title': 'Contact & Support',

  'auth.login': 'Login',
  'auth.logout': 'Logout',
  'auth.register': 'Create account',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.name': 'Full name',

  'dash.welcome': 'Welcome back',
  'dash.overview': 'Overview',
  'dash.orders': 'My Orders',
  'dash.vps': 'My VPS Servers',
  'dash.payments': 'Payment History',
  'dash.uploadProof': 'Upload Payment Proof',
  'dash.status': 'Order Status',
  'dash.tickets': 'Support Tickets',
  'dash.settings': 'Account Settings',
  'dash.notifications': 'Notifications',
};

const ar: Dict = {
  'home.heroTitle': 'تداولك يعمل. الـ VPS لا ينام أبداً.',
  'home.heroSub': 'خوادم افتراضية بأسعار مناسبة مصممة ل Metatrader و خيارات التداول الآلي والإكسبرتات.',
  'home.ctaPrimary': 'استكشف خطط VPS',
  'home.ctaSecondary': 'كيف يعمل؟',

  'plans.title': 'خطط VPS',
  'plans.selectPlan': 'اختر الخطة',

  'features.title': 'الميزات والبنية التحتية',
  'faq.title': 'الأسئلة الشائعة',
  'contact.title': 'الدعم والتواصل',

  'auth.login': 'تسجيل الدخول',
  'auth.logout': 'تسجيل الخروج',
  'auth.register': 'إنشاء حساب',
  'auth.email': 'البريد الإلكتروني',
  'auth.password': 'كلمة المرور',
  'auth.name': 'الاسم الكامل',

  'dash.welcome': 'Welcome back',
  'dash.overview': 'نظرة عامة',
  'dash.orders': 'طلباتي',
  'dash.vps': 'خوادمي',
  'dash.payments': 'سجل المدفوعات',
  'dash.uploadProof': 'رفع إثبات الدفع',
  'dash.status': 'حالة الطلب',
  'dash.tickets': 'تذاكر الدعم',
  'dash.settings': 'إعدادات الحساب',
  'dash.notifications': 'الإشعارات',
};

const DICTS: Record<Locale, Dict> = { en, ar };

export function tr(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[locale]?.[key] ?? DICTS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

export function isRtl(locale: Locale): boolean {
  return locale === 'ar';
}

export function pickLocale(v: string | null | undefined): Locale {
  return v === 'ar' ? 'ar' : 'en';
}
