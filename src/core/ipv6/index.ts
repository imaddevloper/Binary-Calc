
/**
 * IPv6 parsing and numeric representations.
 * Supports RFC 4291 hexadecimal notation, one :: compression marker, and
 * IPv4-embedded dotted-decimal tails. Zone identifiers are intentionally rejected.
 */
export type IPv6ErrorCode = 'empty' | 'invalid_char' | 'multiple_compression' | 'wrong_group_count' | 'invalid_group' | 'invalid_ipv4_tail';
export type IPv6Parse =
  | { ok: true; groups: number[]; value: bigint; normalized: string }
  | { ok: false; error: IPv6ErrorCode };

function parseIPv4Tail(tail: string): number[] | null {
  const parts = tail.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) return -1;
    const n = Number(part);
    return n <= 255 ? n : -1;
  });
  if (octets.some((n) => n < 0)) return null;
  return [(octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]];
}

export function parseIPv6(raw: string): IPv6Parse {
  let input = raw.trim().toLowerCase();
  if (!input) return { ok: false, error: 'empty' };
  if (input.includes('%') || input.startsWith('[') || input.endsWith(']')) return { ok: false, error: 'invalid_char' };
  if (!/^[0-9a-f:.]+$/.test(input)) return { ok: false, error: 'invalid_char' };

  if (input.includes('.')) {
    const lastColon = input.lastIndexOf(':');
    if (lastColon < 0) return { ok: false, error: 'invalid_ipv4_tail' };
    const tail = parseIPv4Tail(input.slice(lastColon + 1));
    if (!tail) return { ok: false, error: 'invalid_ipv4_tail' };
    input = input.slice(0, lastColon + 1) + tail.map((n) => n.toString(16)).join(':');
  }

  const occurrences = input.match(/::/g) ?? [];
  if (occurrences.length > 1) return { ok: false, error: 'multiple_compression' };
  const compressed = occurrences.length === 1;
  const halves = compressed ? input.split('::') : [input];
  const left = halves[0] ? halves[0].split(':') : [];
  const right = compressed && halves[1] ? halves[1].split(':') : [];
  const explicit = [...left, ...right];
  if (explicit.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return { ok: false, error: 'invalid_group' };
  if (compressed ? explicit.length >= 8 : explicit.length !== 8) return { ok: false, error: 'wrong_group_count' };
  const zeros = compressed ? 8 - explicit.length : 0;
  const groups = [...left, ...Array(zeros).fill('0'), ...right].map((g) => parseInt(g, 16));
  let value = 0n;
  for (const group of groups) value = (value << 16n) | BigInt(group);
  const normalized = groups.map((g) => g.toString(16)).join(':');
  return { ok: true, groups, value, normalized };
}

export function formatIPv6(value: bigint, compress = true): string {
  if (value < 0n || value >= (1n << 128n)) throw new RangeError('IPv6 value must fit unsigned 128 bits');
  const groups = Array.from({ length: 8 }, (_, i) => Number((value >> BigInt((7 - i) * 16)) & 0xffffn));
  if (!compress) return groups.map((g) => g.toString(16)).join(':');
  let bestStart = -1, bestLength = 1;
  for (let i = 0; i < 8;) {
    if (groups[i] !== 0) { i++; continue; }
    let j = i;
    while (j < 8 && groups[j] === 0) j++;
    if (j - i > bestLength) { bestStart = i; bestLength = j - i; }
    i = j;
  }
  if (bestStart < 0) return groups.map((g) => g.toString(16)).join(':');
  const left = groups.slice(0, bestStart).map((g) => g.toString(16)).join(':');
  const right = groups.slice(bestStart + bestLength).map((g) => g.toString(16)).join(':');
  return left + '::' + right;
}

export interface IPv6Analysis {
  normalized: string;
  value: bigint;
  binary: string;
  octal: string;
  decimal: string;
  hexadecimal: string;
  groups: string[];
}

export function analyzeIPv6(raw: string): { ok: true; analysis: IPv6Analysis } | { ok: false; error: IPv6ErrorCode } {
  const parsed = parseIPv6(raw);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    analysis: {
      normalized: parsed.normalized,
      value: parsed.value,
      binary: parsed.value.toString(2).padStart(128, '0'),
      octal: parsed.value.toString(8),
      decimal: parsed.value.toString(10),
      hexadecimal: parsed.value.toString(16).toUpperCase().padStart(32, '0'),
      groups: parsed.groups.map((g) => g.toString(16).padStart(4, '0').toUpperCase()),
    },
  };
}
