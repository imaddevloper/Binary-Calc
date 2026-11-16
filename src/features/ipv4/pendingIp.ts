/** One-time hand-off between the scanner and the dual-stack IP analyzer. */
export type PendingIPVersion = 'ipv4' | 'ipv6';
export interface PendingIP { ip: string; version: PendingIPVersion }
let pending: PendingIP | null = null;

export function setPendingIp(ip: string, version: PendingIPVersion = 'ipv4'): void {
  pending = { ip, version };
}

export function takePendingIp(): PendingIP | null {
  const value = pending;
  pending = null;
  return value;
}
