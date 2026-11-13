# Supabase remote access foundation

This directory documents Binary-Calc's optional multi-device remote-access feature.

## Architecture
- Auth: one owner account is used on the web dashboard and the owner's phones.
- Postgres: device inventory, approved folder metadata, and remote commands.
- Realtime: device and command updates.
- FCM: optional push notifications for command delivery.

Binary image/file transfer and cloud file storage have been intentionally removed. The application retains only user-approved folder metadata and limited text/directory commands. No binary file, photo, or media upload/download is implemented.

## Privacy and safety
- The app uses only the public Supabase publishable key; RLS enforces owner-scoped access.
- Raw Android SAF content URIs remain on the device.
- The server stores only approved folder labels, opaque grant IDs, and one-way fingerprints.
- No shell commands, arbitrary paths, hidden collection, or access to other apps' private data are supported.
- Commands run while the app is active. Realtime/FCM do not guarantee delivery to a powered-off or force-stopped phone.

## Migrations
The initial migrations establish device registration, approved folder metadata, commands, and owner-scoped RLS. The later remove_binary_file_transfers migration removes the transfer table and private storage bucket after confirming they contain no records or objects.

Never add a Supabase service-role or secret key to the app, web bundle, or repository.
