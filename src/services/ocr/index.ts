/**
 * OCR adapter. The app depends on this small interface, not on a specific library.
 *
 * Implementation: `expo-text-extractor` — Google ML Kit text recognition on Android
 * (on-device, no network). It is a native module, so it needs a development build or a
 * release build; in Expo Go the module is missing and `isSupported()` returns false, in which
 * case the UI says so and offers manual entry. Nothing is ever uploaded.
 */
import { extractIPv4Candidates } from '../../core/ocr/candidates.ts';
import type { OcrCandidate } from '../../core/ocr/candidates.ts';

export interface OcrEngine {
  isSupported(): boolean;
  /** Returns the recognised text lines for the image at `uri`. */
  recognize(uri: string): Promise<string[]>;
}

interface ExtractorModule {
  isSupported: boolean;
  extractTextFromImage: (uri: string) => Promise<string[]>;
}

function load(): ExtractorModule | null {
  try {
    // Loaded lazily and guarded: a missing native module must not crash app startup.
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

/** Runs OCR and extracts IPv4 candidates. Every candidate still has to be confirmed and validated by the user flow. */
export async function scanImageForIPv4(uri: string, engine: OcrEngine = ocrEngine): Promise<ScanOutcome> {
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
