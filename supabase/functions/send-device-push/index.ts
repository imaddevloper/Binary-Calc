import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToBytes(pem: string): Uint8Array {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function createGoogleAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = base64Url(new TextEncoder().encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })));
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = await response.json();
  if (!response.ok || typeof body.access_token !== "string") {
    throw new Error("google_oauth_token_failed");
  }
  return body.access_token;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!serviceAccountJson) return json({ error: "fcm_not_configured", detail: "Set FCM_SERVICE_ACCOUNT_JSON in Supabase Edge Function secrets." }, 503);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return json({ error: "supabase_environment_missing" }, 500);

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.project_id) {
      return json({ error: "invalid_fcm_service_account" }, 500);
    }

    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return json({ error: "unauthorized" }, 401);

    const body = await request.json();
    const deviceId = body?.device_id;
    const commandId = body?.command_id;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof deviceId !== "string" || !uuidPattern.test(deviceId) ||
        typeof commandId !== "string" || !uuidPattern.test(commandId)) {
      return json({ error: "invalid_request" }, 400);
    }

    const { data: device, error: deviceError } = await client
      .from("remote_devices")
      .select("id,push_token")
      .eq("id", deviceId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (deviceError || !device) return json({ error: "device_not_found" }, 404);
    if (!device.push_token) return json({ error: "device_push_not_enabled" }, 409);

    const { data: command, error: commandError } = await client
      .from("remote_commands")
      .select("id,status")
      .eq("id", commandId)
      .eq("device_id", deviceId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (commandError || !command) return json({ error: "command_not_found" }, 404);
    if (!["pending", "claimed"].includes(command.status)) {
      return json({ error: "command_not_pending" }, 409);
    }

    const accessToken = await createGoogleAccessToken(serviceAccount);
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: device.push_token,
            notification: {
              title: "Binary-Calc",
              body: "لديك أمر جديد لجهازك",
            },
            data: { type: "remote_command", device_id: deviceId, command_id: commandId },
            android: { priority: "HIGH", ttl: "600s" },
          },
        }),
      },
    );
    const fcmBody = await fcmResponse.json();
    if (!fcmResponse.ok) return json({ error: "fcm_send_failed", details: fcmBody }, 502);
    return json({ ok: true, device_id: deviceId, command_id: commandId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "push_send_failed";
    return json({ error: message.slice(0, 160) }, 500);
  }
});
