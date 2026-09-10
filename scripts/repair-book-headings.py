"""Apply a reviewed heading plan from stdin; preserve text, IDs and other metadata atomically."""
import hashlib
import json
import os
import sys

import psycopg

plan = json.loads(sys.stdin.buffer.read().decode('utf-8-sig'))
assert plan['language'] in ('en', 'ka') and 0 < len(plan['entries']) <= 1000
assert len({entry['id'] for entry in plan['entries']}) == len(plan['entries'])
with psycopg.connect(host=os.environ['PGHOST'], port=int(os.environ.get('PGPORT', '5432')),
                     dbname='postgres', user=os.environ['PGUSER'], password=os.environ['PGPASSWORD'],
                     sslmode='require', connect_timeout=10) as conn:
    with conn.cursor() as cur:
        cur.execute("set statement_timeout='20s'")
        cur.execute('select id from books where id=%s and user_id=%s and slug=%s for update',
                    (plan['book_id'], plan['owner'], plan['slug']))
        assert cur.fetchone(), 'Book no longer belongs to this account'
        for entry in plan['entries']:
            assert isinstance(entry['title'], str) and 0 < len(entry['title']) < 1000
            cur.execute('select title,text_content from chapters where id=%s and book_id=%s and user_id=%s for update',
                        (entry['id'], plan['book_id'], plan['owner']))
            row = cur.fetchone()
            assert row and row[0] in (entry['old_title'], entry['title']), 'Heading changed; prepare a fresh plan'
            assert hashlib.sha256((row[1] or '').encode()).hexdigest() == entry['text_sha256'], 'Text changed; prepare a fresh plan'
            extra = json.dumps({'source_title': entry['old_title'], 'title_' + plan['language']: entry['title']}, ensure_ascii=False)
            cur.execute("""update chapters set title=%s,
                metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{extra}',coalesce(metadata->'extra','{}'::jsonb)||%s::jsonb)
                where id=%s""", (entry['title'], extra, entry['id']))
        cur.execute("""update books set language=%s,
            metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{extra}',coalesce(metadata->'extra','{}'::jsonb)||%s::jsonb)
            where id=%s""", (plan['language'], json.dumps({'lang': plan['language'], 'language': plan['language']}), plan['book_id']))
        cur.execute("""update books set metadata=jsonb_set(metadata,'{extra,extra}',
            (metadata#>'{extra,extra}')||%s::jsonb) where id=%s
            and jsonb_typeof(metadata#>'{extra,extra}')='object'""",
            (json.dumps({'lang': plan['language'], 'language': plan['language']}), plan['book_id']))
print(json.dumps({'updated_headings': len(plan['entries']), 'text_preserved': True, 'chapter_ids_preserved': True}))
