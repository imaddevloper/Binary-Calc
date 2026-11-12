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
- `list_granted_directory`
- `create_directory`
- `create_text_file`
- `read_granted_file`

The server does not execute shell commands and does not access a phone filesystem. The future Android client must resolve opaque grant IDs only through user-selected SAF URIs. It must not access other apps' private data or protected system files. Destructive actions are intentionally absent from this first protocol phase.

## Deployment requirements

The existing Worker must have the existing SQLite-backed Durable Object binding:

- binding: `REMOTE_HUB`
- class: `RemoteHub`
- namespace: `binary-calc-remote_RemoteHub`

Deploy `worker.js` as the main module and upload `protocol.mjs` as a module dependency. Keep the Worker HTTPS-only. Do not add a shared master token to the APK.

## Android limitations

A powered-off phone cannot receive commands. Android may also pause background work under Doze, battery optimization, force-stop, or vendor restrictions. This API phase uses bounded polling; it is not a claim of uninterrupted background connectivity. A visible foreground service and push-assisted reconnect will be evaluated in the Android-native phase.

## Testing

Run `npm test` from the repository root. Protocol tests cover pairing-code format, command allowlisting, grant identifiers, safe names, and bounded text payloads.
