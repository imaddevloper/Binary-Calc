/**
 * Binary arithmetic on unsigned (non-negative) integers, exact via BigInt.
 * Subtraction that goes below zero is reported as a signed MATHEMATICAL result
 * (e.g. "-111"); it is never wrapped or truncated. No two's-complement mode.
 */
import { parseIntegerInput, formatInteger } from '../number-systems/index.ts';
import type { ParseErrorCode } from '../number-systems/index.ts';

export type BinaryOp = 'add' | 'sub' | 'mul' | 'div';

export type ArithErrorCode = ParseErrorCode | 'negative_operand' | 'division_by_zero';

export interface AddColumn {
  position: number;
  a: 0 | 1;
  b: 0 | 1;
  carryIn: 0 | 1;
  sum: 0 | 1;
  carryOut: 0 | 1;
}
export interface SubColumn {
  position: number;
  a: 0 | 1;
  b: 0 | 1;
  borrowIn: 0 | 1;
  diff: 0 | 1;
  borrowOut: 0 | 1;
}
export interface PartialProduct { shift: number; binary: string; decimal: string }
export interface DivRow {
  /** Next bit of the dividend brought down. */
  bit: 0 | 1;
  /** Running remainder after bringing the bit down, before subtracting. */
  partial: string;
  /** Whether the divisor fit (quotient bit = 1) */
  fits: boolean;
  remainderAfter: string;
}

export type ArithSteps =
  | { kind: 'add'; width: number; aPadded: string; bPadded: string; columns: AddColumn[]; finalCarry: 0 | 1 }
  | { kind: 'sub'; width: number; swapped: boolean; topPadded: string; bottomPadded: string; columns: SubColumn[] }
  | { kind: 'mul'; partials: PartialProduct[]; sumBinary: string }
  | { kind: 'div'; rows: DivRow[] };

export interface ArithResult {
  op: BinaryOp;
  a: bigint;
  b: bigint;
  aBin: string;
  bBin: string;
  value: bigint;
  /** Signed mathematical result in binary, e.g. "-111". */
  binary: string;
  decimal: string;
  negative: boolean;
  quotient?: string;
  remainder?: string;
  steps: ArithSteps;
}

export type ArithOutcome =
  | { ok: true; result: ArithResult }
  | { ok: false; error: ArithErrorCode; operand?: 'a' | 'b' };

const bin = (n: bigint): string => n.toString(2);

function addSteps(a: bigint, b: bigint): ArithSteps {
  const aS = bin(a);
  const bS = bin(b);
  const width = Math.max(aS.length, bS.length);
  const aP = aS.padStart(width, '0');
  const bP = bS.padStart(width, '0');
  const columns: AddColumn[] = [];
  let carry: 0 | 1 = 0;
  for (let i = width - 1; i >= 0; i--) {
    const x = Number(aP[i]) as 0 | 1;
    const y = Number(bP[i]) as 0 | 1;
    const total = x + y + carry;
    columns.push({
      position: width - 1 - i,
      a: x,
      b: y,
      carryIn: carry,
      sum: (total % 2) as 0 | 1,
      carryOut: (total >= 2 ? 1 : 0) as 0 | 1,
    });
    carry = (total >= 2 ? 1 : 0) as 0 | 1;
  }
  return { kind: 'add', width, aPadded: aP, bPadded: bP, columns, finalCarry: carry };
}

function subSteps(a: bigint, b: bigint): ArithSteps {
  const swapped = a < b;
  const top = swapped ? b : a;
  const bottom = swapped ? a : b;
  const tS = bin(top);
  const width = tS.length;
  const bS = bin(bottom).padStart(width, '0');
  const columns: SubColumn[] = [];
  let borrow: 0 | 1 = 0;
  for (let i = width - 1; i >= 0; i--) {
    const x = Number(tS[i]);
    const y = Number(bS[i]);
    let d = x - y - borrow;
    let out: 0 | 1 = 0;
    if (d < 0) {
      d += 2;
      out = 1;
    }
    columns.push({
      position: width - 1 - i,
      a: x as 0 | 1,
      b: y as 0 | 1,
      borrowIn: borrow,
      diff: d as 0 | 1,
      borrowOut: out,
    });
    borrow = out;
  }
  return { kind: 'sub', width, swapped, topPadded: tS, bottomPadded: bS, columns };
}

function mulSteps(a: bigint, b: bigint): ArithSteps {
  const bS = bin(b);
  const partials: PartialProduct[] = [];
  for (let i = 0; i < bS.length; i++) {
    if (bS[bS.length - 1 - i] === '1') {
      const v = a << BigInt(i);
      partials.push({ shift: i, binary: bin(v), decimal: v.toString() });
    }
  }
  return { kind: 'mul', partials, sumBinary: bin(a * b) };
}

function divSteps(a: bigint, b: bigint): ArithSteps {
  const aS = bin(a);
  const rows: DivRow[] = [];
  let r = 0n;
  for (const ch of aS) {
    const bit = Number(ch) as 0 | 1;
    r = (r << 1n) | BigInt(bit);
    const partial = bin(r);
    const fits = r >= b;
    if (fits) r -= b;
    rows.push({ bit, partial, fits, remainderAfter: bin(r) });
  }
  return { kind: 'div', rows };
}

export function binaryArithmetic(aRaw: string, bRaw: string, op: BinaryOp): ArithOutcome {
  const pa = parseIntegerInput(aRaw, 2);
  if (!pa.ok) return { ok: false, error: pa.error, operand: 'a' };
  const pb = parseIntegerInput(bRaw, 2);
  if (!pb.ok) return { ok: false, error: pb.error, operand: 'b' };
  if (pa.negative) return { ok: false, error: 'negative_operand', operand: 'a' };
  if (pb.negative) return { ok: false, error: 'negative_operand', operand: 'b' };

  const a = pa.value;
  const b = pb.value;
  let value: bigint;
  let steps: ArithSteps;
  let quotient: string | undefined;
  let remainder: string | undefined;

  switch (op) {
    case 'add':
      value = a + b;
      steps = addSteps(a, b);
      break;
    case 'sub':
      value = a - b;
      steps = subSteps(a, b);
      break;
    case 'mul':
      value = a * b;
      steps = mulSteps(a, b);
      break;
    case 'div': {
      if (b === 0n) return { ok: false, error: 'division_by_zero', operand: 'b' };
      value = a / b;
      quotient = bin(value);
      remainder = bin(a % b);
      steps = divSteps(a, b);
      break;
    }
  }

  return {
    ok: true,
    result: {
      op,
      a,
      b,
      aBin: bin(a),
      bBin: bin(b),
      value,
      binary: formatInteger(value, 2),
      decimal: value.toString(),
      negative: value < 0n,
      quotient,
      remainder,
      steps,
    },
  };
}
