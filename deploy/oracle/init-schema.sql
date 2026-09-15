-- =========================================================================
-- Migration: 001_init.sql
-- =========================================================================

-- Lumina Audio Studio â€” initial schema for the EXTERNAL Supabase project
-- Project ref: oakikavdnnvxzlcvsovq
-- Apply once via the SQL editor of that project (or psql with the direct connection string).
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------- enums
do $$ begin create type public.app_role as enum ('admin','moderator','user'); exception when duplicate_object then null; end $$;
do $$ begin create type public.book_status as enum ('uploaded','parsing','ready','failed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.chapter_status as enum ('pending','synthesizing','done','failed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.job_kind as enum ('parse','synthesize'); exception when duplicate_object then null; end $$;
do $$ begin create type public.job_status as enum ('queued','running','done','failed'); exception when duplicate_object then null; end $$;

-- ------------------------------------------------------- shared trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- auto-create a profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''), '@', 1)))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ----------------------------------------------------------- user_roles
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ---------------------------------------------------------------- books
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  language text not null default 'en',
  source_filename text,
  pdf_path text,
  cover_url text,
  page_count integer,
  total_chapters integer not null default 0,
  status public.book_status not null default 'uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists books_user_idx on public.books(user_id, created_at desc);
grant select, insert, update, delete on public.books to authenticated;
grant all on public.books to service_role;
alter table public.books enable row level security;
drop policy if exists "books_owner_all" on public.books;
create policy "books_owner_all" on public.books for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists books_updated_at on public.books;
create trigger books_updated_at before update on public.books for each row execute function public.set_updated_at();

-- ------------------------------------------------------------- chapters
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_index integer not null,
  title text not null,
  text_content text not null default '',
  word_count integer not null default 0,
  status public.chapter_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, chapter_index)
);
create index if not exists chapters_book_idx on public.chapters(book_id, chapter_index);
grant select, insert, update, delete on public.chapters to authenticated;
grant all on public.chapters to service_role;
alter table public.chapters enable row level security;
drop policy if exists "chapters_owner_all" on public.chapters;
create policy "chapters_owner_all" on public.chapters for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists chapters_updated_at on public.chapters;
create trigger chapters_updated_at before update on public.chapters for each row execute function public.set_updated_at();

-- -------------------------------------------------------- audio_segments
create table if not exists public.audio_segments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  part_index integer not null default 0,
  storage_path text not null,
  voice text,
  duration_seconds numeric,
  byte_size bigint,
  created_at timestamptz not null default now(),
  unique (chapter_id, part_index)
);
create index if not exists audio_book_idx on public.audio_segments(book_id);
grant select, insert, update, delete on public.audio_segments to authenticated;
grant all on public.audio_segments to service_role;
alter table public.audio_segments enable row level security;
drop policy if exists "audio_owner_all" on public.audio_segments;
create policy "audio_owner_all" on public.audio_segments for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------------ jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  kind public.job_kind not null,
  status public.job_status not null default 'queued',
  progress integer not null default 0,
  total integer not null default 0,
  message text,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_user_idx on public.jobs(user_id, created_at desc);
grant select, insert, update, delete on public.jobs to authenticated;
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;
drop policy if exists "jobs_owner_all" on public.jobs;
create policy "jobs_owner_all" on public.jobs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists jobs_updated_at on public.jobs;
create trigger jobs_updated_at before update on public.jobs for each row execute function public.set_updated_at();

-- --------------------------------------------------------------- storage
insert into storage.buckets (id, name, public) values ('book-pdfs','book-pdfs', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('book-audio','book-audio', false) on conflict (id) do nothing;

-- Objects are stored under "<auth.uid()>/..." so ownership is the first path segment.
drop policy if exists "own_folder_pdfs" on storage.objects;
create policy "own_folder_pdfs" on storage.objects for all to authenticated
  using (bucket_id = 'book-pdfs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'book-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own_folder_audio" on storage.objects;
create policy "own_folder_audio" on storage.objects for all to authenticated
  using (bucket_id = 'book-audio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'book-audio' and (storage.foldername(name))[1] = auth.uid()::text);


-- =========================================================================
-- Migration: 002_studio_unify.sql
-- =========================================================================

-- 002: unify the studio (vendored SPA) onto the same Supabase tables the React app uses.
alter table public.books    add column if not exists slug text;
alter table public.books    add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.chapters add column if not exists metadata jsonb not null default '{}'::jsonb;
create unique index if not exists books_user_slug_key on public.books (user_id, slug) where slug is not null;
create index if not exists chapters_book_idx on public.chapters (book_id, chapter_index);


-- =========================================================================
-- Migration: 003_training.sql
-- =========================================================================

-- 003: unique emails, hardcoded admin, and the trainable-engine (Training Lab) schema.
-- Idempotent / re-runnable.

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ 1. unique emails + hardcoded admin
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ 2. engine versions/packs
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ 3. benchmark test set
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ 4. training keys
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ 5. sessions/iterations
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ 6. seed empty version per language
insert into public.engine_versions (language, version, items, note, source, score)
select l, 1, '[]'::jsonb, 'baseline: built-in engine only', 'seed', null
  from (values ('ka'), ('en')) as t(l)
 where not exists (select 1 from public.engine_versions v where v.language = t.l);

insert into public.engine_active (language, version_id)
select v.language, v.id from public.engine_versions v
 where v.version = 1
   and not exists (select 1 from public.engine_active a where a.language = v.language);


-- =========================================================================
-- Migration: 004_benchmark_seed.sql
-- =========================================================================

-- 004: seed benchmark cases for the Training Lab (idempotent by (language, kind, source)).
-- Each case is "raw engine output â†’ correct text": training is scored only on these.

create unique index if not exists engine_benchmark_seed_key
  on public.engine_benchmark_cases (language, kind, md5(source));

insert into public.engine_benchmark_cases (language, kind, source, expected, origin, note) values
  ('ka','translate','áƒ›áƒáƒœ áƒ—áƒ¥áƒ•áƒ ,áƒ áƒáƒ› áƒ¬áƒ˜áƒ’áƒœáƒ˜ áƒ™áƒáƒ áƒ’áƒ˜áƒ .','áƒ›áƒáƒœ áƒ—áƒ¥áƒ•áƒ, áƒ áƒáƒ› áƒ¬áƒ˜áƒ’áƒœáƒ˜ áƒ™áƒáƒ áƒ’áƒ˜áƒ.','seed','punctuation spacing'),
  ('ka','translate','áƒ˜áƒ¡ áƒ˜áƒ§áƒ áƒ«áƒáƒšáƒ˜áƒáƒœ  áƒ™áƒáƒ áƒ’áƒ˜ áƒ™áƒáƒªáƒ˜','áƒ˜áƒ¡ áƒ˜áƒ§áƒ áƒ«áƒáƒšáƒ˜áƒáƒœ áƒ™áƒáƒ áƒ’áƒ˜ áƒ™áƒáƒªáƒ˜','seed','double space'),
  ('ka','translate','â€žáƒ’áƒáƒ›áƒáƒ áƒ¯áƒáƒ‘áƒ" â€” áƒ—áƒ¥áƒ•áƒ áƒ›áƒáƒœ','â€žáƒ’áƒáƒ›áƒáƒ áƒ¯áƒáƒ‘áƒâ€œ â€” áƒ—áƒ¥áƒ•áƒ áƒ›áƒáƒœ','seed','quote pairing'),
  ('ka','translate','áƒ›áƒ” áƒ•áƒœáƒáƒ®áƒ” áƒ¬áƒ˜áƒ’áƒœáƒ˜ ; áƒ¨áƒ”áƒ›áƒ“áƒ”áƒ’ áƒ¬áƒáƒ•áƒ”áƒ“áƒ˜','áƒ›áƒ” áƒ•áƒœáƒáƒ®áƒ” áƒ¬áƒ˜áƒ’áƒœáƒ˜; áƒ¨áƒ”áƒ›áƒ“áƒ”áƒ’ áƒ¬áƒáƒ•áƒ”áƒ“áƒ˜','seed','semicolon spacing'),
  ('ka','translate','áƒáƒ›áƒ˜áƒ¡ áƒ®áƒ”áƒšáƒáƒ•áƒœáƒ”áƒ‘áƒ by áƒ¡áƒ£áƒœ áƒ«áƒ˜','áƒáƒ›áƒ˜áƒ¡ áƒ®áƒ”áƒšáƒáƒ•áƒœáƒ”áƒ‘áƒ â€” áƒ¡áƒ£áƒœ áƒ«áƒ˜','seed','untranslated by'),
  ('ka','translate','áƒ—áƒáƒ•áƒ˜ 1 . áƒ“áƒáƒ¡áƒáƒ¬áƒ§áƒ˜áƒ¡áƒ˜','áƒ—áƒáƒ•áƒ˜ 1. áƒ“áƒáƒ¡áƒáƒ¬áƒ§áƒ˜áƒ¡áƒ˜','seed','chapter heading'),
  ('ka','translate','áƒ”áƒ¡ áƒáƒ áƒ˜áƒ¡ áƒ˜áƒ¡ ,áƒ áƒáƒª áƒ›áƒ” áƒ›áƒ˜áƒœáƒ“áƒ','áƒ”áƒ¡ áƒáƒ áƒ˜áƒ¡ áƒ˜áƒ¡, áƒ áƒáƒª áƒ›áƒ” áƒ›áƒ˜áƒœáƒ“áƒ','seed','comma spacing'),
  ('ka','transcribe','áƒ—áƒáƒ•i áƒ›áƒ”áƒáƒ áƒ”','áƒ—áƒáƒ•áƒ˜ áƒ›áƒ”áƒáƒ áƒ”','seed','latin i in georgian word'),
  ('ka','transcribe','áƒáƒ›áƒ˜áƒ¡  áƒ®áƒ”áƒšáƒáƒ•áƒœáƒ”áƒ‘áƒ -  áƒ¡áƒ£áƒœ áƒ«áƒ˜','áƒáƒ›áƒ˜áƒ¡ áƒ®áƒ”áƒšáƒáƒ•áƒœáƒ”áƒ‘áƒ â€” áƒ¡áƒ£áƒœ áƒ«áƒ˜','seed','dash + spacing'),
  ('ka','transcribe','áƒ’áƒ•eráƒ“áƒ˜ 12','áƒ’áƒ•áƒ”áƒ áƒ“áƒ˜ 12','seed','latin e in georgian word'),
  ('en','translate','He said ,that the book is good .','He said that the book is good.','seed','punctuation spacing'),
  ('en','translate','It was a very  good book','It was a very good book','seed','double space'),
  ('en','translate','"Hello" - said he','â€œHelloâ€ â€” said he','seed','typographic quotes and dash'),
  ('en','transcribe','Chapter 1 . The Beginn1ng','Chapter 1. The Beginning','seed','digit for letter'),
  ('en','transcribe','The Art of War  -  Sun Tzu','The Art of War â€” Sun Tzu','seed','dash + spacing'),
  ('en','transcribe','rn0ther and s0n','mother and son','seed','rn/0 confusions')
on conflict do nothing;


-- =========================================================================
-- Migration: 005_repair_translations.sql
-- =========================================================================

-- ============================================================================
-- Migration 005: Repair Corrupted Machine Translations & Resynchronize Books
-- ============================================================================
-- Problem Addressed:
-- Prior to the Lumina translation quality gates, failed translation requests
-- silently fell back to returning the verbatim English source text. As a result,
-- 104 out of 191 chapters in the external database had metadata->>'text_ka'
-- byte-identical to the English source text_content, while books falsely
-- reported translatedLangs: ['ka'].
--
-- Actions:
-- 1. Identify and purge identical-to-source and non-Georgian text_ka values from chapters.
-- 2. Clear both chapters.metadata->'text_ka' and the chapters.text_ka column (if present).
-- 3. Reset chapter status to 'pending' if it was marked completed with corrupted text.
-- 4. Recompute books.metadata->'translatedLangs' based strictly on 100% verified Georgian chapters.
-- ============================================================================

DO $$
DECLARE
  corrupted_count integer := 0;
  repaired_books integer := 0;
BEGIN
  RAISE NOTICE 'Starting Migration 005: Repairing corrupted chapter translations...';

  -- Step 1: Count chapters with corrupt / source-leaked text_ka
  SELECT COUNT(*) INTO corrupted_count
  FROM public.chapters
  WHERE
    (
      (metadata->>'text_ka' IS NOT NULL AND length(trim(metadata->>'text_ka')) > 0)
      AND (
        trim(metadata->>'text_ka') = trim(text_content)
        OR metadata->>'text_ka' !~ '[\u10A0-\u10FF]'
      )
    );

  RAISE NOTICE 'Found % chapters with corrupted or untranslated text_ka.', corrupted_count;

  -- Step 1.5: Sanitize Khmer characters (U+17D4) in otherwise valid Georgian text_ka
  UPDATE public.chapters
  SET
    metadata = jsonb_set(metadata, '{text_ka}', to_jsonb(replace(metadata->>'text_ka', E'\u17D4', '. '))),
    updated_at = now()
  WHERE metadata->>'text_ka' ~ E'\u17D4';

  -- Step 2: Clear metadata->'text_ka' on corrupted rows
  UPDATE public.chapters
  SET
    metadata = metadata - 'text_ka',
    updated_at = now()
  WHERE
    (metadata->>'text_ka' IS NOT NULL AND length(trim(metadata->>'text_ka')) > 0)
    AND (
      trim(metadata->>'text_ka') = trim(text_content)
      OR metadata->>'text_ka' !~ '[\u10A0-\u10FF]'
    );

  -- Step 3: If text_ka exists as a native column on public.chapters, clean it as well
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chapters' AND column_name = 'text_ka'
  ) THEN
    EXECUTE '
      UPDATE public.chapters
      SET text_ka = NULL, updated_at = now()
      WHERE text_ka IS NOT NULL
        AND (trim(text_ka) = trim(text_content) OR text_ka !~ ''[\u10A0-\u10FF]'')
    ';
  END IF;

  -- Step 4: Recompute books metadata->'translatedLangs'
  -- Remove 'ka' from books that have ANY chapter missing valid Georgian translation
  WITH book_translation_status AS (
    SELECT
      b.id AS book_id,
      COUNT(c.id) AS total_chapters,
      COUNT(c.id) FILTER (
        WHERE (c.metadata->>'text_ka' IS NOT NULL AND c.metadata->>'text_ka' ~ '[\u10A0-\u10FF]')
      ) AS valid_ka_chapters
    FROM public.books b
    JOIN public.chapters c ON c.book_id = b.id
    GROUP BY b.id
  )
  UPDATE public.books b
  SET
    metadata = jsonb_set(
      COALESCE(b.metadata, '{}'::jsonb),
      '{translatedLangs}',
      CASE
        WHEN s.total_chapters > 0 AND s.valid_ka_chapters = s.total_chapters THEN
          (
            SELECT jsonb_agg(DISTINCT elem)
            FROM jsonb_array_elements_text(COALESCE(b.metadata->'translatedLangs', '[]'::jsonb) || '["ka"]'::jsonb) AS elem
          )
        ELSE
          COALESCE((
            SELECT jsonb_agg(elem)
            FROM jsonb_array_elements_text(COALESCE(b.metadata->'translatedLangs', '[]'::jsonb)) AS elem
            WHERE elem <> 'ka'
          ), '[]'::jsonb)
      END
    ),
    updated_at = now()
  FROM book_translation_status s
  WHERE b.id = s.book_id;

  GET DIAGNOSTICS repaired_books = ROW_COUNT;
  RAISE NOTICE 'Migration 005 completed: % corrupted chapters cleaned, % books synchronized.', corrupted_count, repaired_books;
END $$;

-- ============================================================================
-- RPC: check_user_exists
-- Allows client applications to securely verify if an email exists before sending
-- password reset links, returning false instead of generic success.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_user_exists(lookup_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE lower(trim(email)) = lower(trim(lookup_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_exists(text) TO anon, authenticated, service_role;



-- =========================================================================
-- Migration: 006_library_realtime.sql
-- =========================================================================

-- 006: realtime, account-scoped library synchronization.
-- Idempotent: safe to run in the external Supabase SQL editor.

-- DELETE events need the old user_id so the owning browser can remove its
-- offline mirror immediately. RLS still controls which rows are visible.
alter table public.books replica identity full;
alter table public.chapters replica identity full;
alter table public.audio_segments replica identity full;
alter table public.jobs replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'books'
  ) then
    alter publication supabase_realtime add table public.books;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chapters'
  ) then
    alter publication supabase_realtime add table public.chapters;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audio_segments'
  ) then
    alter publication supabase_realtime add table public.audio_segments;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'jobs'
  ) then
    alter publication supabase_realtime add table public.jobs;
  end if;
end $$;


-- =========================================================================
-- Migration: 007_browser_training.sql
-- =========================================================================

-- Browser training uses the signed-in admin session, never a service key.
-- Deliberately limited to literal rules; advanced regex packs use the server API.
create or replace function public.engbot_apply_literal(p_text text, p_items jsonb, p_kind text)
returns text language plpgsql immutable set search_path = public as $$
declare item jsonb; pat text; rep text; remaining text; result text; pos integer; n integer; before_ch text; after_ch text;
begin
  for item in select value from jsonb_array_elements(p_items) loop
    if item->>'type' <> (case when p_kind = 'transcribe' then 'ocr_fix' else 'glossary' end) then continue; end if;
    pat := item->>'pattern'; rep := item->>'replacement';
    if coalesce(length(pat),0) = 0 then continue; end if;
    remaining := p_text; result := ''; n := length(pat);
    loop
      pos := strpos(remaining, pat);
      exit when pos = 0;
      before_ch := case when pos = 1 then right(result,1) else substr(remaining,pos-1,1) end;
      after_ch := substr(remaining,pos+n,1);
      if before_ch !~ '[[:alnum:]áƒ-áƒ°á²-á²¿]' and after_ch !~ '[[:alnum:]áƒ-áƒ°á²-á²¿]' then
        result := result || substr(remaining,1,pos-1) || rep;
        remaining := substr(remaining,pos+n);
      else
        result := result || substr(remaining,1,pos);
        remaining := substr(remaining,pos+1);
      end if;
    end loop;
    p_text := result || remaining;
  end loop;
  for item in select value from jsonb_array_elements(p_items) loop
    if item->>'type'<>'autofix' then continue; end if;
    pat:=item->>'pattern'; rep:=item->>'replacement';
    if pat not in ('\s+([,.;])','\s{2,}','([,;])(\p{L})','(\p{L})"','(\p{L})\s+-\s+(\p{L})','áƒáƒ›áƒ˜áƒ¡áƒ®áƒ”áƒšáƒáƒ•áƒœáƒ”áƒ‘áƒ','áƒ«áƒáƒšáƒ˜áƒáƒœáƒ™áƒáƒ áƒ’áƒ˜') then
      raise exception 'Advanced rule requires server evaluator';
    end if;
    pat:=replace(pat,'\p{L}','[[:alpha:]]');
    rep:=replace(replace(rep,'$1',chr(92)||'1'),'$2',chr(92)||'2');
    p_text:=regexp_replace(p_text,pat,rep,'g');
  end loop;
  return p_text;
end $$;

create or replace function public.engbot_training_propose(p_language text, p_version uuid, p_items jsonb, p_model text default 'saved-provider', p_sources jsonb default '[]')
returns jsonb language plpgsql security definer set search_path = public as $$
declare current_id uuid; current_items jsonb; candidate jsonb; item jsonb; c record; old_text text; new_text text;
  old_pass integer := 0; new_pass integer := 0; total integer := 0; new_id uuid; new_version integer;
  session_id uuid; reason text := ''; accepted boolean := false; old_score numeric; new_score numeric;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then raise exception 'Admin session required'; end if;
  if p_language not in ('ka','en') then raise exception 'Language not configured'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 6 then raise exception 'Expected 1-6 rules'; end if;
  if jsonb_typeof(p_sources) is distinct from 'array' or octet_length(p_sources::text) > 16000 then raise exception 'Source budget exceeded'; end if;
  select version_id into current_id from engine_active where language=p_language and enabled=true for update;
  if current_id is null or current_id is distinct from p_version then raise exception 'Active pack changed or is disabled. Reload and retry.'; end if;
  select items into current_items from engine_versions where id=current_id;
  if exists(select 1 from jsonb_array_elements(current_items) x where x->>'type' not in ('glossary','ocr_fix','autofix')) then raise exception 'Advanced pack requires server evaluator'; end if;
  if jsonb_array_length(current_items)+jsonb_array_length(p_items)>4000 then raise exception 'Pack capacity reached'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) <> 'object' or coalesce(item->>'type','') not in ('glossary','ocr_fix')
      or coalesce(item->>'language','') <> p_language
      or jsonb_typeof(item->'pattern') is distinct from 'string' or jsonb_typeof(item->'replacement') is distinct from 'string'
      or length(btrim(item->>'pattern')) not between 1 and 160
      or length(btrim(item->>'replacement')) not between 1 and 240
      or item->>'pattern'=item->>'replacement' then raise exception 'Invalid literal rule'; end if;
  end loop;
  candidate := current_items || p_items;
  lock table public.engine_benchmark_cases in share mode;
  if (select count(*) from engine_benchmark_cases where language=p_language)>2000 then raise exception 'Use server training for more than 2000 benchmarks'; end if;
  for c in select id,kind,source,expected from engine_benchmark_cases where language=p_language order by id loop
    if length(c.source)>4000 or length(c.expected)>4000 then raise exception 'Benchmark case exceeds browser evaluator limit'; end if;
    total := total+1;
    old_text := public.engbot_apply_literal(c.source,current_items,c.kind);
    new_text := public.engbot_apply_literal(c.source,candidate,c.kind);
    if old_text=c.expected then old_pass:=old_pass+1; end if;
    if new_text=c.expected then new_pass:=new_pass+1; end if;
    if new_text<>old_text and new_text<>c.expected then reason := 'Rejected: changed benchmark ' || c.id || ' without correcting it.'; end if;
    if public.engbot_apply_literal(c.expected,candidate,c.kind)<>public.engbot_apply_literal(c.expected,current_items,c.kind) then
      reason := 'Rejected: changed known-good text in benchmark ' || c.id || '.';
    end if;
  end loop;
  if total=0 then raise exception 'Add verified benchmarks first'; end if;
  if reason='' and new_pass<=old_pass then reason := 'Rejected: no new exact benchmark matches.'; end if;
  old_score := round(old_pass*100.0/total,3); new_score := round(new_pass*100.0/total,3);
  accepted := reason='';
  if accepted then reason := format('Accepted: %s â†’ %s exact matches / %s.',old_pass,new_pass,total); end if;
  insert into training_sessions(language,driver,model,status,iterations,accepted,start_score,current_score,summary,finished_at)
    values(p_language,'browser',left(p_model,120),'finished',1,case when accepted then 1 else 0 end,old_score,case when accepted then new_score else old_score end,reason,now()) returning id into session_id;
  if accepted then
    select coalesce(max(version),0)+1 into new_version from engine_versions where language=p_language;
    insert into engine_versions(language,version,items,score,note,source,model,session_id,created_by)
      values(p_language,new_version,candidate,new_score,reason,'training',left(p_model,120),session_id,auth.uid()) returning id into new_id;
    update engine_active set version_id=new_id where language=p_language;
  end if;
  insert into training_iterations(session_id,language,idx,model,proposal,accepted,reason,score_before,score_after,version_id)
    values(session_id,p_language,1,left(p_model,120),jsonb_build_object('items',p_items,'consulted_sources',p_sources),accepted,reason,old_score,new_score,new_id);
  return jsonb_build_object('accepted',accepted,'reason',reason,'version_id',coalesce(new_id,current_id),'session_id',session_id);
end $$;
revoke all on function public.engbot_training_propose(text,uuid,jsonb,text,jsonb) from public,anon;
grant execute on function public.engbot_training_propose(text,uuid,jsonb,text,jsonb) to authenticated;

-- Existing admin RLS still determines who may add verified examples.
grant insert on public.engine_benchmark_cases to authenticated;
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='engine_active') then
    alter publication supabase_realtime add table public.engine_active;
  end if;
end $$;
notify pgrst, 'reload schema';


-- =========================================================================
-- Migration: 008_language_integrity_baseline.sql
-- =========================================================================

-- Repair only the identified legacy pack, retaining its history for rollback.
-- Spacing must not join words; compound hyphens and ordinary "by" must survive.
do $$
declare v record; item jsonb; corrected jsonb := '[]'; next_id uuid; next_version integer;
begin
  select a.version_id,ev.items into v from public.engine_active a join public.engine_versions ev on ev.id=a.version_id where a.language='ka' for update of a;
  if jsonb_array_length(v.items)=10
    and exists(select 1 from jsonb_array_elements(v.items) x where x->>'pattern'='by' and x->>'replacement'='â€”') then
    for item in select value from jsonb_array_elements(v.items) loop
      if item->>'pattern'='by' then
        item:=item || jsonb_build_object('pattern','áƒáƒ›áƒ˜áƒ¡ áƒ®áƒ”áƒšáƒáƒ•áƒœáƒ”áƒ‘áƒ by áƒ¡áƒ£áƒœ áƒ«áƒ˜','replacement','áƒáƒ›áƒ˜áƒ¡ áƒ®áƒ”áƒšáƒáƒ•áƒœáƒ”áƒ‘áƒ â€” áƒ¡áƒ£áƒœ áƒ«áƒ˜','note','Title attribution only; never replace by in arbitrary prose.');
      elsif item->>'pattern'=chr(92)||'s{2,}' then
        item:=item || jsonb_build_object('replacement',' ','note','Collapse repeated whitespace without joining words.');
      elsif item->>'pattern'='('||chr(92)||'p{L})'||chr(92)||'s*-'||chr(92)||'s*('||chr(92)||'p{L})' then
        item:=item || jsonb_build_object('pattern','('||chr(92)||'p{L})'||chr(92)||'s+-'||chr(92)||'s+('||chr(92)||'p{L})','note','Spaced dialogue dash only; preserve compound hyphens.');
      end if;
      corrected:=corrected || jsonb_build_array(item);
    end loop;
    select max(version)+1 into next_version from public.engine_versions where language='ka';
    insert into public.engine_versions(language,version,items,note,source)
      values('ka',next_version,corrected,'Source fidelity baseline: scoped attribution, preserved word boundaries and compound hyphens.','manual') returning id into next_id;
    update public.engine_active set version_id=next_id where language='ka';
  end if;
end $$;

-- Identity cases protect genuine wording. These are synthetic, manually reviewed
-- examples, not model-generated translations or copied corpus passages.
insert into public.engine_benchmark_cases(language,kind,source,expected,origin,note)
select lang,kind,sample,sample,'user','Source integrity holdout: preserve author punctuation, negation, compounds, names and numbers.'
from (values
 ('ka','áƒ“áƒ”áƒ“-áƒ›áƒáƒ›áƒ áƒ¡áƒáƒ®áƒšáƒ¨áƒ˜ áƒ“áƒáƒ‘áƒ áƒ£áƒœáƒ“áƒ.'),
 ('ka','áƒ›áƒáƒœ áƒ—áƒ¥áƒ•áƒ: â€žáƒ®áƒ•áƒáƒš áƒ“áƒáƒ•áƒ‘áƒ áƒ£áƒœáƒ“áƒ”áƒ‘áƒ˜.â€œ'),
 ('ka','áƒ”áƒ¡ áƒ¬áƒ˜áƒ’áƒœáƒ˜ áƒ©áƒ”áƒ›áƒ˜áƒ; áƒ˜áƒ¡ áƒ¬áƒ˜áƒ’áƒœáƒ˜ áƒ¨áƒ”áƒœáƒ˜áƒ.'),
 ('ka','áƒáƒ áƒáƒ•áƒ˜áƒœ áƒáƒ áƒáƒ¤áƒ”áƒ áƒ˜ áƒ—áƒ¥áƒ•áƒ.'),
 ('ka','áƒ áƒáƒ’áƒáƒ  áƒ›áƒáƒ®áƒ“áƒ áƒ”áƒ¡, áƒáƒ  áƒ•áƒ˜áƒªáƒ˜.'),
 ('ka','â€žáƒ¡áƒáƒ“ áƒ›áƒ˜áƒ“áƒ˜áƒ®áƒáƒ ?â€œ'),
 ('ka','á²¥á²á² á²—á²£á²šá²˜ áƒ“áƒ áƒ¥áƒáƒ áƒ—áƒ£áƒšáƒ˜.'),
 ('ka','áƒ áƒáƒ›áƒ”áƒšáƒ˜ áƒ¬áƒ˜áƒ’áƒœáƒ˜ áƒ¬áƒáƒ˜áƒ™áƒ˜áƒ—áƒ®áƒ”?'),
 ('ka','2026 áƒ¬áƒ”áƒšáƒ¡ 15 áƒ¬áƒ˜áƒ’áƒœáƒ˜ áƒ¬áƒáƒ•áƒ˜áƒ™áƒ˜áƒ—áƒ®áƒ”.'),
 ('ka','5 + 3 = 8.'),
 ('en','The road goes by the river.'),
 ('en','A well-known book; a well-written chapter.'),
 ('en','How it happened remains unclear.'),
 ('en','He said: â€œAre you ready?â€'),
 ('en','Nobody changed the date: 2026-09-09.')
) as samples(lang,sample) cross join (values ('translate'),('transcribe')) as tasks(kind)
where not exists(select 1 from public.engine_benchmark_cases c where c.language=lang and c.kind=tasks.kind and c.source=sample and c.expected=sample);


-- =========================================================================
-- Migration: 009_reading_positions.sql
-- =========================================================================

-- Account-owned reading positions and independent bookmark records.
-- Separate rows prevent playback updates from replacing book/chapter metadata.
create table if not exists public.reader_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  slot text not null check (length(slot) between 1 and 100),
  value jsonb not null check (jsonb_typeof(value) = 'object' and octet_length(value::text) < 8000),
  observed_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id, slot)
);
alter table public.reader_entries enable row level security;
drop policy if exists reader_entries_owner on public.reader_entries;
create policy reader_entries_owner on public.reader_entries for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.books b where b.id = book_id and b.user_id = auth.uid()
  ));
grant select, insert, update, delete on public.reader_entries to authenticated;

create or replace function public.save_reader_entry(p_book uuid, p_slot text, p_value jsonb, p_observed timestamptz)
returns setof public.reader_entries language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from books where id = p_book and user_id = auth.uid()) then
    raise exception 'Book is not available to this account';
  end if;
  if p_observed > now() + interval '5 minutes' then raise exception 'Device clock is ahead'; end if;
  insert into reader_entries(user_id, book_id, slot, value, observed_at)
    values(auth.uid(), p_book, p_slot, p_value, p_observed)
    on conflict(user_id, book_id, slot) do update
    set value = excluded.value, observed_at = excluded.observed_at, updated_at = now()
    where reader_entries.observed_at <= excluded.observed_at;
  return query select * from reader_entries where user_id = auth.uid() and book_id = p_book and slot = p_slot;
end $$;
revoke all on function public.save_reader_entry(uuid,text,jsonb,timestamptz) from public;
grant execute on function public.save_reader_entry(uuid,text,jsonb,timestamptz) to authenticated;
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='reader_entries' and schemaname='public'
  ) then alter publication supabase_realtime add table public.reader_entries; end if;
end $$;
notify pgrst, 'reload schema';


-- =========================================================================
-- Migration: 010_compact_library_revision.sql
-- =========================================================================

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



