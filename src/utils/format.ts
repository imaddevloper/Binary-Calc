import { groupFromRight } from '../core/number-systems/index.ts';
import type { Base } from '../core/number-systems/index.ts';

export interface DisplayOptions {
  group: boolean;
  upperHex: boolean;
}

/** The exact value that is copied: never grouped, hex case follows the preference. */
export function canonical(value: string, base: Base, upperHex: boolean): string {
  return base === 16 && !upperHex ? value.toLowerCase() : value;
}

/** What is shown on screen: optional nibble grouping for binary (display only). */
export function display(value: string, base: Base, opts: DisplayOptions): string {
  const v = canonical(value, base, opts.upperHex);
  return base === 2 && opts.group ? groupFromRight(v, 4) : v;
}

/** Binary grouped for a 4-bit boundary, used by IPv4 / arithmetic displays regardless of the preference. */
export function nibbles(bin: string): string {
  return groupFromRight(bin, 4);
}
