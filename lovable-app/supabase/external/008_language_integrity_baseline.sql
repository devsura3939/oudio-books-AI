-- Repair only the identified legacy pack, retaining its history for rollback.
-- Spacing must not join words; compound hyphens and ordinary "by" must survive.
do $$
declare v record; item jsonb; corrected jsonb := '[]'; next_id uuid; next_version integer;
begin
  select a.version_id,ev.items into v from public.engine_active a join public.engine_versions ev on ev.id=a.version_id where a.language='ka' for update of a;
  if jsonb_array_length(v.items)=10
    and exists(select 1 from jsonb_array_elements(v.items) x where x->>'pattern'='by' and x->>'replacement'='—') then
    for item in select value from jsonb_array_elements(v.items) loop
      if item->>'pattern'='by' then
        item:=item || jsonb_build_object('pattern','ომის ხელოვნება by სუნ ძი','replacement','ომის ხელოვნება — სუნ ძი','note','Title attribution only; never replace by in arbitrary prose.');
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
 ('ka','დედ-მამა სახლში დაბრუნდა.'),
 ('ka','მან თქვა: „ხვალ დავბრუნდები.“'),
 ('ka','ეს წიგნი ჩემია; ის წიგნი შენია.'),
 ('ka','არავინ არაფერი თქვა.'),
 ('ka','როგორ მოხდა ეს, არ ვიცი.'),
 ('ka','„სად მიდიხარ?“'),
 ('ka','ᲥᲐᲠᲗᲣᲚᲘ და ქართული.'),
 ('ka','რომელი წიგნი წაიკითხე?'),
 ('ka','2026 წელს 15 წიგნი წავიკითხე.'),
 ('ka','5 + 3 = 8.'),
 ('en','The road goes by the river.'),
 ('en','A well-known book; a well-written chapter.'),
 ('en','How it happened remains unclear.'),
 ('en','He said: “Are you ready?”'),
 ('en','Nobody changed the date: 2026-09-09.')
) as samples(lang,sample) cross join (values ('translate'),('transcribe')) as tasks(kind)
where not exists(select 1 from public.engine_benchmark_cases c where c.language=lang and c.kind=tasks.kind and c.source=sample and c.expected=sample);
