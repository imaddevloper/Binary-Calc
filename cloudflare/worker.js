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
const DASHBOARD_HTML = "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"color-scheme\" content=\"dark light\">\n<title>Binary-Calc Remote</title>\n<style>\n:root{color-scheme:dark;--bg:#0b0b0f;--panel:#15151d;--line:#2b2b38;--text:#f5f5f7;--muted:#a5a5b4;--accent:#7c8cff;--good:#5bd69a;--bad:#ff7777}\n*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at top,#1a1b2b,var(--bg) 55%);color:var(--text);font:16px system-ui,-apple-system,Segoe UI,sans-serif;min-height:100vh;padding:28px 16px}\nmain{width:min(720px,100%);margin:0 auto}.brand{font-size:13px;color:var(--accent);font-weight:700;letter-spacing:.12em;text-transform:uppercase}\nh1{font-size:clamp(28px,6vw,40px);margin:8px 0}p{color:var(--muted);line-height:1.6}\n.card{background:color-mix(in srgb,var(--panel) 94%,transparent);border:1px solid var(--line);border-radius:18px;padding:20px;margin:18px 0;box-shadow:0 14px 40px #0002}\nlabel{display:block;color:var(--muted);font-size:13px;margin:12px 0 7px}\ninput{width:100%;padding:14px;border:1px solid var(--line);border-radius:12px;background:#0e0e15;color:var(--text);font:700 24px ui-monospace,monospace;letter-spacing:.25em;text-align:center}\nbutton{border:0;border-radius:12px;padding:12px 16px;background:var(--accent);color:#080914;font-weight:700;font-size:15px;cursor:pointer;margin:8px 8px 0 0}\nbutton.secondary{background:#242432;color:var(--text);border:1px solid var(--line)}\nbutton.danger{background:#4a2028;color:#ffdce0;border:1px solid #71333e}\nbutton:disabled{opacity:.5;cursor:not-allowed}\n.status{display:inline-flex;align-items:center;gap:8px;padding:7px 10px;border-radius:99px;background:#242432;color:var(--muted);font-size:13px}\n.dot{width:8px;height:8px;border-radius:50%;background:var(--bad)}.dot.online{background:var(--good)}\n.hidden{display:none!important}.error{color:var(--bad);min-height:24px}.muted{color:var(--muted);font-size:13px}\n.command{border-top:1px solid var(--line);padding:12px 0;display:flex;justify-content:space-between;gap:12px;align-items:center}\ncode{font-family:ui-monospace,monospace;color:#cbd0ff;overflow-wrap:anywhere}\nfooter{font-size:12px;color:var(--muted);margin-top:26px}\n</style>\n</head>\n<body>\n<main>\n  <div class=\"brand\">Binary-Calc / Secure link</div>\n  <h1>Remote dashboard</h1>\n  <p>Pair a trusted controller with your phone. The pairing code expires in five minutes. Never enter a code from someone you do not trust.</p>\n  <section class=\"card\" id=\"pairCard\">\n    <h2>Connect a phone</h2>\n    <label for=\"pairCode\">One-time code shown in Binary-Calc</label>\n    <input id=\"pairCode\" inputmode=\"numeric\" autocomplete=\"one-time-code\" maxlength=\"8\" placeholder=\"00000000\">\n    <button id=\"pairBtn\">Pair this browser</button>\n    <div class=\"error\" id=\"pairError\" role=\"alert\"></div>\n    <p class=\"muted\">The controller credential is kept in this browser tab session and is never sent to a third-party service.</p>\n  </section>\n  <section class=\"card hidden\" id=\"controlCard\">\n    <div style=\"display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap\">\n      <h2 style=\"margin:0\">Connected phone</h2>\n      <span class=\"status\"><span class=\"dot\" id=\"onlineDot\"></span><span id=\"onlineText\">Checking</span></span>\n    </div>\n    <p id=\"deviceName\" class=\"muted\"></p>\n    <p class=\"muted\">The phone checks for status commands while the Remote Access screen is open. File browsing and background delivery are not enabled yet.</p>\n    <button id=\"statusBtn\">Request phone status</button>\n    <button id=\"refreshBtn\" class=\"secondary\">Refresh</button>\n    <div id=\"commands\"></div>\n    <button id=\"revokeBtn\" class=\"danger\">Revoke this browser pairing</button>\n    <div class=\"error\" id=\"controlError\" role=\"alert\"></div>\n  </section>\n  <footer>Free-tier prototype · TLS transport · No cloud file archive · Revoke access when finished</footer>\n</main>\n<script>\nconst $ = (id) => document.getElementById(id);\nconst TOKEN_KEY = \"binarycalc.remote.controller.v1\";\nconst API = location.origin;\nconst getToken = () => sessionStorage.getItem(TOKEN_KEY);\nasync function api(path, options = {}) {\n  const response = await fetch(API + path, {\n    method: options.method || \"GET\",\n    headers: {\n      Accept: \"application/json\",\n      ...(options.body === undefined ? {} : {\"Content-Type\":\"application/json\"}),\n      ...(getToken() ? {Authorization:\"Bearer \" + getToken()} : {})\n    },\n    body: options.body === undefined ? undefined : JSON.stringify(options.body)\n  });\n  const data = await response.json().catch(() => ({}));\n  if (!response.ok) throw new Error(data.error || \"request_failed\");\n  return data;\n}\nfunction showConnected() {\n  $(\"pairCard\").classList.add(\"hidden\");\n  $(\"controlCard\").classList.remove(\"hidden\");\n  refresh();\n}\nfunction errorText(error) {\n  const messages = {\n    invalid_pair_code:\"Enter the eight-digit code shown on the phone.\",\n    pairing_expired:\"This code expired. Create a new code on the phone.\",\n    pairing_locked:\"Pairing is temporarily locked after too many attempts.\",\n    pairing_already_claimed:\"This code has already been used.\",\n    not_paired:\"This browser is no longer paired.\",\n    unauthorized:\"Access was revoked or the credential is invalid.\"\n  };\n  return messages[error.message] || \"Could not complete the request. Try again.\";\n}\n$(\"pairBtn\").addEventListener(\"click\", async () => {\n  $(\"pairError\").textContent = \"\";\n  $(\"pairBtn\").disabled = true;\n  try {\n    const pairCode = $(\"pairCode\").value.trim();\n    const result = await api(\"/api/pair/claim\", {method:\"POST\",body:{pairCode}});\n    sessionStorage.setItem(TOKEN_KEY, result.controllerToken);\n    showConnected();\n  } catch (error) {\n    $(\"pairError\").textContent = errorText(error);\n  } finally {\n    $(\"pairBtn\").disabled = false;\n  }\n});\n$(\"pairCode\").addEventListener(\"input\", () => {\n  $(\"pairCode\").value = $(\"pairCode\").value.replace(/\\D/g,\"\").slice(0,8);\n});\nasync function refresh() {\n  $(\"controlError\").textContent = \"\";\n  try {\n    const data = await api(\"/api/controller/commands\");\n    $(\"deviceName\").textContent = data.device.name || \"Android device\";\n    $(\"onlineDot\").classList.toggle(\"online\", !!data.device.online);\n    $(\"onlineText\").textContent = data.device.online ? \"Online\" : \"Waiting for phone\";\n    $(\"commands\").replaceChildren();\n    for (const item of data.commands.slice().reverse()) {\n      const row = document.createElement(\"div\");\n      row.className = \"command\";\n      const left = document.createElement(\"span\");\n      left.textContent = item.type + \" · \" + new Date(item.createdAt).toLocaleTimeString();\n      const right = document.createElement(\"code\");\n      right.textContent = item.status;\n      row.append(left,right);\n      $(\"commands\").append(row);\n    }\n  } catch (error) {\n    $(\"controlError\").textContent = errorText(error);\n    if (error.message === \"unauthorized\" || error.message === \"not_paired\") {\n      sessionStorage.removeItem(TOKEN_KEY);\n      $(\"controlCard\").classList.add(\"hidden\");\n      $(\"pairCard\").classList.remove(\"hidden\");\n    }\n  }\n}\n$(\"statusBtn\").addEventListener(\"click\", async () => {\n  $(\"controlError\").textContent = \"\";\n  try {\n    await api(\"/api/controller/command\", {\n      method:\"POST\",\n      body:{\n        requestId:crypto.randomUUID(),\n        command:{type:\"status\",payload:{}}\n      }\n    });\n    await refresh();\n  } catch (error) {\n    $(\"controlError\").textContent = errorText(error);\n  }\n});\n$(\"refreshBtn\").addEventListener(\"click\", refresh);\n$(\"revokeBtn\").addEventListener(\"click\", async () => {\n  if (!confirm(\"Revoke this browser's access to the phone?\")) return;\n  try {\n    await api(\"/api/controller/revoke\", {method:\"POST\",body:{}});\n    sessionStorage.removeItem(TOKEN_KEY);\n    $(\"controlCard\").classList.add(\"hidden\");\n    $(\"pairCard\").classList.remove(\"hidden\");\n  } catch (error) {\n    $(\"controlError\").textContent = errorText(error);\n  }\n});\nif (getToken()) showConnected();\n</script>\n</body>\n</html>";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if ((url.pathname === "/" || url.pathname === "/dashboard") && request.method === "GET") {
      return new Response(DASHBOARD_HTML, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
          "referrer-policy": "no-referrer",
        },
      });
    }
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
      "POST /api/device/unpair",
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
  constructor(ctx, env) {
    super(ctx, env);
    this.serial = Promise.resolve();
  }

  async fetch(request) {
    const operation = this.serial.then(() => this.handle(request));
    this.serial = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async loadState() {
    return (await this.ctx.storage.get("remote-state")) || null;
  }

  async saveState(state) {
    await this.ctx.storage.put("remote-state", state);
  }

  async handle(request) {
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
      state.commands = state.commands
        .filter((item) => item.status === "queued" || item.createdAt > Date.now() - 24 * 60 * 60_000)
        .slice(-100);
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

    if (route === "/api/device/unpair" && request.method === "POST") {
      if (!state || state.revoked || !state.deviceTokenHash) return json({ error: "not_paired" }, 403);
      if (!equalHash(await hash(bearer(request)), state.deviceTokenHash)) return json({ error: "unauthorized" }, 401);
      await this.saveState({ revoked: true, commands: [], pendingExpiresAt: 0 });
      return json({ revoked: true });
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
