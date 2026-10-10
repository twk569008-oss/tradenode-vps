import crypto from 'crypto';

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw || raw.length !== 64) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must be a 64-hex-char secret (32 bytes).');
  }
  cachedKey = Buffer.from(raw, 'hex');
  return cachedKey;
}

export function encryptCredential(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${enc.toString('base64')}.${cipher.getAuthTag().toString('base64')}`;
}

export function decryptCredential(blob: string): string {
  const [ivB64, dataB64, tagB64] = blob.split('.');
  if (!ivB64 || !dataB64 || !tagB64) throw new Error('Malformed credential blob.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
