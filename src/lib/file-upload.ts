import path from 'path';

export const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * Sniff the real content type from magic bytes, not client-supplied headers.
 * Returns null if the signature does not match anything on the allowlist.
 */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  const sig = buf.subarray(0, 12);
  const fits = (patterns: number[][]) =>
    patterns.some((p) => p.every((b, i) => sig[i] === b));
  if (
    fits([[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]])
  ) return 'image/png';
  if (
    fits([[0xff, 0xd8, 0xff]])
  ) return 'image/jpeg';
  if (
    fits([[0x52, 0x49, 0x46, 0x46]]) && buf.subarray(8, 12).toString('hex') === '57454250' // WEBP
  ) return 'image/webp';
  if (sig.toString('ascii', 0, 4) === '%PDF') return 'application/pdf';
  return null;
}

export function validateUpload(
  buf: Buffer,
  providedMime: string,
  filename: string,
  maxBytes: number
): { ok: true; mime: string; sanitizedFilename: string } | { ok: false; error: string } {
  if (buf.length === 0) return { ok: false, error: 'file_empty' };
  if (buf.length > maxBytes) return { ok: false, error: 'file_too_large' };
  const sniffed = sniffMime(buf);
  if (!sniffed || !ALLOWED_MIMES.includes(sniffed)) return { ok: false, error: 'unsupported_file_type' };
  const declaredOk = ALLOWED_MIMES.includes(providedMime);
  if (!declaredOk) return { ok: false, error: 'declared_mime_rejected' };
  const base = path.basename(filename).replace(/[^\w.()-]/g, '_').slice(0, 100);
  if (/\.(exe|bat|cmd|sh|py|js|php|dll|vbs|ps1)$/i.test(base)) return { ok: false, error: 'executable_forbidden' };
  const ext = EXT_BY_MIME[sniffed];
  return { ok: true, mime: sniffed, sanitizedFilename: `${base.slice(0, base.lastIndexOf('.'))}.${ext}` };
}
