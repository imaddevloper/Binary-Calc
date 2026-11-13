-- Secondary indexes added after initial remote access foundation.
create index remote_folder_grants_owner_id_idx on public.remote_folder_grants(owner_id);
create index remote_folder_grants_device_owner_idx on public.remote_folder_grants(device_id,owner_id);
create index remote_commands_created_by_idx on public.remote_commands(created_by);
create index remote_commands_device_owner_idx on public.remote_commands(device_id,owner_id);
create index remote_file_transfers_device_owner_idx on public.remote_file_transfers(device_id,owner_id);
