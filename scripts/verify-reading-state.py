"""Apply additive reader migration; verify ownership and stale-write protection in a rolled-back savepoint."""
import os
from pathlib import Path
import psycopg

with psycopg.connect(host=os.environ['PGHOST'], port=int(os.environ.get('PGPORT', '5432')),
                     dbname='postgres', user=os.environ['PGUSER'], password=os.environ['PGPASSWORD'],
                     connect_timeout=10, sslmode='require') as conn:
    with conn.cursor() as cur:
        cur.execute("set statement_timeout='20s'")
        cur.execute(Path('lovable-app/supabase/external/009_reading_positions.sql').read_text(encoding='utf-8'))
        cur.execute('savepoint reading_test')
        cur.execute('select id,user_id from books limit 1')
        book, owner = cur.fetchone()
        cur.execute("select set_config('request.jwt.claim.sub',%s,true)", (str(owner),))
        cur.execute('set local role authenticated')
        cur.execute("select value from save_reader_entry(%s,'test:verification','{\"sentence\":9}',now())", (book,))
        assert cur.fetchone()[0]['sentence'] == 9
        cur.execute("select value from save_reader_entry(%s,'test:verification','{\"sentence\":1}',now()-interval '1 day')", (book,))
        assert cur.fetchone()[0]['sentence'] == 9
        cur.execute("select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true)")
        cur.execute('select count(*) from reader_entries where book_id=%s', (book,))
        assert cur.fetchone()[0] == 0
        cur.execute('rollback to savepoint reading_test')
        print('Reader migration applied; own-account writes, stale-write rejection and account isolation passed. Test entries rolled back.')
