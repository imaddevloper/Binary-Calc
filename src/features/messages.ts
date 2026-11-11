import { MAX_DIGITS } from '../core/number-systems/index.ts';
import type { ArithErrorCode } from '../core/arithmetic/index.ts';
import type { IPv4ErrorCode } from '../core/ipv4/index.ts';
import type { Params, TKey } from '../i18n';

type T = (key: TKey, params?: Params) => string;

/** Localized, actionable message for any converter / arithmetic error code. */
export function numberError(code: ArithErrorCode, t: T): string {
  return t(`err.${code}` as TKey, { max: MAX_DIGITS });
}

/** Localized message for an IPv4 validation error. `octetIndex` is zero-based. */
export function ipv4Error(code: IPv4ErrorCode, octetIndex: number | undefined, t: T): string {
  const n = (octetIndex ?? 0) + 1;
  return t(`ipv4.err.${code}` as TKey, { n });
}
