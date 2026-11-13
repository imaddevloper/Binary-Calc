-- Remove the abandoned binary image/file transfer feature.
-- The private bucket was verified empty before this migration was applied.
drop policy if exists binary_calc_private_files_read on storage.objects;
drop policy if exists binary_calc_private_files_insert on storage.objects;
drop policy if exists binary_calc_private_files_update on storage.objects;
drop policy if exists binary_calc_private_files_delete on storage.objects;
-- The empty private bucket is retained because Storage bucket deletion must use the Storage API.
-- All object access policies are removed, so no client can upload or download through it.
alter table public.remote_commands drop constraint if exists remote_commands_command_type_check;
alter table public.remote_commands add constraint remote_commands_command_type_check check (command_type = any (array['ping'::text, 'get_status'::text, 'list_granted_folder'::text, 'read_granted_file'::text, 'create_folder'::text, 'create_text_file'::text]));
drop table if exists public.remote_file_transfers;
