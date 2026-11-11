type VercelRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
};

const MAX_IMAGE_BASE64_LENGTH = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// Best-effort per-instance throttling. Use Vercel Firewall or a shared store for
// a hard global limit across serverless instances.
const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_TRACKED_CLIENTS = 5_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidIPv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) =>
    /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255,
  );
}

function extractOutputText(payload: unknown): string {
  if (!isRecord(payload)) return "";
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = payload.output;
  if (!Array.isArray(output)) return "";
  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (isRecord(part) && part.type === "output_text" && typeof part.text === "string") {
        return part.text;
      }
    }
  }
  return "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const forwardedFor = req.headers?.["x-forwarded-for"];
  const clientIp = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  // Drop expired entries periodically and bound memory use on long-lived instances.
  if (requestBuckets.size > MAX_TRACKED_CLIENTS) {
    for (const [key, entry] of requestBuckets) {
      if (entry.resetAt <= now) requestBuckets.delete(key);
    }
    if (requestBuckets.size > MAX_TRACKED_CLIENTS) {
      const oldestKey = requestBuckets.keys().next().value;
      if (oldestKey) requestBuckets.delete(oldestKey);
    }
  }
  const bucket = requestBuckets.get(clientIp);
  if (bucket && bucket.resetAt > now && bucket.count >= 10) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (!bucket || bucket.resetAt <= now) requestBuckets.set(clientIp, { count: 1, resetAt: now + 60_000 });
  else bucket.count += 1;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "OCR service is not configured" });

  if (!isRecord(req.body)) return res.status(400).json({ error: "Invalid request body" });
  const { imageBase64, mimeType } = req.body;
  if (
    typeof imageBase64 !== "string" ||
    imageBase64.length === 0 ||
    imageBase64.length > MAX_IMAGE_BASE64_LENGTH ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64) ||
    typeof mimeType !== "string" ||
    !ALLOWED_MIME_TYPES.has(mimeType)
  ) {
    return res.status(400).json({ error: "Invalid image payload" });
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
        store: false,
        max_output_tokens: 500,
        input: [{
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Read all visible text in this image and identify IPv4 addresses only. Return a JSON object exactly in this shape: {\"addresses\":[\"192.0.2.1\"]}. Include only addresses whose four decimal octets are clearly visible. Do not guess, repair, infer, or invent digits. If none are clearly readable, return {\"addresses\":[]}.",
            },
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high",
            },
          ],
        }],
        text: {
          format: {
            type: "json_schema",
            name: "ipv4_ocr_result",
            strict: true,
            schema: {
              type: "object",
              properties: {
                addresses: {
                  type: "array",
                  items: { type: "string", pattern: "^(0|[1-9]\\d{0,2})(\\.(0|[1-9]\\d{0,2})){3}$" },
                },
              },
              required: ["addresses"],
              additionalProperties: false,
            },
          },
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!upstream.ok) {
      return res.status(upstream.status === 429 ? 503 : 502).json({ error: "OCR provider request failed" });
    }

    const payload: unknown = await upstream.json();
    const raw = extractOutputText(payload);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: "OCR provider returned an invalid response" });
    }

    if (!isRecord(parsed) || !Array.isArray(parsed.addresses)) {
      return res.status(502).json({ error: "OCR provider returned an invalid response" });
    }

    const addresses = [...new Set(parsed.addresses.filter(
      (value): value is string =>
        typeof value === "string" &&
        value.length <= 15 &&
        isValidIPv4(value),
    ))].slice(0, 20);

    return res.status(200).json({ addresses });
  } catch {
    return res.status(504).json({ error: "OCR provider timed out or is unavailable" });
  }
}
