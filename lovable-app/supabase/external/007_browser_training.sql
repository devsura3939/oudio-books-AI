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
      if before_ch !~ '[[:alnum:]ა-ჰᲐ-Ჿ]' and after_ch !~ '[[:alnum:]ა-ჰᲐ-Ჿ]' then
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
    if pat not in ('\s+([,.;])','\s{2,}','([,;])(\p{L})','(\p{L})"','(\p{L})\s+-\s+(\p{L})','ომისხელოვნება','ძალიანკარგი') then
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
  if accepted then reason := format('Accepted: %s → %s exact matches / %s.',old_pass,new_pass,total); end if;
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
