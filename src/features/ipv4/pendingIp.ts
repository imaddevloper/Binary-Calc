/**
 * Hand-off between the scanner and the IPv4 tab. The scanner only stores an address the user has
 * confirmed AND that passed the strict validator; the IPv4 tab takes it once and analyzes it.
 */
let pending: string | null = null;

export function setPendingIp(ip: string): void {
  pending = ip;
}

export function takePendingIp(): string | null {
  const p = pending;
  pending = null;
  return p;
}
