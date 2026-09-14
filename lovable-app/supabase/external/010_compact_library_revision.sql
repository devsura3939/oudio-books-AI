-- Compact account revision, updated transactionally with each library mutation.
-- Additive: existing clients and subscriptions continue to work during rollout.
create table if not exists public.library_revisions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.library_revisions enable row level security;
drop policy if exists library_revision_owner on public.library_revisions;
create policy library_revision_owner on public.library_revisions for select to authenticated
  using (user_id = auth.uid());
grant select on public.library_revisions to authenticated;
revoke insert, update, delete on public.library_revisions from anon, authenticated;

create or replace function public.get_library_revision()
returns text language sql stable security invoker set search_path = public as $$
  select coalesce((select revision::text from public.library_revisions where user_id=auth.uid()), '0');
$$;
revoke all on function public.get_library_revision() from public;
grant execute on function public.get_library_revision() to authenticated;

create or replace function public.bump_library_revision()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  owner_id := case when TG_OP='DELETE' then OLD.user_id else NEW.user_id end;
  -- Account cascade deletion must not recreate a revision for a removed user.
  if exists(select 1 from auth.users where id=owner_id) then
    insert into public.library_revisions(user_id,revision) values(owner_id,1)
    on conflict(user_id) do update set revision=library_revisions.revision+1, updated_at=now();
  end if;
  if TG_OP='UPDATE' and OLD.user_id is distinct from NEW.user_id
     and exists(select 1 from auth.users where id=OLD.user_id) then
    insert into public.library_revisions(user_id,revision) values(OLD.user_id,1)
    on conflict(user_id) do update set revision=library_revisions.revision+1, updated_at=now();
  end if;
  return null;
end $$;
revoke all on function public.bump_library_revision() from public;

do $$ declare table_name text;
begin
  foreach table_name in array array['books','chapters','audio_segments'] loop
    execute format('drop trigger if exists library_revision_changed on public.%I',table_name);
    execute format('create trigger library_revision_changed after insert or update or delete on public.%I for each row execute function public.bump_library_revision()',table_name);
  end loop;
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='library_revisions'
  ) then alter publication supabase_realtime add table public.library_revisions; end if;
end $$;
notify pgrst, 'reload schema';
