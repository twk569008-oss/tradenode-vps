export type CryptoQuote = { symbol: string; usd: number } | null;

const cache: Record<string, { data: CryptoQuote; at: number }> = {};
const TTL = 60_000;

function getCache(key: string): CryptoQuote {
  const hit = cache[key];
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  return null;
}
function setCache(key: string, data: CryptoQuote) {
  cache[key] = { data, at: Date.now() };
}

/**
 * - BTC, ETH, SOL, BNB via CoinGecko public endpoint (free, no key required for this use).
 * - USDT is treated as $1.00 by definition of its peg; never quote it above $1.02.
 */
export async function fetchUsdRate(networkCode: string): Promise<CryptoQuote> {
  const c = getCache(networkCode);
  if (c) return c;

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd',
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8_000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { usd?: number }>;
    const map: Record<string, string> = {
      'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'BNB': 'binancecoin',
      'BTC-NATIVE': 'bitcoin', 'ETH-NATIVE': 'ethereum',
    };
    const id = map[networkCode.toUpperCase()];
    if (!id || !data[id]?.usd) return null;
    const rate = { symbol: networkCode.toUpperCase(), usd: data[id].usd };
    setCache(networkCode, rate);
    return rate;
  } catch {
    return null;
  }
}

/**
 * Compute the crypto amount required for a given USD price on a given network.
 * USDT kinds are peg-quoted at exactly $1.00 (by their design) — this is honest
 * because USDT *is* a USD-pegged token; we show the rate alongside.
 */
export function computeRequiredCrypto(
  networkCode: string,
  usdAmount: number,
  rate: CryptoQuote
): { ok: true; amount: number; symbol: string; rateUsd: number } | { ok: false; reason: 'unknown_network' | 'rate_unavailable' } {
  const code = networkCode.toUpperCase();
  const symbol = code.includes('USDT') ? 'USDT' : code;
  if (code.includes('USDT')) {
    return { ok: true, amount: usdAmount, symbol: 'USDT', rateUsd: 1 };
  }
  if (!rate || !Number.isFinite(rate.usd) || rate.usd <= 0) return { ok: false, reason: 'rate_unavailable' };
  return { ok: true, amount: usdAmount / rate.usd, symbol, rateUsd: rate.usd };
}
