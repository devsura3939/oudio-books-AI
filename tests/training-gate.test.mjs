import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePack,isImprovement} from '../lovable-app/src/lib/engine-pack.ts';
test('TypeScript promotion protects each previous benchmark result',()=>{
    const cases=[{id:'protected',language:'en',kind:'transcribe',source:'correct',expected:'correct',weight:1},{id:'broken',language:'en',kind:'transcribe',source:'typo',expected:'fixed',weight:3}];
    const before=evaluatePack([],cases);
    const rules=[{id:'a',type:'ocr_fix',language:'en',pattern:'correct',replacement:'wrong'},{id:'b',type:'ocr_fix',language:'en',pattern:'typo',replacement:'fixed'}];
    const after=evaluatePack(rules,cases);
    assert.ok(after.score>before.score);
    assert.equal(after.passed,before.passed);
    assert.equal(isImprovement(before,after).ok,false);
    assert.equal(isImprovement(before,evaluatePack(rules.slice(1),cases)).ok,true);
});
