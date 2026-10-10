'use client';

import QRCode from 'qrcode';

export async function qrDataUrl(text: string, size = 220): Promise<string> {
  try {
    return await QRCode.toDataURL(text, { margin: 1, width: size, color: { dark: '#0c1322', light: '#ffffff' }, errorCorrectionLevel: 'M' });
  } catch {
    return '';
  }
}
