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
