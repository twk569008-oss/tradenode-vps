type Bucket = { hits: number[]; };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

let lastSweep = Date.now();

function sweep() {
  if (Date.now() - lastSweep < 60_000) return;
  lastSweep = Date.now();
  const now = Date.now();
  for (const [k, b] of buckets) {
    b.hits = b.hits.filter((t) => now - t < 3_600_000);
    if (b.hits.length === 0) buckets.delete(k);
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
  sweep();
  if (buckets.size > MAX_KEYS) return { allowed: true, retryAfterMs: 0 }; // fail-open, prevents DoS on Map
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  bucket.hits.push(now);
  buckets.set(key, bucket);
  const allowed = bucket.hits.length <= limit;
  const oldest = bucket.hits[0] ?? now;
  return { allowed, retryAfterMs: allowed ? 0 : Math.max(200, windowMs - (now - oldest)) };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
