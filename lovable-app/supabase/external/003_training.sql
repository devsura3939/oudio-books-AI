-- 003: unique emails, hardcoded admin, and the trainable-engine (Training Lab) schema.
-- Idempotent / re-runnable.

-- ─────────────────────────────────────────── 1. unique emails + hardcoded admin
update public.profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id and (p.email is null or p.email = '');

create unique index if not exists profiles_email_lower_key on public.profiles (lower(email));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''), '@', 1)))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;

  -- Hardcoded owner account gets the admin role automatically.
  if lower(coalesce(new.email, '')) = 'ananiadevsurashvili@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;

-- grant admin to the owner account if it already exists
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users
 where lower(email) = 'ananiadevsurashvili@gmail.com'
on conflict do nothing;

-- ───────────────────────────────────────────────────── 2. engine versions/packs
create table if not exists public.engine_versions (
  id uuid primary key default gen_random_uuid(),
  language text not null,
  version integer not null,
  items jsonb not null default '[]'::jsonb,
  score numeric,
  note text,
  source text not null default 'manual',      -- seed | training | rewind | manual
  model text,
  session_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (language, version)
);
grant select on public.engine_versions to authenticated;
grant all on public.engine_versions to service_role;
alter table public.engine_versions enable row level security;
drop policy if exists "engine_versions_read" on public.engine_versions;
create policy "engine_versions_read" on public.engine_versions for select to authenticated using (true);

create table if not exists public.engine_active (
  language text primary key,
  version_id uuid references public.engine_versions(id) on delete set null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
grant select on public.engine_active to authenticated;
grant all on public.engine_active to service_role;
alter table public.engine_active enable row level security;
drop policy if exists "engine_active_read" on public.engine_active;
create policy "engine_active_read" on public.engine_active for select to authenticated using (true);
drop trigger if exists engine_active_updated_at on public.engine_active;
create trigger engine_active_updated_at before update on public.engine_active
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────── 3. benchmark test set
create table if not exists public.engine_benchmark_cases (
  id uuid primary key default gen_random_uuid(),
  language text not null,
  kind text not null default 'translate',      -- translate | transcribe
  source text not null,
  expected text not null,
  weight numeric not null default 1,
  origin text not null default 'seed',         -- seed | user | book
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.engine_benchmark_cases to authenticated;
grant all on public.engine_benchmark_cases to service_role;
alter table public.engine_benchmark_cases enable row level security;
drop policy if exists "benchmark_admin_all" on public.engine_benchmark_cases;
create policy "benchmark_admin_all" on public.engine_benchmark_cases for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop trigger if exists benchmark_updated_at on public.engine_benchmark_cases;
create trigger benchmark_updated_at before update on public.engine_benchmark_cases
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────── 4. training keys
create table if not exists public.training_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  key_prefix text not null,
  label text,
  language text not null,
  scope text not null default 'both',          -- translate | transcribe | both
  created_by uuid,
  uses integer not null default 0,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.training_keys to authenticated;
grant all on public.training_keys to service_role;
alter table public.training_keys enable row level security;
drop policy if exists "training_keys_admin" on public.training_keys;
create policy "training_keys_admin" on public.training_keys for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
drop trigger if exists training_keys_updated_at on public.training_keys;
create trigger training_keys_updated_at before update on public.training_keys
  for each row execute function public.set_updated_at();

-- ───────────────────────────────────────────────────────── 5. sessions/iterations
create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  key_id uuid references public.training_keys(id) on delete set null,
  language text not null,
  scope text not null default 'both',
  driver text not null default 'external',     -- external | in-app
  model text,
  status text not null default 'running',      -- running | finished | failed | expired
  iterations integer not null default 0,
  accepted integer not null default 0,
  start_score numeric,
  current_score numeric,
  summary text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);
grant select on public.training_sessions to authenticated;
grant all on public.training_sessions to service_role;
alter table public.training_sessions enable row level security;
drop policy if exists "training_sessions_admin" on public.training_sessions;
create policy "training_sessions_admin" on public.training_sessions for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
drop trigger if exists training_sessions_updated_at on public.training_sessions;
create trigger training_sessions_updated_at before update on public.training_sessions
  for each row execute function public.set_updated_at();

create table if not exists public.training_iterations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  language text not null,
  idx integer not null,
  model text,
  proposal jsonb not null default '{}'::jsonb,
  accepted boolean not null default false,
  reason text,
  score_before numeric,
  score_after numeric,
  version_id uuid references public.engine_versions(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select on public.training_iterations to authenticated;
grant all on public.training_iterations to service_role;
alter table public.training_iterations enable row level security;
drop policy if exists "training_iterations_admin" on public.training_iterations;
create policy "training_iterations_admin" on public.training_iterations for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create index if not exists training_iterations_session_idx on public.training_iterations (session_id, idx);

-- ─────────────────────────────────────────────── 6. seed empty version per language
insert into public.engine_versions (language, version, items, note, source, score)
select l, 1, '[]'::jsonb, 'baseline: built-in engine only', 'seed', null
  from (values ('ka'), ('en')) as t(l)
 where not exists (select 1 from public.engine_versions v where v.language = t.l);

insert into public.engine_active (language, version_id)
select v.language, v.id from public.engine_versions v
 where v.version = 1
   and not exists (select 1 from public.engine_active a where a.language = v.language);
