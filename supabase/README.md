# Supabase remote access foundation

This directory contains the first migration for Binary-Calc's optional multi-device remote-access feature.

## Architecture decision

Use one Supabase project for:
- **Auth**: the owner signs in on each phone and in the web dashboard using the same account.
- **Postgres**: device inventory, folder-grant metadata, remote commands, and transfer metadata.
- **Realtime**: live command and device-status updates.
- **Storage**: private file objects, protected by Storage RLS.
- **Edge Functions (next stage)**: trusted operations such as push delivery, cleanup, and signed transfer workflows.

The previous Cloudflare Worker remote backend is not part of this new path. The existing Firebase Android configuration may remain only for Android push delivery (FCM); Firebase is not used as the database or file backend.

## Why same-account sign-in first?

It is the simplest reliable pairing model for a personal multi-phone setup: sign in to the same owner account on every phone. Each installation registers a separate device row. The dashboard can target one device or all devices. We avoid a second custom pairing-token protocol in the first iteration.

This means every signed-in device belongs to the same trusted account. Protect the account with a strong password and do not sign in on devices you do not control. A later release can add device-specific authorization if the threat model requires it.

## Migration

Apply migrations in order using the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Or paste the migration file into the Supabase SQL Editor:

`migrations/20261113090000_remote_access_foundation.sql`

The migration creates:
- `remote_devices`
- `remote_folder_grants`
- `remote_commands`
- `remote_file_transfers`
- Private Storage bucket `binary-calc-device-files` (50 MiB per object)
- Row Level Security policies and Realtime publication entries

## Storage object path

Use this shape for every private object:

```text
<auth-user-id>/<device-id>/<transfer-id>/<safe-file-name>
```

Never put a raw Android Storage Access Framework URI in Postgres. Keep the actual persisted SAF permission/URI on the originating phone in secure local storage. The database stores only the folder label and a one-way fingerprint.

## Client configuration

The next client integration stage will use only public client configuration:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

A publishable key is intended for the client, but it is **not** an authorization boundary: RLS is. Never add a Supabase `service_role` or secret key to the app, web bundle, GitHub, or a Python script distributed to users.

## File-transfer safeguards

- Files are uploaded only after a user explicitly selects them or approves a previously granted folder.
- Private Storage only; no public bucket.
- Per-object upload cap is currently 50 MiB.
- Transfer metadata expires after 24 hours by default; a scheduled cleanup function is still required before production.
- The app must validate file size, MIME type, safe display name, destination grant, and checksum.
- Do not allow shell commands, arbitrary paths, hidden file collection, or access to another app's private data.

## Push and background behavior

Realtime works while a client has an active network connection and subscription. It is not a guaranteed wake-up mechanism for a suspended Android app. Android push notifications (FCM/Expo Push) are a separate delivery path and will be implemented in a later stage. A powered-off phone, force-stopped app, or unavailable network cannot receive commands.

## Python

Python is not required inside the Android application. If useful, a later optional desktop utility can use the official Supabase Python client for authenticated export/download and checksum verification. It must use a user session or short-lived signed URLs; never ship a service-role key in that utility.

## Status

This is a database/storage foundation only. It does not yet add the Supabase client to the app, implement login/device registration, implement command processing, send push notifications, or transfer files end-to-end. Do not merge into `main` until those stages and the Android device tests pass.
