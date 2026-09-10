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
