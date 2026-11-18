-- Store the opaque local grant identifier so dashboard commands can target
-- the user-approved SAF grant without storing its raw content:// URI.
alter table public.remote_folder_grants
  add column client_grant_id text not null
  check (char_length(client_grant_id) between 1 and 128);

alter table public.remote_folder_grants
  add constraint remote_folder_grants_device_client_grant_key
  unique (device_id, client_grant_id);
