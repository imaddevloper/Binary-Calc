import test from "node:test";
import assert from "node:assert/strict";
import {
  COMMAND_TYPES,
  isRecord,
  isSafeFileName,
  isSafeGrantId,
  isValidPairCode,
  sanitizeDeviceName,
  validateRemoteCommand,
} from "../cloudflare/protocol.mjs";

test("pairing codes must be exactly eight decimal digits", () => {
  assert.equal(isValidPairCode("01234567"), true);
  assert.equal(isValidPairCode("1234567"), false);
  assert.equal(isValidPairCode("1234567x"), false);
});

test("remote command allowlist excludes arbitrary commands", () => {
  assert.deepEqual(COMMAND_TYPES, ["status"]);
  assert.equal(validateRemoteCommand({ type: "shell", payload: { command: "id" } }).valid, false);
});

test("only opaque user-granted identifiers are accepted", () => {
  assert.equal(isSafeGrantId("grant_123456"), true);
  assert.equal(isSafeGrantId("../../private"), false);
  assert.equal(isSafeGrantId(""), false);
});

test("file names reject traversal, separators, and control characters", () => {
  assert.equal(isSafeFileName("notes.txt"), true);
  assert.equal(isSafeFileName("../notes.txt"), false);
  assert.equal(isSafeFileName("folder/file.txt"), false);
  assert.equal(isSafeFileName("bad\u0000name"), false);
});

test("file commands stay disabled until Android user-granted storage access exists", () => {
  assert.equal(validateRemoteCommand({
    type: "list_granted_directory",
    payload: { directoryId: "grant_123456" },
  }).valid, false);
  assert.equal(validateRemoteCommand({
    type: "create_directory",
    payload: { parentId: "grant_123456", name: "Documents" },
  }).valid, false);
  assert.equal(validateRemoteCommand({
    type: "create_text_file",
    payload: { parentId: "grant_123456", name: "note.txt", content: "hello" },
  }).valid, false);
  assert.equal(validateRemoteCommand({
    type: "read_granted_file",
    payload: { fileId: "grant_123456" },
  }).valid, false);
});

test("device names are bounded and stripped of control characters", () => {
  assert.equal(sanitizeDeviceName("  Redmi 10\u0000 "), "Redmi 10");
  assert.equal(sanitizeDeviceName("x".repeat(80)).length, 48);
  assert.equal(sanitizeDeviceName(null), "Android device");
  assert.equal(isRecord([]), false);
});
