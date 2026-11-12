import { DurableObject } from "cloudflare:workers";
import {
  isRecord,
  isValidPairCode,
  sanitizeDeviceName,
  validateRemoteCommand,
} from "./protocol.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const randomToken = (bytes = 32) => {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
};

const randomPairCode = () => {
  const data = crypto.getRandomValues(new Uint32Array(1));
  return String(data[0] % 100_000_000).padStart(8, "0");
};

const hash = async (value) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const equalHash = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
};

const readJson = async (request, maxBytes = 16_384) => {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) return { error: "request_too_large" };
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) return { error: "request_too_large" };
  try {
    const value = JSON.parse(text);
    return isRecord(value) ? { value } : { error: "invalid_json_body" };
  } catch {
    return { error: "invalid_json_body" };
  }
};

const bearer = (request) => {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
};

const hub = (env) => env.REMOTE_HUB.getByName("primary");

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        service: "binary-calc-remote",
        status: "online",
        protocol: "v1",
        pairing: "available",
        command_queue: "available",
        file_transfer: "not_enabled_until_android_storage_grants",
        storage: "durable-object-metadata-only",
      });
    }

    const routes = new Set([
      "POST /api/pair/create",
      "POST /api/pair/claim",
      "POST /api/pair/complete",
      "POST /api/controller/command",
      "GET /api/controller/commands",
      "POST /api/controller/revoke",
      "GET /api/device/commands",
      "POST /api/device/ack",
    ]);
    if (!routes.has(request.method + " " + url.pathname)) {
      return json({ error: "not_found" }, 404);
    }

    let body = {};
    if (request.method === "POST") {
      const parsed = await readJson(request);
      if (parsed.error) return json({ error: parsed.error }, 400);
      body = parsed.value;
    }

    const forwarded = new Request("https://remote-hub.internal" + url.pathname + url.search, {
      method: request.method,
      headers: {
        "content-type": "application/json",
        authorization: request.headers.get("authorization") || "",
      },
      body: request.method === "POST" ? JSON.stringify(body) : undefined,
    });
    return hub(env).fetch(forwarded);
  },
};

export class RemoteHub extends DurableObject {
  async loadState() {
    return (await this.ctx.storage.get("remote-state")) || null;
  }

  async saveState(state) {
    await this.ctx.storage.put("remote-state", state);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const route = url.pathname;
    let state = await this.loadState();

    if (route === "/api/pair/create" && request.method === "POST") {
      const now = Date.now();
      const pairLockUntil = (await this.ctx.storage.get("pair-lock-until")) || 0;
      const lastPairCreateAt = (await this.ctx.storage.get("pair-create-at")) || 0;
      if (pairLockUntil > now) return json({ error: "pairing_temporarily_locked" }, 429);
      if (lastPairCreateAt > now - 30_000) return json({ error: "pairing_rate_limited" }, 429);
      if (state && !state.revoked && state.pairedAt) {
        return json({ error: "device_already_paired", action: "revoke_existing_pairing_first" }, 409);
      }
      if (state && !state.revoked && state.pendingExpiresAt > Date.now()) {
        return json({ error: "pairing_already_pending" }, 409);
      }
      const parsed = await readJson(request);
      if (parsed.error || !isRecord(parsed.value)) return json({ error: "invalid_request" }, 400);
      const code = randomPairCode();
      const pendingSecret = randomToken();
      await this.ctx.storage.put("pair-create-at", now);
      state = {
        deviceName: sanitizeDeviceName(parsed.value.deviceName),
        pairCodeHash: await hash(code),
        pendingSecretHash: await hash(pendingSecret),
        pendingExpiresAt: Date.now() + 5 * 60_000,
        failedAttempts: 0,
        controllerTokenHash: null,
        deviceTokenHash: null,
        pairedAt: null,
        deviceLastSeenAt: null,
        commands: [],
        revoked: false,
      };
      await this.saveState(state);
      return json({ pairCode: code, pendingSecret, expiresInSeconds: 300 });
    }

    if (route === "/api/pair/claim" && request.method === "POST") {
      const parsed = await readJson(request);
      const value = parsed.value;
      if (parsed.error || !isRecord(value) || !isValidPairCode(value.pairCode)) {
        return json({ error: "invalid_pair_code" }, 400);
      }
      if (!state || state.revoked || state.pendingExpiresAt <= Date.now()) {
        return json({ error: "pairing_expired" }, 410);
      }
      if (state.failedAttempts >= 5) return json({ error: "pairing_locked" }, 429);
      const suppliedHash = await hash(value.pairCode);
      if (!equalHash(suppliedHash, state.pairCodeHash)) {
        state.failedAttempts += 1;
        if (state.failedAttempts >= 5) {
          state.pendingExpiresAt = 0;
          await this.ctx.storage.put("pair-lock-until", Date.now() + 10 * 60_000);
        }
        await this.saveState(state);
        return json({ error: "invalid_pair_code" }, state.failedAttempts >= 5 ? 429 : 401);
      }
      if (state.pairedAt || state.controllerTokenHash) return json({ error: "pairing_already_claimed" }, 409);
      const controllerToken = randomToken();
      state.controllerTokenHash = await hash(controllerToken);
      state.pairedAt = Date.now();
      state.pairCodeHash = null;
      await this.saveState(state);
      return json({ controllerToken, deviceName: state.deviceName, note: "Store this token securely; it is shown only once." });
    }

    if (route === "/api/pair/complete" && request.method === "POST") {
      const parsed = await readJson(request);
      const value = parsed.value;
      if (parsed.error || !isRecord(value) || typeof value.pendingSecret !== "string") {
        return json({ error: "invalid_request" }, 400);
      }
      if (!state || state.revoked || !state.pairedAt || state.pendingExpiresAt <= Date.now()) {
        return json({ error: "pairing_not_claimed_or_expired" }, 409);
      }
      if (!equalHash(await hash(value.pendingSecret), state.pendingSecretHash)) {
        return json({ error: "unauthorized" }, 401);
      }
      if (state.deviceTokenHash) return json({ error: "device_token_already_issued" }, 409);
      const deviceToken = randomToken();
      state.deviceTokenHash = await hash(deviceToken);
      state.pendingSecretHash = null;
      state.pendingExpiresAt = 0;
      state.deviceLastSeenAt = Date.now();
      await this.saveState(state);
      return json({ deviceToken, note: "Store this token in Android Keystore or encrypted secure storage." });
    }

    if (route === "/api/controller/command" && request.method === "POST") {
      if (!state || state.revoked || !state.controllerTokenHash) return json({ error: "not_paired" }, 403);
      if (!equalHash(await hash(bearer(request)), state.controllerTokenHash)) return json({ error: "unauthorized" }, 401);
      const parsed = await readJson(request);
      const value = parsed.value;
      if (parsed.error || !isRecord(value) || !validateRemoteCommand(value.command).valid) {
        return json({ error: "invalid_or_unsupported_command" }, 400);
      }
      const requestId = typeof value.requestId === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(value.requestId)
        ? value.requestId
        : null;
      if (requestId) {
        const existing = state.commands.find((item) => item.requestId === requestId);
        if (existing) return json({ commandId: existing.id, status: existing.status, duplicate: true });
      }
      state.commands = state.commands.filter((item) => item.status === "queued" || item.createdAt > Date.now() - 24 * 60 * 60_000);
      if (state.commands.filter((item) => item.status === "queued").length >= 25) {
        return json({ error: "command_queue_full" }, 429);
      }
      const command = {
        id: crypto.randomUUID(),
        requestId,
        type: value.command.type,
        payload: value.command.payload,
        status: "queued",
        createdAt: Date.now(),
        lastSentAt: 0,
        completedAt: null,
        result: null,
      };
      state.commands.push(command);
      await this.saveState(state);
      return json({ commandId: command.id, status: command.status }, 202);
    }

    if (route === "/api/controller/commands" && request.method === "GET") {
      if (!state || state.revoked || !state.controllerTokenHash) return json({ error: "not_paired" }, 403);
      if (!equalHash(await hash(bearer(request)), state.controllerTokenHash)) return json({ error: "unauthorized" }, 401);
      return json({
        device: {
          name: state.deviceName,
          online: Boolean(state.deviceLastSeenAt && Date.now() - state.deviceLastSeenAt < 90_000),
          lastSeenAt: state.deviceLastSeenAt,
        },
        commands: (state.commands || []).slice(-30).map(({ id, requestId, type, status, createdAt, completedAt, result }) => ({
          id, requestId, type, status, createdAt, completedAt, result,
        })),
      });
    }

    if (route === "/api/controller/revoke" && request.method === "POST") {
      if (!state || state.revoked || !state.controllerTokenHash) return json({ error: "not_paired" }, 403);
      if (!equalHash(await hash(bearer(request)), state.controllerTokenHash)) return json({ error: "unauthorized" }, 401);
      await this.saveState({ revoked: true, commands: [], pendingExpiresAt: 0 });
      return json({ revoked: true });
    }

    if (route === "/api/device/commands" && request.method === "GET") {
      if (!state || state.revoked || !state.deviceTokenHash) return json({ error: "not_paired" }, 403);
      if (!equalHash(await hash(bearer(request)), state.deviceTokenHash)) return json({ error: "unauthorized" }, 401);
      state.deviceLastSeenAt = Date.now();
      const commands = state.commands.filter((item) =>
        item.status === "queued" && (!item.lastSentAt || Date.now() - item.lastSentAt > 20_000),
      ).slice(0, 10);
      for (const command of commands) command.lastSentAt = Date.now();
      await this.saveState(state);
      return json({ serverTime: Date.now(), commands });
    }

    if (route === "/api/device/ack" && request.method === "POST") {
      if (!state || state.revoked || !state.deviceTokenHash) return json({ error: "not_paired" }, 403);
      if (!equalHash(await hash(bearer(request)), state.deviceTokenHash)) return json({ error: "unauthorized" }, 401);
      const parsed = await readJson(request);
      const value = parsed.value;
      if (parsed.error || !isRecord(value) || typeof value.commandId !== "string" ||
          !["completed", "failed", "needs_user_approval"].includes(value.status)) {
        return json({ error: "invalid_acknowledgement" }, 400);
      }
      const command = state.commands.find((item) => item.id === value.commandId);
      if (!command) return json({ error: "command_not_found" }, 404);
      if (command.status !== "queued") return json({ error: "command_already_finished" }, 409);
      command.status = value.status;
      command.completedAt = Date.now();
      command.result = typeof value.result === "string" ? value.result.slice(0, 1_000) : null;
      state.deviceLastSeenAt = Date.now();
      await this.saveState(state);
      return json({ acknowledged: true, commandId: command.id, status: command.status });
    }

    return json({ error: "not_found" }, 404);
  }
}
