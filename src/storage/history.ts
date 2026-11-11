import { getDb } from './db';
import type { BinaryOp } from '../core/arithmetic/index.ts';
import type { Base } from '../core/number-systems/index.ts';

export type HistoryKind = 'convert' | 'arith' | 'ipv4';

export interface ConvertPayload {
  input: string;
  base: Base;
  bin: string;
  dec: string;
  hex: string;
}
export interface ArithPayload {
  a: string;
  b: string;
  op: BinaryOp;
  binary: string;
  decimal: string;
  quotient?: string;
  remainder?: string;
}
export interface Ipv4Payload {
  ip: string;
  binary32: string;
  hex: string;
  category: string;
}

export type HistoryEntry =
  | { id: number; kind: 'convert'; payload: ConvertPayload; createdAt: number }
  | { id: number; kind: 'arith'; payload: ArithPayload; createdAt: number }
  | { id: number; kind: 'ipv4'; payload: Ipv4Payload; createdAt: number };

/** Keep the table bounded. */
export const MAX_HISTORY = 200;

type Row = { id: number; kind: string; payload: string; created_at: number };

function toEntry(r: Row): HistoryEntry | null {
  try {
    const payload = JSON.parse(r.payload) as unknown;
    if (r.kind === 'convert' || r.kind === 'arith' || r.kind === 'ipv4') {
      return { id: r.id, kind: r.kind, payload, createdAt: r.created_at } as HistoryEntry;
    }
  } catch { /* skip corrupt row */ }
  return null;
}

export async function addHistory(kind: HistoryKind, payload: ConvertPayload | ArithPayload | Ipv4Payload): Promise<boolean> {
  try {
    const db = await getDb();
    await db.runAsync('INSERT INTO history (kind, payload, created_at) VALUES (?, ?, ?)', kind, JSON.stringify(payload), Date.now());
    await db.runAsync(
      'DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY created_at DESC, id DESC LIMIT ?)',
      MAX_HISTORY,
    );
    return true;
  } catch {
    return false;
  }
}

export async function listHistory(limit = MAX_HISTORY): Promise<HistoryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>('SELECT id, kind, payload, created_at FROM history ORDER BY created_at DESC, id DESC LIMIT ?', limit);
  return rows.map(toEntry).filter((e): e is HistoryEntry => e !== null);
}

export async function deleteHistory(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM history WHERE id = ?', id);
}

export async function clearHistory(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM history');
}
