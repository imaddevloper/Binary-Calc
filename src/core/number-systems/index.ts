/**
 * Integer number-system engine. Pure functions, BigInt only (no floating point).
 *
 * Input model (documented in README):
 *  - Integers only. Fractions are rejected, never silently truncated.
 *  - Optional leading "-" for negative values. Negatives are shown as signed
 *    magnitudes ("-1010"), NOT two's complement.
 *  - Binary / hex accept spaces and underscores as readability separators, and
 *    the 0b / 0x prefixes. They are stripped and the normalized value is returned.
 *  - Decimal accepts digits only (a comma is rejected, never read as a separator).
 *  - Maximum MAX_DIGITS digits (after normalization).
 */

export type Base = 2 | 10 | 16;
export const MAX_DIGITS = 256;

export type ParseErrorCode =
  | 'empty'
  | 'invalid_binary'
  | 'invalid_decimal'
  | 'invalid_hex'
  | 'fraction_not_supported'
  | 'too_long';

export type ParseResult =
  | { ok: true; value: bigint; normalized: string; negative: boolean }
  | { ok: false; error: ParseErrorCode };

const DIGIT_RE: Record<Base, RegExp> = {
  2: /^[01]+$/,
  10: /^[0-9]+$/,
  16: /^[0-9A-Fa-f]+$/,
};

const INVALID: Record<Base, ParseErrorCode> = {
  2: 'invalid_binary',
  10: 'invalid_decimal',
  16: 'invalid_hex',
};

export function parseIntegerInput(raw: string, base: Base): ParseResult {
  let s = raw.trim();
  if (s === '') return { ok: false, error: 'empty' };

  let negative = false;
  if (s[0] === '-') {
    negative = true;
    s = s.slice(1).trim();
    if (s === '') return { ok: false, error: INVALID[base] };
  }

  if (base === 16 && /^0x/i.test(s)) s = s.slice(2);
  if (base === 2 && /^0b/i.test(s)) s = s.slice(2);
  if (base !== 10) s = s.replace(/[ _]/g, '');
  if (s === '') return { ok: false, error: 'empty' };

  if (s.includes('.')) {
    const parts = s.split('.');
    const joined = parts.join('');
    if (parts.length === 2 && joined.length > 0 && DIGIT_RE[base].test(joined)) {
      return { ok: false, error: 'fraction_not_supported' };
    }
    return { ok: false, error: INVALID[base] };
  }

  if (!DIGIT_RE[base].test(s)) return { ok: false, error: INVALID[base] };
  if (s.length > MAX_DIGITS) return { ok: false, error: 'too_long' };

  const magnitude = base === 2 ? BigInt('0b' + s) : base === 16 ? BigInt('0x' + s) : BigInt(s);
  const isZero = magnitude === 0n;
  const digits = s.toUpperCase().replace(/^0+(?=.)/, '');
  return {
    ok: true,
    value: negative && !isZero ? -magnitude : magnitude,
    normalized: (negative && !isZero ? '-' : '') + digits,
    negative: negative && !isZero,
  };
}

export interface FormatOptions {
  /** Left-pad the digits with zeros to at least this many digits. */
  minWidth?: number;
}

/** Format a BigInt in the given base. Hex is uppercase. Negative values keep a "-" sign. */
export function formatInteger(value: bigint, base: Base, opts: FormatOptions = {}): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  let s = abs.toString(base).toUpperCase();
  if (opts.minWidth && s.length < opts.minWidth) s = s.padStart(opts.minWidth, '0');
  return negative ? '-' + s : s;
}

/** Insert a separator every `size` characters, counted from the right. Display only. */
export function groupFromRight(digits: string, size: number, sep = ' '): string {
  const negative = digits.startsWith('-');
  const body = negative ? digits.slice(1) : digits;
  const out: string[] = [];
  for (let end = body.length; end > 0; end -= size) {
    out.unshift(body.slice(Math.max(0, end - size), end));
  }
  return (negative ? '-' : '') + out.join(sep);
}

export type ConvertResult =
  | { ok: true; value: bigint; output: string }
  | { ok: false; error: ParseErrorCode };

export function convertBetweenBases(raw: string, from: Base, to: Base): ConvertResult {
  const parsed = parseIntegerInput(raw, from);
  if (!parsed.ok) return parsed;
  return { ok: true, value: parsed.value, output: formatInteger(parsed.value, to) };
}

/** All three representations of one value. */
export function allRepresentations(value: bigint): Record<Base, string> {
  return { 2: formatInteger(value, 2), 10: formatInteger(value, 10), 16: formatInteger(value, 16) };
}

// ---------------------------------------------------------------- steps

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};
export function superscript(n: number): string {
  return String(n).split('').map((c) => SUPERSCRIPT[c] ?? c).join('');
}

export interface DivisionRow {
  dividend: bigint;
  divisor: number;
  quotient: bigint;
  remainder: number;
  /** The digit this remainder becomes in the target base. */
  digit: string;
}

/** Repeated division of a non-negative value by 2 or 16. Rows are in the order performed. */
export function divisionSteps(value: bigint, base: 2 | 16): DivisionRow[] {
  if (value < 0n) throw new RangeError('divisionSteps expects a non-negative value');
  const b = BigInt(base);
  if (value === 0n) return [{ dividend: 0n, divisor: base, quotient: 0n, remainder: 0, digit: '0' }];
  const rows: DivisionRow[] = [];
  let v = value;
  while (v > 0n) {
    const q = v / b;
    const r = Number(v % b);
    rows.push({ dividend: v, divisor: base, quotient: q, remainder: r, digit: r.toString(16).toUpperCase() });
    v = q;
  }
  return rows;
}

export interface PlaceValueTerm { power: number; place: bigint }

/** The powers of two that contribute to a non-negative value, highest first. */
export function placeValueDecomposition(value: bigint): PlaceValueTerm[] {
  if (value < 0n) throw new RangeError('expects a non-negative value');
  const bits = value.toString(2);
  const out: PlaceValueTerm[] = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      const power = bits.length - 1 - i;
      out.push({ power, place: 1n << BigInt(power) });
    }
  }
  return out;
}

export interface DecimalToBaseSteps {
  /** Magnitude being converted (sign is handled separately). */
  magnitude: bigint;
  negative: boolean;
  rows: DivisionRow[];
  /** Remainders read from the last division up to the first. */
  result: string;
}

export interface DecimalToBinarySteps extends DecimalToBaseSteps {
  placeValues: PlaceValueTerm[];
  /** e.g. "192 = 128 + 64" */
  expression: string;
}

export function decimalToBinarySteps(value: bigint): DecimalToBinarySteps {
  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const rows = divisionSteps(magnitude, 2);
  const placeValues = placeValueDecomposition(magnitude);
  const expression =
    magnitude === 0n
      ? '0 = 0'
      : `${magnitude} = ${placeValues.map((p) => p.place.toString()).join(' + ')}`;
  return {
    magnitude,
    negative,
    rows,
    result: rows.map((r) => r.digit).reverse().join(''),
    placeValues,
    expression,
  };
}

export interface DecimalToHexSteps extends DecimalToBaseSteps {
  /** Letter digits that actually appear, e.g. {digit:'C', value:12}. */
  letterDigits: { digit: string; value: number }[];
}

export function decimalToHexSteps(value: bigint): DecimalToHexSteps {
  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const rows = divisionSteps(magnitude, 16);
  const seen = new Map<string, number>();
  for (const r of rows) if (r.remainder > 9) seen.set(r.digit, r.remainder);
  return {
    magnitude,
    negative,
    rows,
    result: rows.map((r) => r.digit).reverse().join(''),
    letterDigits: [...seen.entries()].map(([digit, v]) => ({ digit, value: v })),
  };
}

export interface PositionalTerm {
  digit: string;
  digitValue: number;
  power: number;
  place: bigint;
  contribution: bigint;
}

export interface PositionalSteps {
  terms: PositionalTerm[];
  total: bigint;
  /** Only contributing terms, e.g. "1×2⁷ + 1×2⁶" */
  expression: string;
  /** Contributions as numbers, e.g. "128 + 64" */
  sumExpression: string;
}

function positional(digits: string, radix: 2 | 16): PositionalSteps {
  const n = digits.length;
  const terms: PositionalTerm[] = [];
  let total = 0n;
  for (let i = 0; i < n; i++) {
    const power = n - 1 - i;
    const digitValue = parseInt(digits[i], 16);
    if (Number.isNaN(digitValue) || digitValue >= radix) {
      throw new RangeError(`Invalid digit "${digits[i]}" for base ${radix}`);
    }
    const place = BigInt(radix) ** BigInt(power);
    const contribution = BigInt(digitValue) * place;
    total += contribution;
    terms.push({ digit: digits[i].toUpperCase(), digitValue, power, place, contribution });
  }
  const active = terms.filter((t) => t.contribution !== 0n);
  const list = active.length > 0 ? active : terms.slice(-1);
  return {
    terms,
    total,
    expression: list.map((t) => `${t.digitValue}×${radix}${superscript(t.power)}`).join(' + '),
    sumExpression: list.map((t) => t.contribution.toString()).join(' + '),
  };
}

/** `bin` must contain only 0/1 (use the normalized output of parseIntegerInput). */
export function binaryToDecimalSteps(bin: string): PositionalSteps {
  if (!/^[01]+$/.test(bin)) throw new RangeError('binaryToDecimalSteps expects 0/1 digits');
  return positional(bin, 2);
}

/** `hex` must contain only 0-9A-F. */
export function hexToDecimalSteps(hex: string): PositionalSteps {
  if (!/^[0-9A-Fa-f]+$/.test(hex)) throw new RangeError('hexToDecimalSteps expects hex digits');
  return positional(hex, 16);
}

export interface NibbleGroup { bits: string; hex: string }

export interface BinaryToHexSteps {
  /** Number of zeros added on the left for display only (0-3). */
  paddedBy: number;
  padded: string;
  groups: NibbleGroup[];
  result: string;
}

export function binaryToHexSteps(bin: string): BinaryToHexSteps {
  if (!/^[01]+$/.test(bin)) throw new RangeError('binaryToHexSteps expects 0/1 digits');
  const paddedBy = (4 - (bin.length % 4)) % 4;
  const padded = '0'.repeat(paddedBy) + bin;
  const groups: NibbleGroup[] = [];
  for (let i = 0; i < padded.length; i += 4) {
    const bits = padded.slice(i, i + 4);
    groups.push({ bits, hex: parseInt(bits, 2).toString(16).toUpperCase() });
  }
  return {
    paddedBy,
    padded,
    groups,
    result: groups.map((g) => g.hex).join('').replace(/^0+(?=.)/, ''),
  };
}

export interface HexToBinarySteps {
  groups: NibbleGroup[];
  result: string;
}

export function hexToBinarySteps(hex: string): HexToBinarySteps {
  if (!/^[0-9A-Fa-f]+$/.test(hex)) throw new RangeError('hexToBinarySteps expects hex digits');
  const groups: NibbleGroup[] = hex.split('').map((c) => ({
    hex: c.toUpperCase(),
    bits: parseInt(c, 16).toString(2).padStart(4, '0'),
  }));
  return { groups, result: groups.map((g) => g.bits).join('').replace(/^0+(?=.)/, '') };
}

export interface BitCell { position: number; place: bigint; bit: 0 | 1 }
export interface BitBreakdown { width: number; bits: BitCell[] }

/**
 * Bits from most significant to least significant. Default width is the smallest
 * multiple of 8 (at least 8) that holds the value. Throws if `width` is too small
 * or the value is negative.
 */
export function getBitBreakdown(value: bigint, width?: number): BitBreakdown {
  if (value < 0n) throw new RangeError('getBitBreakdown expects a non-negative value');
  const len = value === 0n ? 1 : value.toString(2).length;
  const w = width ?? Math.max(8, Math.ceil(len / 8) * 8);
  if (len > w) throw new RangeError(`Value does not fit in ${w} bits`);
  const bits: BitCell[] = [];
  for (let pos = w - 1; pos >= 0; pos--) {
    const place = 1n << BigInt(pos);
    bits.push({ position: pos, place, bit: (value & place) !== 0n ? 1 : 0 });
  }
  return { width: w, bits };
}
