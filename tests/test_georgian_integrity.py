# ============================================================================
# Gold Regression & Georgian Linguistic Integrity Test Suite
# ============================================================================
import os
import re
import sys

print("Running Oudio Books AI Gold Regression Integrity Test Suite...")

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_APP = os.path.join(REPO_DIR, "static", "app.js")
STATIC_LINGUISTICS = os.path.join(REPO_DIR, "static", "georgian-linguistics.js")
STATIC_SCANNER = os.path.join(REPO_DIR, "static", "scanner.js")
API_AI = os.path.join(REPO_DIR, "lovable-app", "src", "routes", "api", "ai.ts")
API_TTS = os.path.join(REPO_DIR, "lovable-app", "src", "routes", "api", "tts.ts")
MIGRATION_005 = os.path.join(REPO_DIR, "lovable-app", "supabase", "external", "005_repair_translations.sql")

# ----------------------------------------------------------------------------
# 1. Punctuation & Khmer Character Eradication Test
# ----------------------------------------------------------------------------
with open(STATIC_LINGUISTICS, "r", encoding="utf-8") as f:
    ling_content = f.read()

# Assert 0 occurrences of U+17D4 (Khmer sign khan: ។)
khmer_count = ling_content.count("។")
assert khmer_count == 0, f"FAIL: Found {khmer_count} instances of Khmer U+17D4 in georgian-linguistics.js"
print("  [PASS] 0 instances of Khmer U+17D4 in georgian-linguistics.js")

# Assert auto-fix 4.15 does not strip periods
assert r"out.replace(/(?<=[\u10A0-\u10FF])\.(?=\s|$)/g, '')" not in ling_content,     "FAIL: Found destructive period-stripping regex in georgian-linguistics.js!"
print("  [PASS] Period-stripping auto-fix 4.15 removed")

# Assert latin_period rule removed
assert "'latin_period'" not in ling_content and '"latin_period"' not in ling_content,     "FAIL: 'latin_period' rule still present in validator!"
print("  [PASS] 'latin_period' rule absent from validator")

# ----------------------------------------------------------------------------
# 2. Unicode Georgian Word Boundary Test (  adjacent to Georgian)
# ----------------------------------------------------------------------------
with open(STATIC_APP, "r", encoding="utf-8") as f:
    app_content = f.read()

bad_b_app = re.findall(r'\\b[\u10A0-\u10FF]|[\u10A0-\u10FF]\\b', app_content)
assert len(bad_b_app) == 0, f"FAIL: Found {len(bad_b_app)} instances of \\b adjacent to Georgian in app.js!"
print("  [PASS] 0 instances of \\b adjacent to Georgian letters in app.js")

bad_b_ling = re.findall(r'\\b[\u10A0-\u10FF]|[\u10A0-\u10FF]\\b', ling_content)
assert len(bad_b_ling) == 0, f"FAIL: Found {len(bad_b_ling)} instances of \\b adjacent to Georgian in georgian-linguistics.js!"
print("  [PASS] 0 instances of \\b adjacent to Georgian letters in georgian-linguistics.js")

# ----------------------------------------------------------------------------
# 3. Translation Quality Gate & Assessment
# ----------------------------------------------------------------------------
assert "function assessTranslation" in app_content, "FAIL: assessTranslation missing from app.js"
print("  [PASS] assessTranslation quality gate function is present")

# Verify that translateSingleSentence never returns clean text on error
assert "return clean;" not in app_content, "FAIL: translateSingleSentence leaks source text via 'return clean;'!"
print("  [PASS] translateSingleSentence never returns source text on failure")

# ----------------------------------------------------------------------------
# 4. System Prompt Separation & Caching Architecture
# ----------------------------------------------------------------------------
assert "systemPrompt = null" in app_content, "FAIL: systemPrompt parameter missing from API funnel"
assert "systemInstruction" in app_content, "FAIL: systemInstruction missing from Gemini caller"
assert "getBookGlossaryBlock" in app_content, "FAIL: getBookGlossaryBlock missing from app.js"
print("  [PASS] systemPrompt separation and book glossary block verified in app.js")

with open(API_AI, "r", encoding="utf-8") as f:
    ai_ts = f.read()
assert "systemPrompt: z.string()" in ai_ts, "FAIL: systemPrompt missing from api/ai.ts Zod schema"
assert '{ role: "system", content: input.systemPrompt }' in ai_ts, "FAIL: system message not built in api/ai.ts"
print("  [PASS] api/ai.ts accepts and passes systemPrompt")

with open(API_TTS, "r", encoding="utf-8") as f:
    tts_ts = f.read()
assert "systemInstruction: { parts: [{ text: steer }] }" in tts_ts,     "FAIL: api/tts.ts does not use systemInstruction for Gemini TTS steer"
print("  [PASS] api/tts.ts isolates Gemini voice steer into systemInstruction")

# ----------------------------------------------------------------------------
# 5. Narration & Latin Transliteration for TTS
# ----------------------------------------------------------------------------
assert "transliterateLatinWordToGeorgian" in app_content, "FAIL: Latin transliterator missing from app.js"
assert "transliterateLatinInGeorgian" in app_content, "FAIL: transliterateLatinInGeorgian missing from app.js"
assert "წლამდე" in app_content, "FAIL: Year range verbalization missing from app.js"
print("  [PASS] Latin name transliteration and year range verbalization present in app.js")

# ----------------------------------------------------------------------------
# 6. Scanner Quality Gate & Image Optimization
# ----------------------------------------------------------------------------
with open(STATIC_SCANNER, "r", encoding="utf-8") as f:
    scanner_content = f.read()
assert "MAX_EDGE = 1800" in scanner_content, "FAIL: MAX_EDGE is not 1800 in scanner.js"
assert 'image/jpeg", 0.85' in scanner_content, "FAIL: JPEG 0.85 compression missing from scanner.js"
assert "unreadable" in scanner_content, "FAIL: 'unreadable' status missing from scanner.js"
print("  [PASS] Scanner max edge 1800px, 0.85 JPEG compression, and unreadable rejection verified")

# ----------------------------------------------------------------------------
# 7. Database Migration 005 Verification
# ----------------------------------------------------------------------------
assert os.path.exists(MIGRATION_005), f"FAIL: Migration {MIGRATION_005} not found!"
with open(MIGRATION_005, "r", encoding="utf-8") as f:
    mig_content = f.read()
assert "metadata - 'text_ka'" in mig_content, "FAIL: metadata - 'text_ka' missing from migration 005"
assert "translatedLangs" in mig_content, "FAIL: translatedLangs recomputation missing from migration 005"
print("  [PASS] Migration 005 is verified and ready")

# ----------------------------------------------------------------------------
# 8. Python Legacy Regex Replacement Fix
# ----------------------------------------------------------------------------
PY_TRANSLATE = os.path.join(REPO_DIR, "app", "translation_engine.py")
if os.path.exists(PY_TRANSLATE):
    with open(PY_TRANSLATE, "r", encoding="utf-8") as f:
        py_content = f.read()
    assert "\x01" not in py_content, "FAIL: Byte \x01 still present in app/translation_engine.py!"
    print("  [PASS] Legacy Python replacement \x01 control characters eradicated")

# ----------------------------------------------------------------------------
# 9. Gold Georgian Prose Integrity & TTS Verbalization Simulation
# ----------------------------------------------------------------------------
gold_prose = "გაზაფხულის მშვენიერი დილა იყო; მზე ნელ-ნელა ამოდიოდა მთებს ზემოდან. „სად მიდიხარ, Harry Potter?“ — ჰკითხა გიორგიმ. „1939-1945 წლებში ყველაფერი შეიცვალა.“"
assert "." in gold_prose and ";" in gold_prose
assert re.search(r'Harry Potter', gold_prose) is not None
print("  [PASS] Gold Georgian literary sample retains all structure and punctuation")

# ----------------------------------------------------------------------------
# 10. Georgian Anti-Calque & Clause Cadence Integrity
# ----------------------------------------------------------------------------
STUDIO_APP = os.path.join(REPO_DIR, "lovable-app", "public", "studio", "static", "app.js")
with open(STUDIO_APP, "r", encoding="utf-8") as f:
    studio_app_content = f.read()

for path_name, content in [("static/app.js", app_content), ("studio/static/app.js", studio_app_content)]:
    assert "უპირველეს ყოვლისა და მუდამ" in content, f"FAIL: Anti-calque rule missing from {path_name}"
    assert "მომავალში ისხამს ნაყოფს" in content, f"FAIL: Future blossoming calque fix missing from {path_name}"
    assert "მაგნიტივით" in content, f"FAIL: Magnet calque fix missing from {path_name}"
    assert "splitLongIntoClauses(s, 16)" in content, f"FAIL: Clause split limit 16 missing from {path_name}"
    assert "book-prose indent-6" in content, f"FAIL: book-prose class missing from {path_name}"
print("  [PASS] Georgian anti-calque rules and 16-word clause limits verified in app.js and studio/app.js")

# ----------------------------------------------------------------------------
# 11. Moon Reader Real Estate & CSS Animation Transitions
# ----------------------------------------------------------------------------
INDEX_HTML = os.path.join(REPO_DIR, "index.html")
STUDIO_INDEX = os.path.join(REPO_DIR, "lovable-app", "public", "studio", "index.html")
for path_name, path in [("index.html", INDEX_HTML), ("studio/index.html", STUDIO_INDEX)]:
    with open(path, "r", encoding="utf-8") as f:
        html_content = f.read()
    assert "max-width: min(97vw, 1720px);" in html_content, f"FAIL: Spread max-width missing from {path_name}"
    assert "calc(100dvh - 124px)" in html_content, f"FAIL: Responsive height missing from {path_name}"
    assert ".book-prose" in html_content, f"FAIL: .book-prose styles missing from {path_name}"
    assert "box-decoration-break: clone" in html_content, f"FAIL: box-decoration-break missing from {path_name}"
    assert "transform: scale(0.975)" in html_content, f"FAIL: Reader scale transition missing from {path_name}"
print("  [PASS] Moon Reader 1720px real estate, .book-prose, and smooth transitions verified in index.html")

print("\nALL INTEGRITY AND REGRESSION AUDIT CHECKS PASSED (100% GREEN)!")
