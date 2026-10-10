export function computePctDiff(ourPrice: number, competitorPrice: number): number {
  if (!Number.isFinite(ourPrice) || !Number.isFinite(competitorPrice) || competitorPrice <= 0) return NaN;
  return Math.round(((ourPrice - competitorPrice) / competitorPrice) * 1000) / 10;
}

/**
 * Returns True only when the comparison is currently supported:
 * competitor source URL present, recency within 30 days, and comparable specs.
 */
export function canShowPublicComparison(c: {
  is_public: number; source_url?: string | null; last_checked: string; competitor_specs?: string | null;
}): boolean {
  if (!c.is_public) return false;
  if (!c.source_url || !c.source_url.startsWith('http')) return false;
  if (!c.competitor_specs || c.competitor_specs.trim().length < 8) return false;
  const age = Date.now() - new Date(c.last_checked).getTime();
  return age < 30 * 24 * 3600 * 1000;
}

export function formatPctDiff(pct: number): string {
  if (!Number.isFinite(pct)) return '—';
  if (pct === 0) return 'same price';
  return pct > 0 ? `${pct.toFixed(1)}% higher` : `${Math.abs(pct).toFixed(1)}% lower`;
}
