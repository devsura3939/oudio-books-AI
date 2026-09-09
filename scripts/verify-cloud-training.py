"""Migration verification. Uses libpq PG* environment variables, never logged.

Default rolls everything back. --apply commits migrations only; synthetic test
cases, proposals and versions are always rolled back to a savepoint.
Requires psycopg and Node. Run from the repository root.
"""
import json
import subprocess
import sys
from pathlib import Path

import psycopg

sys.stdout.reconfigure(encoding="utf-8")
with psycopg.connect(connect_timeout=10, sslmode="require") as conn:
    with conn.cursor() as cur:
        cur.execute("set statement_timeout='30s'")
        cur.execute("select v.items from engine_active a join engine_versions v on v.id=a.version_id where a.language='ka'")
        before = cur.fetchone()[0]
        cur.execute("select id::text,kind,source,expected from engine_benchmark_cases where language='ka' order by id")
        cases = [dict(zip(['id', 'kind', 'source', 'expected'], r)) for r in cur.fetchall()]
        for migration in ['007_browser_training.sql', '008_language_integrity_baseline.sql']:
            cur.execute((Path('lovable-app/supabase/external') / migration).read_text(encoding='utf-8'))
        cur.execute("select v.items from engine_active a join engine_versions v on v.id=a.version_id where a.language='ka'")
        after = cur.fetchone()[0]
        script = """import {applyPack} from './lovable-app/src/lib/engine-pack.ts';
let s='';for await(const c of process.stdin)s+=c;const d=JSON.parse(s);
console.log(JSON.stringify(d.cases.map(c=>({before:applyPack(c.source,d.before,c.kind),after:applyPack(c.source,d.after,c.kind),expected:c.expected}))));"""
        result = subprocess.run(['node', '--input-type=module', '-e', script], input=json.dumps(dict(before=before, after=after, cases=cases)), text=True, capture_output=True, encoding='utf-8', check=True)
        scored = json.loads(result.stdout)
        assert all(r['before'] != r['expected'] or r['after'] == r['expected'] for r in scored), 'Legacy passing case regressed'
        print('Legacy exact passes:', sum(r['before'] == r['expected'] for r in scored), '->', sum(r['after'] == r['expected'] for r in scored))
        cur.execute("select user_id::text from user_roles where role='admin' limit 1")
        owner = cur.fetchone()[0]
        cur.execute("select version_id from engine_active where language='en'")
        version = cur.fetchone()[0]
        cur.execute('savepoint tests_only')
        cur.execute("select set_config('request.jwt.claim.sub',%s,true)", (owner,))
        cur.execute("insert into engine_benchmark_cases(language,kind,source,expected,origin) values('en','transcribe','engbotTestMiscan','engbotTestCorrect','user')")
        cur.execute("set local role authenticated")
        proposal = [dict(type='ocr_fix', language='en', pattern='engbotTestMiscan', replacement='engbotTestCorrect')]
        cur.execute("select engbot_training_propose('en',%s,%s::jsonb,'regression-test','[]'::jsonb)", (version, json.dumps(proposal)))
        assert cur.fetchone()[0]['accepted']
        print('Admin exact improvement: accepted')
        cur.execute('reset role')
        cur.execute('rollback to savepoint tests_only')
        cur.execute("select set_config('request.jwt.claim.sub',%s,true)", (owner,))
        cur.execute('set local role authenticated')
        bad = [dict(type='glossary', language='en', pattern='by', replacement='—')]
        cur.execute("select engbot_training_propose('en',%s,%s::jsonb,'regression-test','[]'::jsonb)", (version, json.dumps(bad)))
        assert not cur.fetchone()[0]['accepted']
        print('Corruption of known-good prose: rejected')
        cur.execute('reset role')
        cur.execute('rollback to savepoint tests_only')
        for identity, pack_id in [(None, version), (owner, '00000000-0000-0000-0000-000000000000')]:
            cur.execute("select set_config('request.jwt.claim.sub',%s,true)", (identity or '',))
            cur.execute('set local role authenticated')
            try:
                cur.execute("select engbot_training_propose('en',%s,%s::jsonb,'regression-test','[]'::jsonb)", (pack_id, json.dumps(proposal)))
            except psycopg.Error:
                cur.execute('rollback to savepoint tests_only')
                print('Missing identity / stale version: rejected')
            else:
                raise AssertionError('Identity or version gate did not reject')
        cur.execute('reset role')
        cur.execute('rollback to savepoint tests_only')
        # Literal dollar/backslash payloads and Georgian boundaries agree with JS.
        cur.execute("select engbot_apply_literal('თავi / თავiს',%s::jsonb,'transcribe')", (json.dumps([dict(type='ocr_fix', pattern='თავi', replacement='თავი $&')]),))
        assert cur.fetchone()[0] == 'თავი $& / თავiს'
        cur.execute('select language,count(*) from engine_benchmark_cases group by language order by language')
        print('Benchmark totals:', cur.fetchall())
    if '--apply' in sys.argv:
        conn.commit()
        print('Migrations committed. Synthetic test changes rolled back.')
    else:
        conn.rollback()
        print('Dry run passed. All database changes rolled back.')
