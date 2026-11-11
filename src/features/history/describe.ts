import type { HistoryEntry } from '../../storage/history';
import type { Params, TKey } from '../../i18n';

type T = (key: TKey, params?: Params) => string;

/** Short technical title for a history row (isolated left-to-right by the caller's <Mono>). */
export function historyTitle(e: HistoryEntry, t: T): string {
  switch (e.kind) {
    case 'convert':
      return `${e.payload.input} (${t(`base.chip.${e.payload.base}` as TKey)})`;
    case 'arith':
      return `${e.payload.a} ${t(`op.${e.payload.op}.sym` as TKey)} ${e.payload.b}`;
    case 'ipv4':
      return e.payload.ip;
  }
}

/** One-line result summary. */
export function historySummary(e: HistoryEntry, t: T): string {
  switch (e.kind) {
    case 'convert':
      return `BIN ${e.payload.bin} · DEC ${e.payload.dec} · HEX ${e.payload.hex}`;
    case 'arith':
      return e.payload.op === 'div'
        ? `= ${e.payload.quotient ?? '0'} r ${e.payload.remainder ?? '0'}`
        : `= ${e.payload.binary} (${e.payload.decimal})`;
    case 'ipv4':
      return t(`cat.${e.payload.category}` as TKey);
  }
}

export function formatTime(ms: number, lang: 'en' | 'ar'): string {
  try {
    return new Date(ms).toLocaleString(lang === 'ar' ? 'ar' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return new Date(ms).toISOString();
  }
}
