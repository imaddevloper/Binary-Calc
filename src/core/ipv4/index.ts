/**
 * IPv4 validation and analysis. Pure functions, no dependencies.
 *
 * Validation rules (strict):
 *  - exactly four dot-separated octets, outer whitespace trimmed, nothing else
 *  - each octet is 1-3 ASCII digits, value 0-255
 *  - multi-digit leading zeros ("01", "00") are REJECTED (they are ambiguous:
 *    some parsers read them as octal). They are never reinterpreted.
 */

export type IPv4ErrorCode =
  | 'empty'
  | 'wrong_parts'
  | 'empty_octet'
  | 'invalid_char'
  | 'leading_zero'
  | 'out_of_range';

export type IPv4Parse =
  | { ok: true; octets: [number, number, number, number]; normalized: string }
  | { ok: false; error: IPv4ErrorCode; octetIndex?: number };

export function parseIPv4(raw: string): IPv4Parse {
  const s = raw.trim();
  if (s === '') return { ok: false, error: 'empty' };
  const parts = s.split('.');
  if (parts.length !== 4) {
    // Distinguish "not dotted-decimal at all" from "wrong number of octets".
    if (/[^0-9.]/.test(s)) return { ok: false, error: 'invalid_char' };
    return { ok: false, error: 'wrong_parts' };
  }
  const octets: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p = parts[i];
    if (p === '') return { ok: false, error: 'empty_octet', octetIndex: i };
    if (!/^[0-9]+$/.test(p)) return { ok: false, error: 'invalid_char', octetIndex: i };
    if (p.length > 1 && p[0] === '0') return { ok: false, error: 'leading_zero', octetIndex: i };
    if (p.length > 3) return { ok: false, error: 'out_of_range', octetIndex: i };
    const n = Number(p);
    if (n > 255) return { ok: false, error: 'out_of_range', octetIndex: i };
    octets.push(n);
  }
  const o = octets as [number, number, number, number];
  return { ok: true, octets: o, normalized: o.join('.') };
}

/** Always exactly 8 binary digits. */
export function octetToBinary(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 255) throw new RangeError('octet out of range');
  return n.toString(2).padStart(8, '0');
}

/** Unsigned 32-bit value (no signed bitwise operators involved). */
export function ipv4ToUint32(o: readonly [number, number, number, number]): number {
  return ((o[0] * 256 + o[1]) * 256 + o[2]) * 256 + o[3];
}

export function ipv4ToBinary32(o: readonly [number, number, number, number]): string {
  return o.map(octetToBinary).join('.');
}

/** 8 uppercase hex digits, e.g. C0A8010A. */
export function ipv4ToHex(o: readonly [number, number, number, number]): string {
  return ipv4ToUint32(o).toString(16).toUpperCase().padStart(8, '0');
}

// ----------------------------------------------------------- classification

export type AddressCategory =
  | 'unspecified'
  | 'this_network'
  | 'private_use'
  | 'shared_address_space'
  | 'loopback'
  | 'link_local'
  | 'ietf_protocol'
  | 'documentation'
  | 'deprecated_6to4'
  | 'benchmarking'
  | 'multicast'
  | 'reserved_future'
  | 'limited_broadcast'
  | 'general';

interface RangeEntry {
  cidr: string;
  base: [number, number, number, number];
  prefix: number;
  category: AddressCategory;
  reference: string;
}

/** Special-purpose IPv4 blocks (IANA registry / RFC 6890 and the RFCs cited per entry). */
const RANGES: RangeEntry[] = [
  { cidr: '0.0.0.0/32', base: [0, 0, 0, 0], prefix: 32, category: 'unspecified', reference: 'RFC 1122' },
  { cidr: '0.0.0.0/8', base: [0, 0, 0, 0], prefix: 8, category: 'this_network', reference: 'RFC 1122' },
  { cidr: '10.0.0.0/8', base: [10, 0, 0, 0], prefix: 8, category: 'private_use', reference: 'RFC 1918' },
  { cidr: '100.64.0.0/10', base: [100, 64, 0, 0], prefix: 10, category: 'shared_address_space', reference: 'RFC 6598' },
  { cidr: '127.0.0.0/8', base: [127, 0, 0, 0], prefix: 8, category: 'loopback', reference: 'RFC 1122' },
  { cidr: '169.254.0.0/16', base: [169, 254, 0, 0], prefix: 16, category: 'link_local', reference: 'RFC 3927' },
  { cidr: '172.16.0.0/12', base: [172, 16, 0, 0], prefix: 12, category: 'private_use', reference: 'RFC 1918' },
  { cidr: '192.0.0.0/24', base: [192, 0, 0, 0], prefix: 24, category: 'ietf_protocol', reference: 'RFC 6890' },
  { cidr: '192.0.2.0/24', base: [192, 0, 2, 0], prefix: 24, category: 'documentation', reference: 'RFC 5737' },
  { cidr: '192.88.99.0/24', base: [192, 88, 99, 0], prefix: 24, category: 'deprecated_6to4', reference: 'RFC 7526' },
  { cidr: '192.168.0.0/16', base: [192, 168, 0, 0], prefix: 16, category: 'private_use', reference: 'RFC 1918' },
  { cidr: '198.18.0.0/15', base: [198, 18, 0, 0], prefix: 15, category: 'benchmarking', reference: 'RFC 2544' },
  { cidr: '198.51.100.0/24', base: [198, 51, 100, 0], prefix: 24, category: 'documentation', reference: 'RFC 5737' },
  { cidr: '203.0.113.0/24', base: [203, 0, 113, 0], prefix: 24, category: 'documentation', reference: 'RFC 5737' },
  { cidr: '224.0.0.0/4', base: [224, 0, 0, 0], prefix: 4, category: 'multicast', reference: 'RFC 5771' },
  { cidr: '240.0.0.0/4', base: [240, 0, 0, 0], prefix: 4, category: 'reserved_future', reference: 'RFC 1112' },
  { cidr: '255.255.255.255/32', base: [255, 255, 255, 255], prefix: 32, category: 'limited_broadcast', reference: 'RFC 919' },
];

export function inCidr(ip: number, base: number, prefix: number): boolean {
  if (prefix < 0 || prefix > 32) throw new RangeError('prefix out of range');
  if (prefix === 0) return true;
  const size = 2 ** (32 - prefix);
  return Math.floor(ip / size) === Math.floor(base / size);
}

export interface Classification {
  category: AddressCategory;
  /** CIDR block that matched, or null for 'general'. */
  cidr: string | null;
  reference: string | null;
}

/**
 * Longest-prefix match against the special-purpose table, so the most specific
 * block wins (0.0.0.0 is "unspecified", not just "this network"; 255.255.255.255
 * is "limited broadcast", not just "reserved"). Addresses in no listed block are
 * 'general' — NOT guaranteed to be globally reachable.
 */
export function classifyIPv4(o: readonly [number, number, number, number]): Classification {
  const ip = ipv4ToUint32(o);
  let best: RangeEntry | null = null;
  for (const r of RANGES) {
    if (inCidr(ip, ipv4ToUint32(r.base), r.prefix) && (best === null || r.prefix > best.prefix)) best = r;
  }
  return best
    ? { category: best.category, cidr: best.cidr, reference: best.reference }
    : { category: 'general', cidr: null, reference: null };
}

export type HistoricalClass = 'A' | 'B' | 'C' | 'D' | 'E';

export interface ClassfulInfo {
  label: HistoricalClass;
  /** True for first octets 0 and 127 (reserved inside historical Class A). */
  caveat: boolean;
}

/** Historical classful label (educational only; modern routing uses CIDR). */
export function historicalClass(firstOctet: number): ClassfulInfo {
  if (firstOctet <= 127) return { label: 'A', caveat: firstOctet === 0 || firstOctet === 127 };
  if (firstOctet <= 191) return { label: 'B', caveat: false };
  if (firstOctet <= 223) return { label: 'C', caveat: false };
  if (firstOctet <= 239) return { label: 'D', caveat: false };
  return { label: 'E', caveat: false };
}

export interface OctetInfo {
  index: number;
  decimal: number;
  binary: string;
}

export interface IPv4Analysis {
  octets: [number, number, number, number];
  normalized: string;
  octetInfo: OctetInfo[];
  binary32: string;
  /** 32 digits, no dots. */
  binary32Compact: string;
  hex: string;
  uint32: number;
  classification: Classification;
  classful: ClassfulInfo;
}

export function analyzeIPv4(raw: string): { ok: true; analysis: IPv4Analysis } | { ok: false; error: IPv4ErrorCode; octetIndex?: number } {
  const p = parseIPv4(raw);
  if (!p.ok) return p;
  const o = p.octets;
  const binary32 = ipv4ToBinary32(o);
  return {
    ok: true,
    analysis: {
      octets: o,
      normalized: p.normalized,
      octetInfo: o.map((n, i) => ({ index: i + 1, decimal: n, binary: octetToBinary(n) })),
      binary32,
      binary32Compact: binary32.replace(/\./g, ''),
      hex: ipv4ToHex(o),
      uint32: ipv4ToUint32(o),
      classification: classifyIPv4(o),
      classful: historicalClass(o[0]),
    },
  };
}
