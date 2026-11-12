export const COMMAND_TYPES = Object.freeze([
  "status",
  "list_granted_directory",
  "create_directory",
  "create_text_file",
  "read_granted_file",
]);

const MAX_TEXT_FILE_CHARS = 4_096;
const MAX_COMMAND_JSON_CHARS = 8_192;
const SAFE_ID = /^[A-Za-z0-9_-]{8,128}$/;
const SAFE_NAME = /^(?!\\.\\.?$)[^\\u0000-\\u001f\\u007f/\\\\]{1,120}$/;

export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidPairCode(value) {
  return typeof value === "string" && /^\\d{8}$/.test(value);
}

export function isSafeGrantId(value) {
  return typeof value === "string" && SAFE_ID.test(value);
}

export function isSafeFileName(value) {
  return typeof value === "string" && SAFE_NAME.test(value) && !value.includes("..");
}

export function validateRemoteCommand(value) {
  if (!isRecord(value) || !COMMAND_TYPES.includes(value.type) || !isRecord(value.payload)) {
    return { valid: false, reason: "unsupported_command" };
  }

  let valid = false;
  const p = value.payload;

  switch (value.type) {
    case "status":
      valid = Object.keys(p).length === 0;
      break;
    case "list_granted_directory":
      valid = isSafeGrantId(p.directoryId);
      break;
    case "create_directory":
      valid = isSafeGrantId(p.parentId) && isSafeFileName(p.name);
      break;
    case "create_text_file":
      valid =
        isSafeGrantId(p.parentId) &&
        isSafeFileName(p.name) &&
        typeof p.content === "string" &&
        p.content.length <= MAX_TEXT_FILE_CHARS;
      break;
    case "read_granted_file":
      valid = isSafeGrantId(p.fileId);
      break;
  }

  if (!valid) return { valid: false, reason: "invalid_command_payload" };
  if (JSON.stringify(value).length > MAX_COMMAND_JSON_CHARS) {
    return { valid: false, reason: "command_too_large" };
  }
  return { valid: true };
}

export function sanitizeDeviceName(value) {
  if (typeof value !== "string") return "Android device";
  const cleaned = value.replace(/[\\u0000-\\u001f\\u007f]/g, "").trim().slice(0, 48);
  return cleaned || "Android device";
}
