import * as SecureStore from "expo-secure-store";

const API_BASE = "https://binary-calc-remote.binary-calc-remote.workers.dev";
const PENDING_KEY = "binarycalc.remote.pending.v1";
const DEVICE_TOKEN_KEY = "binarycalc.remote.device-token.v1";

type ApiErrorBody = { error?: string };
type PairCreateResponse = { pairCode: string; pendingSecret: string; expiresInSeconds: number };
type PairCompleteResponse = { deviceToken: string };

export type PendingPairing = { pairCode: string; pendingSecret: string; expiresAt: number };

export class RemoteApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = "RemoteApiError";
  }
}

async function request<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; token?: string } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API_BASE + path, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.token ? { Authorization: "Bearer " + options.token } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new RemoteApiError("network_error", 0, "network_error");
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new RemoteApiError("invalid_server_response", response.status, "invalid_server_response");
  }

  if (!response.ok) {
    const code = typeof (data as ApiErrorBody)?.error === "string"
      ? (data as ApiErrorBody).error!
      : "remote_request_failed";
    throw new RemoteApiError(code, response.status, code);
  }

  return data as T;
}

export async function createPairingSession(deviceName: string): Promise<PendingPairing> {
  if (!(await SecureStore.isAvailableAsync())) {
    throw new RemoteApiError("secure_storage_unavailable", 0, "secure_storage_unavailable");
  }

  const result = await request<PairCreateResponse>("/api/pair/create", {
    method: "POST",
    body: { deviceName },
  });

  const pending: PendingPairing = {
    pairCode: result.pairCode,
    pendingSecret: result.pendingSecret,
    expiresAt: Date.now() + result.expiresInSeconds * 1000,
  };

  try {
    await SecureStore.setItemAsync(PENDING_KEY, JSON.stringify(pending));
  } catch {
    throw new RemoteApiError("secure_storage_write_failed", 0, "secure_storage_write_failed");
  }

  return pending;
}

export async function loadPendingPairing(): Promise<PendingPairing | null> {
  const raw = await SecureStore.getItemAsync(PENDING_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingPairing>;
    if (
      typeof value.pairCode !== "string" ||
      !/^\d{8}$/.test(value.pairCode) ||
      typeof value.pendingSecret !== "string" ||
      typeof value.expiresAt !== "number" ||
      value.expiresAt <= Date.now()
    ) {
      await SecureStore.deleteItemAsync(PENDING_KEY);
      return null;
    }
    return value as PendingPairing;
  } catch {
    await SecureStore.deleteItemAsync(PENDING_KEY).catch(() => undefined);
    return null;
  }
}

export async function completePendingPairing(): Promise<void> {
  const pending = await loadPendingPairing();
  if (!pending) throw new RemoteApiError("pairing_expired", 410, "pairing_expired");

  const result = await request<PairCompleteResponse>("/api/pair/complete", {
    method: "POST",
    body: { pendingSecret: pending.pendingSecret },
  });

  try {
    await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, result.deviceToken);
    await SecureStore.deleteItemAsync(PENDING_KEY);
  } catch {
    throw new RemoteApiError("secure_storage_write_failed", 0, "secure_storage_write_failed");
  }
}

export async function hasPairedDevice(): Promise<boolean> {
  return (await SecureStore.getItemAsync(DEVICE_TOKEN_KEY)) !== null;
}

export async function revokeThisDevice(): Promise<void> {
  const token = await SecureStore.getItemAsync(DEVICE_TOKEN_KEY);
  if (!token) {
    await SecureStore.deleteItemAsync(PENDING_KEY);
    return;
  }

  try {
    await request<{ revoked: boolean }>("/api/device/unpair", {
      method: "POST",
      body: {},
      token,
    });
  } catch (error) {
    // A controller may already have revoked the pairing. Clear the stale local credential.
    if (!(error instanceof RemoteApiError) || !["unauthorized", "not_paired"].includes(error.code)) {
      throw error;
    }
  }

  await SecureStore.deleteItemAsync(DEVICE_TOKEN_KEY);
  await SecureStore.deleteItemAsync(PENDING_KEY);
}


export interface RemoteDeviceCommand {
  id: string;
  type: "status";
  payload: Record<string, never>;
}

export async function pollDeviceCommands(): Promise<number> {
  const token = await SecureStore.getItemAsync(DEVICE_TOKEN_KEY);
  if (!token) return 0;

  let result: { commands: RemoteDeviceCommand[] };
  try {
    result = await request<{ commands: RemoteDeviceCommand[] }>("/api/device/commands", { token });
  } catch (error) {
    if (error instanceof RemoteApiError && ["unauthorized", "not_paired"].includes(error.code)) {
      await SecureStore.deleteItemAsync(DEVICE_TOKEN_KEY);
    }
    throw error;
  }

  let processed = 0;
  for (const command of result.commands) {
    if (command.type === "status") {
      const deviceStatus = {
        platform: "android",
        appVersion: "1.0.0",
        clientState: "foreground_only",
      };
      await request("/api/device/ack", {
        method: "POST",
        token,
        body: {
          commandId: command.id,
          status: "completed",
          result: JSON.stringify(deviceStatus),
        },
      });
      processed += 1;
    }
  }
  return processed;
}
