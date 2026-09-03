-- 004: seed benchmark cases for the Training Lab (idempotent by (language, kind, source)).
-- Each case is "raw engine output → correct text": training is scored only on these.

create unique index if not exists engine_benchmark_seed_key
  on public.engine_benchmark_cases (language, kind, md5(source));

insert into public.engine_benchmark_cases (language, kind, source, expected, origin, note) values
  ('ka','translate','მან თქვა ,რომ წიგნი კარგია .','მან თქვა, რომ წიგნი კარგია.','seed','punctuation spacing'),
  ('ka','translate','ის იყო ძალიან  კარგი კაცი','ის იყო ძალიან კარგი კაცი','seed','double space'),
  ('ka','translate','„გამარჯობა" — თქვა მან','„გამარჯობა“ — თქვა მან','seed','quote pairing'),
  ('ka','translate','მე ვნახე წიგნი ; შემდეგ წავედი','მე ვნახე წიგნი; შემდეგ წავედი','seed','semicolon spacing'),
  ('ka','translate','ომის ხელოვნება by სუნ ძი','ომის ხელოვნება — სუნ ძი','seed','untranslated by'),
  ('ka','translate','თავი 1 . დასაწყისი','თავი 1. დასაწყისი','seed','chapter heading'),
  ('ka','translate','ეს არის ის ,რაც მე მინდა','ეს არის ის, რაც მე მინდა','seed','comma spacing'),
  ('ka','transcribe','თავi მეორე','თავი მეორე','seed','latin i in georgian word'),
  ('ka','transcribe','ომის  ხელოვნება -  სუნ ძი','ომის ხელოვნება — სუნ ძი','seed','dash + spacing'),
  ('ka','transcribe','გვerდი 12','გვერდი 12','seed','latin e in georgian word'),
  ('en','translate','He said ,that the book is good .','He said that the book is good.','seed','punctuation spacing'),
  ('en','translate','It was a very  good book','It was a very good book','seed','double space'),
  ('en','translate','"Hello" - said he','“Hello” — said he','seed','typographic quotes and dash'),
  ('en','transcribe','Chapter 1 . The Beginn1ng','Chapter 1. The Beginning','seed','digit for letter'),
  ('en','transcribe','The Art of War  -  Sun Tzu','The Art of War — Sun Tzu','seed','dash + spacing'),
  ('en','transcribe','rn0ther and s0n','mother and son','seed','rn/0 confusions')
on conflict do nothing;
