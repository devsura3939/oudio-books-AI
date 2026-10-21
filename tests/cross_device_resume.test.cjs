const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Cross-device continuity: restoreLastActiveSessionOrFirstBook selects most recently played book on new device', async () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../static/app.js'), 'utf8');

    // Verify cross-device fallback logic is present
    assert.match(appJs, /booksWithActivity\.sort/, 'Should sort books by activity timestamp');
    assert.match(appJs, /Math\.max\(Date\.parse\(a\.lastPlayedAt/, 'Should check lastPlayedAt');
    assert.match(appJs, /window\.EngbotReadingUI\.store\.load\(targetBook\)/, 'Should load cloud position on new device');
    assert.match(appJs, /savedSession = \{[\s\S]*?chapterId: resolvedChapterId[\s\S]*?sentenceIndex: resolvedSentence/, 'Should reconstruct session with chapter and sentence');
});

test('Cross-device continuity: updateProgress stores lastPlayedAt and updates updated_at in Supabase', async () => {
    const storeJs = fs.readFileSync(path.join(__dirname, '../static/supabase-store.js'), 'utf8');

    assert.match(storeJs, /meta\.lastPlayedAt = nowIso;/, 'Should set lastPlayedAt in metadata');
    assert.match(storeJs, /update\(\{ metadata: sanitizeForPostgres\(meta\), updated_at: nowIso \}\)/, 'Should update updated_at on books table');
    assert.match(storeJs, /lastPlayedAt: meta\.lastPlayedAt \|\| bookRow\.updated_at/, 'toStudioBook should expose lastPlayedAt');
});

test('Cross-device continuity: reading-ui choose awaits store.load on new device when local storage is empty', async () => {
    const readingUiJs = fs.readFileSync(path.join(__dirname, '../static/reading-ui.js'), 'utf8');

    assert.match(readingUiJs, /if \(!saved\) \{\s*try \{\s*const entries = await store\.load\(book\);/, 'Should await store.load when local cache is empty');
    assert.match(readingUiJs, /defaultSentence = \(saved && String\(saved\.chapterId\) === String\(preferredChapter\)\)/, 'Should resolve sentence for preferredChapter from saved or lastPlayedSentenceIndex');
});

test('Cross-device continuity: saveBookProgress debounces cloud update without 5% diff barrier', async () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../static/app.js'), 'utf8');

    // Ensure pctDiff >= 5 was removed from cloud debounce
    const saveProgressMatch = appJs.match(/function saveBookProgress\(book, progressPct, lastPlayedChapterId, sentenceIndex\) \{([\s\S]*?)\n\}/);
    assert.ok(saveProgressMatch, 'saveBookProgress function exists');
    const funcBody = saveProgressMatch[1];
    assert.doesNotMatch(funcBody, /pctDiff >= 5/, 'Should not require 5% progress difference to sync to cloud');
    assert.match(funcBody, /window\.LuminaStore\.updateProgress/, 'Should call updateProgress');
});
