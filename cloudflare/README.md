# Binary-Calc Remote (free-tier backend)

This directory contains the source for the Cloudflare Worker currently used by the Binary-Calc Remote prototype.

## Free-first architecture

- Cloudflare Workers Free handles the HTTPS API.
- One SQLite-backed Durable Object stores pairing metadata, hashed credentials, a bounded command queue, and acknowledgements.
- **No R2 bucket, paid storage, public file bucket, or cloud file archive is used.**
- File contents are not stored by this backend. The phone grants access only to folders explicitly selected through Android Storage Access Framework (SAF).

## Current API phase

1. `POST /api/pair/create` — Android client creates a five-minute pairing session. The returned eight-digit code is shown to the user; the pending secret stays on the phone.
2. `POST /api/pair/claim` — the controller submits the code and receives a one-time controller token.
3. `POST /api/pair/complete` — the phone exchanges its pending secret for a one-time device token after the controller claims the code.
4. `POST /api/controller/command` — queue one allowlisted command.
5. `GET /api/device/commands` — the authenticated phone retrieves queued commands.
6. `POST /api/device/ack` — the phone reports completion, failure, or a need for user approval.
7. `GET /api/controller/commands` — controller checks device heartbeat and command results.
8. `POST /api/controller/revoke` — revoke the current pairing from the browser.
9. `POST /api/device/unpair` — revoke the current pairing from the phone.

The device token is returned once and stored in Android SecureStore. The controller token is returned once and kept in the browser tab's session storage. Only SHA-256 hashes are persisted by the Durable Object. Pairing codes expire after five minutes and allow at most five incorrect attempts.

## Command safety boundary

The backend accepts only these command names:

- `status`
- `list_granted_directory`
- `create_directory`
- `create_text_file`
- `read_granted_file`

The Android client stores up to three user-selected SAF folder grants in SecureStore. Remote paths are relative to one of those grants; traversal, absolute paths, and unapproved roots are rejected. The controller can list entries, create subfolders and small text files, and preview small text files with approved extensions. Text previews are limited to 2,500 bytes. Binary files, photos, deletion, shell commands, and access to other apps' private data or protected system files are not enabled.

## Deployment requirements

The existing Worker must have the existing SQLite-backed Durable Object binding:

- binding: `REMOTE_HUB`
- class: `RemoteHub`
- namespace: `binary-calc-remote_RemoteHub`

Deploy `worker.js` as the main module and upload `protocol.mjs` as a module dependency. Keep the Worker HTTPS-only. Do not add a shared master token to the APK.

## Controller dashboard and current mobile behavior

- Open the Worker root URL in a browser to use the self-hosted controller dashboard.
- Enter the one-time code shown by Binary-Calc. The controller token is stored in that browser tab's session storage.
- Return to the phone and tap **Finish pairing**. The device token is stored with Expo SecureStore.
- The app polls for commands every 15 seconds only while the Remote Access screen is visible and the app is foregrounded.
- The controller can list approved folders, navigate subfolders, create folders and small text files, and preview small text files. The controller must refresh after the phone processes each queued command.
- Revoke from either side to invalidate the pairing. A revoked device credential is cleared locally when the phone receives the unauthorized response.

## Android limitations

A powered-off phone cannot receive commands. Android may also pause background work under Doze, battery optimization, force-stop, or vendor restrictions. The current mobile implementation polls only while the Remote Access screen is visible; it is not a background service and does not claim uninterrupted connectivity. A visible foreground service and push-assisted reconnect will be evaluated in the Android-native phase.

## Testing

Run `npm test` from the repository root. Protocol tests cover pairing-code format, strict command allowlisting, safe grant identifiers and relative paths, file names, and device-name sanitization.
