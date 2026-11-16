/**
 * Turns raw OCR text into IPv4 candidates for the user to review.
 * Nothing here is trusted: every candidate is re-validated by parseIPv4, and any
 * character that was changed is flagged so the UI asks the user to confirm.
 */
import { parseIPv4 } from '../ipv4/index.ts';
import { formatIPv6, parseIPv6 } from '../ipv6/index.ts';

export interface OcrCandidate {
  version: 'ipv4' | 'ipv6';
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
    out.push({ version: 'ipv4', raw: token, suggested, corrected, valid, needsConfirmation: corrected || !valid });
  }
  return out;
}

/** Extract strict IPv6 matches. OCR character substitutions are deliberately not guessed. */
export function extractIPv6Candidates(text: string): OcrCandidate[] {
  const seen = new Set<string>();
  const out: OcrCandidate[] = [];
  const tokens = text.match(/[0-9A-Fa-f:.]{2,80}/g) ?? [];
  for (const rawToken of tokens) {
    const token = rawToken.replace(/^(?:IPv6|IP):/i, '');
    if (!token.includes(':')) continue;
    const parsed = parseIPv6(token);
    if (!parsed.ok) continue;
    const suggested = formatIPv6(parsed.value);
    const key = suggested.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const corrected = suggested.toLowerCase() !== token.toLowerCase();
    out.push({ version: 'ipv6', raw: rawToken, suggested, corrected, valid: true, needsConfirmation: corrected });
  }
  return out;
}

export function extractIPCandidates(text: string): OcrCandidate[] {
  return [...extractIPv4Candidates(text), ...extractIPv6Candidates(text)];
}
