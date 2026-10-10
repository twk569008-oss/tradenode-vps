import type { MetadataRoute } from 'next';

const BASE = process.env.APP_BASE_URL || 'https://tradenodevps.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/dashboard', '/api/', '/payment/'] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
