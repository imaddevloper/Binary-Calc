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

test("SAF commands require a scoped grant and safe relative paths", () => {
  assert.equal(validateRemoteCommand({
    type: "list_granted_directory",
    payload: { grantId: "grant_123456", path: "" },
  }).valid, true);
  assert.equal(validateRemoteCommand({
    type: "list_granted_directory",
    payload: { grantId: "grant_123456", path: "Photos/2026" },
  }).valid, true);
  assert.equal(validateRemoteCommand({
    type: "list_granted_directory",
    payload: { grantId: "grant_123456", path: "../private" },
  }).valid, false);
  assert.equal(validateRemoteCommand({
    type: "create_directory",
    payload: { grantId: "grant_123456", parentPath: "Documents", name: "NewFolder" },
  }).valid, true);
  assert.equal(validateRemoteCommand({
    type: "create_directory",
    payload: { grantId: "grant_123456", parentPath: "../../", name: "NewFolder" },
  }).valid, false);
  assert.equal(validateRemoteCommand({
    type: "create_text_file",
    payload: { grantId: "grant_123456", parentPath: "", name: "note.txt", content: "hello" },
  }).valid, true);
  assert.equal(validateRemoteCommand({
    type: "create_text_file",
    payload: { grantId: "grant_123456", parentPath: "", name: "../note.txt", content: "hello" },
  }).valid, false);
  assert.equal(validateRemoteCommand({
    type: "create_text_file",
    payload: { grantId: "grant_123456", parentPath: "", name: "note.txt", content: "x".repeat(4097) },
  }).valid, false);
  assert.equal(validateRemoteCommand({
    type: "read_granted_file",
    payload: { grantId: "grant_123456", path: "notes/readme.txt" },
  }).valid, true);
  assert.equal(validateRemoteCommand({
    type: "read_granted_file",
    payload: { grantId: "grant_123456", path: "" },
  }).valid, false);
});

test("status command accepts only an empty payload and exact top-level keys", () => {
  assert.equal(validateRemoteCommand({ type: "status", payload: {} }).valid, true);
  assert.equal(validateRemoteCommand({ type: "status", payload: { path: "/" } }).valid, false);
  assert.equal(validateRemoteCommand({ type: "status", payload: {}, shell: "id" }).valid, false);
});

test("device names are bounded and stripped of control characters", () => {
  assert.equal(sanitizeDeviceName("  Redmi 10\u0000 "), "Redmi 10");
  assert.equal(sanitizeDeviceName("x".repeat(80)).length, 48);
  assert.equal(sanitizeDeviceName(null), "Android device");
  assert.equal(isRecord([]), false);
});
