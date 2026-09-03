-- 002: unify the studio (vendored SPA) onto the same Supabase tables the React app uses.
alter table public.books    add column if not exists slug text;
alter table public.books    add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.chapters add column if not exists metadata jsonb not null default '{}'::jsonb;
create unique index if not exists books_user_slug_key on public.books (user_id, slug) where slug is not null;
create index if not exists chapters_book_idx on public.chapters (book_id, chapter_index);
