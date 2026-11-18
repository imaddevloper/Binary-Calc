-- Binary-Calc remote access foundation. Apply with Supabase migrations.
create extension if not exists pgcrypto;

create table public.remote_devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  installation_id uuid not null,
  display_name text not null check (char_length(display_name) between 1 and 80),
  platform text not null default 'android' check (platform in ('android','ios','web')),
  app_version text,
  push_token text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, installation_id),
  unique (id, owner_id)
);
create index remote_devices_owner_last_seen_idx on public.remote_devices(owner_id,last_seen_at desc);

create table public.remote_folder_grants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  uri_fingerprint text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  foreign key (device_id,owner_id) references public.remote_devices(id,owner_id) on delete cascade,
  unique (device_id,uri_fingerprint)
);

create table public.remote_commands (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  command_type text not null check (command_type in ('ping','get_status','list_granted_folder','read_granted_file','create_folder','create_text_file','upload_selected_file','download_shared_file')),
  payload jsonb not null default '{}'::jsonb check (pg_column_size(payload) <= 16384),
  result jsonb check (result is null or pg_column_size(result) <= 16384),
  status text not null default 'pending' check (status in ('pending','claimed','completed','failed','cancelled','expired')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  foreign key (device_id,owner_id) references public.remote_devices(id,owner_id) on delete cascade
);
create index remote_commands_device_pending_idx on public.remote_commands(device_id,status,created_at desc);
create index remote_commands_owner_created_idx on public.remote_commands(owner_id,created_at desc);

create table public.remote_file_transfers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  direction text not null check (direction in ('from_device','to_device')),
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text check (mime_type is null or char_length(mime_type) <= 127),
  size_bytes bigint not null check (size_bytes between 0 and 52428800),
  sha256 text check (sha256 is null or sha256 ~ '^[a-fA-F0-9]{64}$'),
  object_path text not null unique,
  status text not null default 'pending' check (status in ('pending','uploading','available','downloading','completed','failed','expired','cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  foreign key (device_id,owner_id) references public.remote_devices(id,owner_id) on delete cascade,
  check (object_path like owner_id::text || '/' || device_id::text || '/' || id::text || '/%')
);
create index remote_file_transfers_owner_created_idx on public.remote_file_transfers(owner_id,created_at desc);

alter table public.remote_devices enable row level security;
alter table public.remote_folder_grants enable row level security;
alter table public.remote_commands enable row level security;
alter table public.remote_file_transfers enable row level security;

grant select,insert,update,delete on public.remote_devices to authenticated;
grant select,insert,update,delete on public.remote_folder_grants to authenticated;
grant select,insert,update,delete on public.remote_commands to authenticated;
grant select,insert,update,delete on public.remote_file_transfers to authenticated;

create policy remote_devices_owner_all on public.remote_devices for all to authenticated
using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy remote_folder_grants_owner_all on public.remote_folder_grants for all to authenticated
using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy remote_commands_owner_all on public.remote_commands for all to authenticated
using (owner_id=(select auth.uid()))
with check (owner_id=(select auth.uid()) and created_by=(select auth.uid()));
create policy remote_file_transfers_owner_all on public.remote_file_transfers for all to authenticated
using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit)
values ('binary-calc-device-files','binary-calc-device-files',false,52428800);

create policy binary_calc_private_files_read on storage.objects for select to authenticated
using (bucket_id='binary-calc-device-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy binary_calc_private_files_insert on storage.objects for insert to authenticated
with check (
  bucket_id='binary-calc-device-files'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (
    select 1 from public.remote_devices d
    where d.id::text=(storage.foldername(name))[2] and d.owner_id=(select auth.uid())
  )
);
create policy binary_calc_private_files_update on storage.objects for update to authenticated
using (bucket_id='binary-calc-device-files' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='binary-calc-device-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy binary_calc_private_files_delete on storage.objects for delete to authenticated
using (bucket_id='binary-calc-device-files' and (storage.foldername(name))[1]=(select auth.uid())::text);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='remote_commands') then
    alter publication supabase_realtime add table public.remote_commands;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='remote_devices') then
    alter publication supabase_realtime add table public.remote_devices;
  end if;
end $$;
