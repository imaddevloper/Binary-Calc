/**
 * Turns raw OCR text into IPv4 candidates for the user to review.
 * Nothing here is trusted: every candidate is re-validated by parseIPv4, and any
 * character that was changed is flagged so the UI asks the user to confirm.
 */
import { parseIPv4 } from '../ipv4/index.ts';

export interface OcrCandidate {
  /** Text exactly as it appeared in the OCR output. */
  raw: string;
  /** Raw text with common OCR confusions replaced (O→0, l/I/|→1, comma→dot). */
  suggested: string;
  /** True when `suggested` differs from `raw`. */
  corrected: boolean;
  /** Result of the strict IPv4 validator on `suggested`. */
  valid: boolean;
  /** Candidates that were corrected or are invalid always need user confirmation. */
  needsConfirmation: boolean;
}

const TOKEN_RE = /^[0-9OolI|]{1,3}([.,][0-9OolI|]{1,3}){3}$/;

function clean(token: string): string {
  return token.replace(/^[\s()[\]{}<>:;"'`]+/, '').replace(/[\s()[\]{}<>:;"'`.,]+$/, '');
}

export function suggestFromRaw(raw: string): string {
  return raw.replace(/[Oo]/g, '0').replace(/[lI|]/g, '1').replace(/,/g, '.');
}

export function extractIPv4Candidates(text: string): OcrCandidate[] {
  const seen = new Set<string>();
  const out: OcrCandidate[] = [];
  for (const piece of text.split(/\s+/)) {
    const token = clean(piece);
    if (!TOKEN_RE.test(token)) continue;
    const suggested = suggestFromRaw(token);
    if (seen.has(suggested)) continue;
    seen.add(suggested);
    const corrected = suggested !== token;
    const valid = parseIPv4(suggested).ok;
    out.push({ raw: token, suggested, corrected, valid, needsConfirmation: corrected || !valid });
  }
  return out;
}
