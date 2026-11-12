import { getDb } from './db';
import type { Lang } from '../i18n';
import type { ThemeMode } from '../theme/colors';
import type { Base } from '../core/number-systems/index.ts';

export interface Prefs {
  theme: ThemeMode;
  /** null until the user (or first-launch detection) picks a language. */
  language: Lang | null;
  defaultBase: Base;
  groupBinary: boolean;
  upperHex: boolean;
  haptics: boolean;
  reduceMotion: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  language: null,
  defaultBase: 10,
  groupBinary: false,
  upperHex: true,
  haptics: true,
  reduceMotion: false,
};

function coerce<K extends keyof Prefs>(key: K, raw: string): Prefs[K] | undefined {
  try {
    const v = JSON.parse(raw) as unknown;
    switch (key) {
      case 'theme': return (v === 'light' || v === 'dark' || v === 'system' ? v : undefined) as Prefs[K] | undefined;
      case 'language': return (v === 'en' || v === 'ar' ? v : undefined) as Prefs[K] | undefined;
      case 'defaultBase': return (v === 2 || v === 10 || v === 16 ? v : undefined) as Prefs[K] | undefined;
      default: return (typeof v === 'boolean' ? v : undefined) as Prefs[K] | undefined;
    }
  } catch {
    return undefined;
  }
}

/** Never throws: on any storage failure the defaults are used so the app still starts. */
export async function loadPrefs(): Promise<Prefs> {
  const out: Prefs = { ...DEFAULT_PREFS };
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM prefs');
    for (const r of rows) {
      if (r.key in DEFAULT_PREFS) {
        const k = r.key as keyof Prefs;
        const v = coerce(k, r.value);
        if (v !== undefined) (out as unknown as Record<string, unknown>)[k] = v;
      }
    }
  } catch {
    /* defaults */
  }
  return out;
}

export async function savePref<K extends keyof Prefs>(key: K, value: Prefs[K]): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync('INSERT OR REPLACE INTO prefs (key, value) VALUES (?, ?)', key, JSON.stringify(value));
  } catch {
    /* preference stays in memory for this session */
  }
}

export async function resetPrefs(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM prefs WHERE key IN ('theme','language','defaultBase','groupBinary','upperHex','haptics','reduceMotion')");
}

// --- challenge statistics (stored as one JSON value in the same table)

export interface ChallengeStats {
  answered: number;
  correct: number;
}

export async function loadStats(): Promise<ChallengeStats> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM prefs WHERE key = 'challengeStats'");
    if (row) {
      const v = JSON.parse(row.value) as Partial<ChallengeStats>;
      if (Number.isInteger(v.answered) && Number.isInteger(v.correct)) {
        return { answered: Math.max(0, v.answered as number), correct: Math.max(0, v.correct as number) };
      }
    }
  } catch { /* fall through */ }
  return { answered: 0, correct: 0 };
}

export async function saveStats(s: ChallengeStats): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync("INSERT OR REPLACE INTO prefs (key, value) VALUES ('challengeStats', ?)", JSON.stringify(s));
  } catch { /* in-memory only */ }
}

export async function loadCompletedLessons(): Promise<number[]> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM prefs WHERE key = 'lessonsDone'");
    if (row) {
      const v = JSON.parse(row.value) as unknown;
      if (Array.isArray(v)) return v.filter((n): n is number => Number.isInteger(n));
    }
  } catch { /* fall through */ }
  return [];
}

export async function saveCompletedLessons(ids: number[]): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync("INSERT OR REPLACE INTO prefs (key, value) VALUES ('lessonsDone', ?)", JSON.stringify(ids));
  } catch { /* in-memory only */ }
}


/** OSI Academy progress is independent from the existing binary lessons. */
export async function loadOsiCompletedLayers(): Promise<number[]> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM prefs WHERE key = 'osiLayersDone'");
    if (!row) return [];
    const value: unknown = JSON.parse(row.value);
    return Array.isArray(value)
      ? [...new Set(value.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 7))]
      : [];
  } catch {
    return [];
  }
}

export async function saveOsiCompletedLayers(ids: number[]): Promise<void> {
  try {
    const safe = [...new Set(ids.filter((n) => Number.isInteger(n) && n >= 1 && n <= 7))].sort((a, b) => a - b);
    const db = await getDb();
    await db.runAsync("INSERT OR REPLACE INTO prefs (key, value) VALUES ('osiLayersDone', ?)", JSON.stringify(safe));
  } catch {
    // Keep the academy usable if local storage is unavailable.
  }
}
