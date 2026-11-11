/**
 * OCR adapter. Online vision OCR is preferred when configured; on-device ML Kit
 * remains the privacy-friendly fallback when the network/service is unavailable.
 */
import { extractIPv4Candidates } from '../../core/ocr/candidates.ts';
import type { OcrCandidate } from '../../core/ocr/candidates.ts';

export interface OcrEngine {
  isSupported(): boolean;
  recognize(uri: string): Promise<string[]>;
}

interface ExtractorModule {
  isSupported: boolean;
  extractTextFromImage: (uri: string) => Promise<string[]>;
}

function load(): ExtractorModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-text-extractor') as ExtractorModule;
    return mod && typeof mod.extractTextFromImage === 'function' ? mod : null;
  } catch {
    return null;
  }
}

export const ocrEngine: OcrEngine = {
  isSupported() {
    const m = load();
    return !!m && m.isSupported !== false;
  },
  async recognize(uri: string) {
    const m = load();
    if (!m || m.isSupported === false) throw new OcrUnavailableError();
    return m.extractTextFromImage(uri);
  },
};

export class OcrUnavailableError extends Error {
  constructor() {
    super('OCR unavailable');
    this.name = 'OcrUnavailableError';
  }
}

export type ScanOutcome =
  | { status: 'ok'; candidates: OcrCandidate[] }
  | { status: 'no_text' }
  | { status: 'no_address' }
  | { status: 'unavailable' }
  | { status: 'failed' };

export interface RemoteOcrImage {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

async function recognizeOnline(image: RemoteOcrImage): Promise<OcrCandidate[] | null> {
  const endpoint = process.env.EXPO_PUBLIC_OCR_API_URL;
  if (!endpoint) return null;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: image.base64, mimeType: image.mimeType }),
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null || !('addresses' in payload)) return null;
    const addresses = (payload as { addresses?: unknown }).addresses;
    if (!Array.isArray(addresses) || !addresses.every((item) => typeof item === 'string')) return null;

    const candidates = extractIPv4Candidates(addresses.join('\n'));
    return candidates.length > 0 ? candidates : null;
  } catch {
    return null;
  }
}

/** Online OCR is attempted first; ML Kit is the offline fallback. */
export async function scanImageForIPv4(
  uri: string,
  engine: OcrEngine = ocrEngine,
  remoteImage?: RemoteOcrImage,
): Promise<ScanOutcome> {
  if (remoteImage) {
    const onlineCandidates = await recognizeOnline(remoteImage);
    if (onlineCandidates) return { status: 'ok', candidates: onlineCandidates };
  }

  if (!engine.isSupported()) return { status: 'unavailable' };
  try {
    const lines = await engine.recognize(uri);
    const text = lines.join('\n').trim();
    if (text === '') return { status: 'no_text' };
    const candidates = extractIPv4Candidates(text);
    return candidates.length === 0 ? { status: 'no_address' } : { status: 'ok', candidates };
  } catch (e) {
    return e instanceof OcrUnavailableError ? { status: 'unavailable' } : { status: 'failed' };
  }
}
