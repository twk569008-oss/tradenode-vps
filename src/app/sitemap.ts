import type { MetadataRoute } from 'next';

const BASE = process.env.APP_BASE_URL || 'https://tradenodevps.com';
const PAGES = ['', 'plans', 'features', 'how-it-works', 'faq', 'contact', 'about', 'terms', 'privacy', 'refund-policy', 'order-status', 'login', 'register', 'vps/forex-vps', 'vps/mt4-vps', 'vps/mt5-vps', 'vps/xauusd-scalping-vps', 'vps/ea-vps', 'vps/windows-vps'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({
    url: `${BASE}/${p}`.replace(/\/$/, ''),
    lastModified: new Date(),
    changeFrequency: p === '' || p === 'plans' ? 'daily' : 'weekly',
    priority: p === '' ? 1.0 : p === 'plans' ? 0.9 : p.startsWith('vps/') ? 0.8 : 0.5,
    alternates: {
      languages: {
        en: `${BASE}/${p}`.replace(/\/$/, ''),
        ar: `${BASE}/${p}`.replace(/\/$/, ''),
      },
    },
  }));
}
