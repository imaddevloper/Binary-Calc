import { en } from './en.ts';
import type { TKey } from './en.ts';
import { ar } from './ar.ts';

export type Lang = 'en' | 'ar';
export type { TKey };

export const DICTIONARIES: Record<Lang, Record<TKey, string>> = { en, ar };

export type Params = Record<string, string | number>;

/** Pure translator (no React). Unknown params are left visible so a missing value is noticed. */
export function translate(lang: Lang, key: TKey, params?: Params): string {
  let s = DICTIONARIES[lang][key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

const LRI = '⁦';
const PDI = '⁩';

/**
 * Wraps technical text (IPs, binary, hex, formulas) in a left-to-right isolate so
 * surrounding Arabic text can never reorder its characters.
 */
export function ltr(text: string | number): string {
  return `${LRI}${text}${PDI}`;
}

export function isRtl(lang: Lang): boolean {
  return lang === 'ar';
}
