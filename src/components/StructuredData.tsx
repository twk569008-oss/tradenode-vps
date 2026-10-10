export function OrganizationJsonLd({ name, url, logo }: { name: string; url: string; logo: string }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    description: 'Trading-focused VPS hosting for MetaTrader, Expert Advisors, and automated trading workflows.',
    areaServed: 'Worldwide',
    knowsAbout: ['MetaTrader VPS', 'Forex VPS', 'Expert Advisors hosting', 'Automated trading servers'],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function WebSiteJsonLd({ url, name }: { url: string; name: string }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}/plans?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function ServiceJsonLd({ name, url, desc, priceFrom }: { name: string; url: string; desc: string; priceFrom: number }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    provider: { '@type': 'Organization', name: 'TradeNode VPS' },
    url,
    description: desc,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: priceFrom,
      priceSpecification: { '@type': 'UnitPriceSpecification', priceCurrency: 'USD', price: priceFrom, unitText: 'MONTH' },
      availability: 'https://schema.org/InStock',
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function FaqJsonLd({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
