// Baseline sweep v1.39.0 engine: run all test-ka-* suites and probe-* files
// against the v1.39.0 engine (stash restored it to v1.39.0 in the working
// tree), write the fresh baseline to regression-baseline-v1390-engine.json.
// Does NOT run probe-v1400/test-ka-v1400 (they expect v1.40.0 and would fail).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RUNTIME = 'C:\\Users\\Anania Light Laptop\\AppData\\Local\\Programs\\TRAE SOLO\\TRAE SOLO.exe';
const SUITES_DIR = 'c:\\Users\\Anania Light Laptop\\.trae\\work\\6a94a614dccdaf406bd9fd4f';
const OUT = path.join(SUITES_DIR, 'regression-baseline-v1390-engine.json');

const suites = fs.readdirSync(SUITES_DIR)
  .filter(f => /^test-ka-v\d+\.js$/.test(f))
  .sort((a, b) => parseInt(a.match(/v(\d+)/)[1], 10) - parseInt(b.match(/v(\d+)/)[1], 10));

const probes = fs.readdirSync(SUITES_DIR)
  .filter(f => /^probe-v\d+\.js$/.test(f) && !f.includes('v1400'))
  .sort((a, b) => parseInt(a.match(/v(\d+)/)[1], 10) - parseInt(b.match(/v(\d+)/)[1], 10));

const base = {};
const all = [...suites, ...probes];
for (const s of all) {
  const r = spawnSync(RUNTIME, [path.join(SUITES_DIR, s)], {
    encoding: 'utf8',
    timeout: 120000,
    env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: '1' })
  });
  const out = (r.stdout || '') + (r.stderr || '');
  let pass = null, total = null;
  let m = out.match(/RESULT:\s*(\d+)\/(\d+)\s*PASS/i);
  if (m) { pass = +m[1]; total = +m[2]; }
  else {
    m = out.match(/(\d+)\s+passed,\s*(\d+)\s+failed,\s*(\d+)\s+total/i);
    if (m) { pass = +m[1]; total = +m[3]; }
  }
  base[s] = { pass, total, exit: r.status };
  const counts = (pass !== null) ? ` ${pass}/${total}` : '';
  const firstFail = (out.match(/^\s*FAIL .*$/m) || [''])[0].trim();
  console.log(`${(r.status === 0 ? 'ok' : 'FAIL').padEnd(5)} ${s.padEnd(22)}${counts}${firstFail ? '  | ' + firstFail : ''}`);
}

fs.writeFileSync(OUT, JSON.stringify(base, null, 2));
console.log('\nBaseline written: regression-baseline-v1390-engine.json');
