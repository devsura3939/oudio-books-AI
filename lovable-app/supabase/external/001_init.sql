-- Lumina Audio Studio — initial schema for the EXTERNAL Supabase project
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
