# Binary-Calc Remote (free-tier backend)

This directory contains the source for the Cloudflare Worker currently used by the Binary-Calc Remote prototype.

## Free-first architecture

- Cloudflare Workers Free handles the HTTPS API.
- One SQLite-backed Durable Object stores pairing metadata, hashed credentials, a bounded command queue, and acknowledgements.
- **No R2 bucket, paid storage, public file bucket, or cloud file archive is used.**
- File contents are not stored by this backend. File transfer will be implemented as an authenticated, chunked relay only after the Android client has explicit user-granted Storage Access Framework (SAF) access.

## Current API phase

1. `POST /api/pair/create` — Android client creates a five-minute pairing session. The returned eight-digit code is shown to the user; the pending secret stays on the phone.
2. `POST /api/pair/claim` — the controller submits the code and receives a one-time controller token.
3. `POST /api/pair/complete` — the phone exchanges its pending secret for a one-time device token after the controller claims the code.
4. `POST /api/controller/command` — queue one allowlisted command.
5. `GET /api/device/commands` — the authenticated phone retrieves queued commands.
6. `POST /api/device/ack` — the phone reports completion, failure, or a need for user approval.
7. `GET /api/controller/commands` — controller checks device heartbeat and command results.
8. `POST /api/controller/revoke` — revoke the current pairing.

All token values are returned once and must be stored in platform secure storage. Only SHA-256 hashes are persisted by the Durable Object. Pairing codes expire after five minutes and allow at most five incorrect attempts.

## Command safety boundary

The backend accepts only these command names:

- `status`


The server currently accepts only `status`, because that is the only command implemented by the mobile client. File listing, file creation, and file reading remain disabled until Android Storage Access Framework grants are implemented and tested. The server does not execute shell commands or access a phone filesystem. Future file operations must resolve opaque grant IDs only through user-selected SAF URIs and must never access other apps' private data or protected system files.

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
- The app polls for status commands every 15 seconds only while the Remote Access screen is visible and the app is foregrounded. It acknowledges the status command and reports the last-seen heartbeat.
- The controller can queue a status check and refresh the device's online state. It cannot browse or change files yet.
- Revoke from either side to invalidate the pairing. A revoked device credential is cleared locally when the phone receives the unauthorized response.

## Android limitations

A powered-off phone cannot receive commands. Android may also pause background work under Doze, battery optimization, force-stop, or vendor restrictions. The current mobile implementation polls only while the Remote Access screen is visible; it is not a background service and does not claim uninterrupted connectivity. A visible foreground service and push-assisted reconnect will be evaluated in the Android-native phase.

## Testing

Run `npm test` from the repository root. Protocol tests cover pairing-code format, command allowlisting, grant identifiers, safe names, and bounded text payloads.
