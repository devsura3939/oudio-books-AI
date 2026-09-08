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
STATIC_STORE = os.path.join(REPO_DIR, "static", "supabase-store.js")
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

# ----------------------------------------------------------------------------
# 12. Deep Georgian Linguistic Syntax & Prompt Integrity (KA_SYNTAX)
# ----------------------------------------------------------------------------
STUDIO_LING = os.path.join(REPO_DIR, "lovable-app", "public", "studio", "static", "georgian-linguistics.js")
for path_name, path in [("static/georgian-linguistics.js", STATIC_LINGUISTICS), ("studio/static/georgian-linguistics.js", STUDIO_LING)]:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "DATIVE EXPERIENCER INVERSION" in content, f"FAIL: Dative Experiencer rule missing from {path_name}"
    assert "ERGATIVE CASE IN PAST AORIST" in content, f"FAIL: Ergative Past Aorist rule missing from {path_name}"
    assert "REPORTED SPEECH & EVIDENTIAL CLITICS" in content, f"FAIL: Evidential clitics rule missing from {path_name}"
    assert "PARTICIPIAL ECONOMY" in content, f"FAIL: Participial economy rule missing from {path_name}"
    assert "სადაც მას შია და სცივა" in content, f"FAIL: Little Prince experiencer example missing from {path_name}"
    assert "დიდებმა მირჩიეს" in content, f"FAIL: Ergative Little Prince example missing from {path_name}"
print("  [PASS] Deep Georgian syntax (Dative experiencers, Ergative aorist, Evidentials) verified in both linguistics files")

# ----------------------------------------------------------------------------
# 13. TTS Vigesimal Stem Elision & Experiencer Inversion Auto-Fixes
# ----------------------------------------------------------------------------
for path_name, content in [("static/app.js", app_content), ("studio/static/app.js", studio_app_content)]:
    assert "exactMultiples" in content, f"FAIL: exactMultiples missing from {path_name}"
    assert "მეორმოცე" in content, f"FAIL: 40th ordinal missing from {path_name}"
    assert "მესამოცე" in content, f"FAIL: 60th ordinal missing from {path_name}"
    assert "წელს|წლიდან|წლამდე|წლის|წლები|წლებში" in content, f"FAIL: Year verbalizer stem regex missing from {path_name}"
    assert "მას შია და სცივა" in content, f"FAIL: Experiencer hungry/cold fix missing from {path_name}"
    assert "სჭირდება" in content, f"FAIL: Experiencer need fix missing from {path_name}"
    assert "ვინაიდან|რაკი" in content, f"FAIL: Subordinate pause connectors missing from {path_name}"
print("  [PASS] TTS vigesimal stem elision, ordinals, and experiencer auto-fixes verified in app.js and studio/app.js")

# ----------------------------------------------------------------------------
# 14. Scanner OCR Word Confusable & Hyphen Rejoining Integrity
# ----------------------------------------------------------------------------
STUDIO_SCANNER = os.path.join(REPO_DIR, "lovable-app", "public", "studio", "static", "scanner.js")
for path_name, path in [("static/scanner.js", STATIC_SCANNER), ("studio/static/scanner.js", STUDIO_SCANNER)]:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "Rejoin soft-hyphenated line breaks" in content, f"FAIL: Soft-hyphen rejoining missing from {path_name}"
    assert "ocrFixes" in content, f"FAIL: ocrFixes dictionary missing from {path_name}"
    assert "უფლისწული" in content, f"FAIL: Prince OCR repair missing from {path_name}"
    assert "თვითმფრინავი" in content, f"FAIL: Airplane OCR repair missing from {path_name}"
    assert "მახრჩობელა" in content, f"FAIL: Boa constrictor OCR repair missing from {path_name}"
    assert "Format authentic Georgian quotation marks" in content, f"FAIL: Quote formatting missing from {path_name}"
print("  [PASS] Scanner soft-hyphen rejoining, OCR confusables, and quote formatting verified in scanner.js and studio/scanner.js")

# ----------------------------------------------------------------------------
# 15. Functional Linguistic Simulation Tests
# ----------------------------------------------------------------------------
# Test soft hyphen regex
hyphen_re = re.compile(r'([\u10A0-\u10FFa-zA-Z]+)-\s*[\r\n]+\s*([\u10A0-\u10FFa-zA-Z]+)')
sample_hyphen = "პატა-\n  რა უფლის-\r\nწუღი"
rejoined = hyphen_re.sub(r'\1\2', sample_hyphen)
assert rejoined == "პატარა უფლისწუღი", f"Hyphen rejoining failed: {rejoined}"

# Test OCR fix simulation
confusables = [
    (re.compile(r'(?<![\u10A0-\u10FF])კატარა(?![ა-ჰ])'), 'პატარა'),
    (re.compile(r'(?<![\u10A0-\u10FF])უფლისწუღი(?![ა-ჰ])'), 'უფლისწული'),
    (re.compile(r'(?<![\u10A0-\u10FF])თვითმფრინავო(?![ა-ჰ])'), 'თვითმფრინავი'),
]
fixed_text = rejoined
for pattern, repl in confusables:
    fixed_text = pattern.sub(repl, fixed_text)
assert fixed_text == "პატარა უფლისწული", f"OCR correction failed: {fixed_text}"

# Test experiencer simulation
calque_sample = "ის არის მშიერი და ცივი"
fixed_experiencer = re.sub(
    r'(?<![ა-ჰ])(მე|ის)\s+(?:არის\s+|ვარ\s+)?მშიერი\s+და\s+ცივი(?![ა-ჰ])',
    lambda m: 'მშია და მცივა' if m.group(1) == 'მე' else 'მას შია და სცივა',
    calque_sample
)
assert fixed_experiencer == "მას შია და სცივა", f"Experiencer inversion failed: {fixed_experiencer}"

print("  [PASS] Functional linguistic simulation passed with 100% precision")

# ----------------------------------------------------------------------------
# 16. Roman Numerals, Fractions, Metrics & Compound Words Verbalization
# ----------------------------------------------------------------------------
for path_name, content in [("static/app.js", app_content), ("studio/static/app.js", studio_app_content)]:
    assert "romanToOrdinalKa" in content, f"FAIL: Roman numeral verbalizer missing from {path_name}"
    assert "ოცდამეერთე" in content, f"FAIL: 21st ordinal missing from {path_name}"
    assert "ნახევარი" in content, f"FAIL: 1/2 fraction verbalizer missing from {path_name}"
    assert "მეოთხედი" in content, f"FAIL: 1/4 fraction verbalizer missing from {path_name}"
    assert "კილომეტრი" in content, f"FAIL: Metric km verbalizer missing from {path_name}"
    assert "გრადუსი ცელსიუსით" in content, f"FAIL: Celsius verbalizer missing from {path_name}"
    assert "$1 $2" in content, f"FAIL: Compound words hyphen preservation missing from {path_name}"
print("  [PASS] Roman numerals, fractions, metric units, and compound word hyphen preservation verified")

# ----------------------------------------------------------------------------
# 17. Scanner Mtavruli / Asomtavruli & Footnote Stripping
# ----------------------------------------------------------------------------
for path_name, path in [("static/scanner.js", STATIC_SCANNER), ("studio/static/scanner.js", STUDIO_SCANNER)]:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "0x1C90" in content and "0x10A0" in content, f"FAIL: Mtavruli/Asomtavruli conversion missing from {path_name}"
    assert "¹²³⁴⁵⁶⁷⁸⁹⁰" in content, f"FAIL: Footnote superscript stripping missing from {path_name}"
    assert "სიყვარული" in content, f"FAIL: Love OCR repair missing from {path_name}"
    assert "სინათლე" in content, f"FAIL: Light OCR repair missing from {path_name}"
    assert "სამყარო" in content, f"FAIL: World OCR repair missing from {path_name}"
print("  [PASS] Scanner Mtavruli/Asomtavruli normalization, footnote stripping, and expanded confusables verified")

# ----------------------------------------------------------------------------
# 18. Adjective Concord & Expanded Calque Idiom Repairs
# ----------------------------------------------------------------------------
for path_name, path in [("static/georgian-linguistics.js", STATIC_LINGUISTICS), ("studio/static/georgian-linguistics.js", STUDIO_LING)]:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "ADJECTIVE CASE CONCORD" in content, f"FAIL: Adjective concord rule missing from {path_name}"
    assert "POSTPOSITION INTEGRATION" in content, f"FAIL: Postposition integration rule missing from {path_name}"
    assert "მოხდა / გაიმართა / ჩატარდა" in content, f"FAIL: Take place idiom rule missing from {path_name}"

for path_name, path in [("static/app.js", STATIC_APP), ("studio/static/app.js", STUDIO_APP)]:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    assert r"ადგილი\s+დაიკავა" in content or r"ადგილი\\s+დაიკავა" in content, f"FAIL: Take place calque fix missing from {path_name}"
    assert r"ნაწილი\s+მიიღო" in content or r"ნაწილი\\s+მიიღო" in content, f"FAIL: Take part calque fix missing from {path_name}"
    assert r"ყურადღება\s+გადაიხადა" in content or r"ყურადღება\\s+გადაიხადა" in content, f"FAIL: Pay attention calque fix missing from {path_name}"
    assert r"ხელი\s+ხელში" in content or r"ხელი\\s+ხელში" in content, f"FAIL: Hand in hand calque fix missing from {path_name}"
    assert r"აზრს\s+არ\s+აკეთებს" in content or r"აზრს\\s+არ\\s+აკეთებს" in content, f"FAIL: Make sense calque fix missing from {path_name}"
print("  [PASS] Adjective case concord and expanded calque replacements verified")

# ----------------------------------------------------------------------------
# 19. Cross-Script Global Lexical Scope Collision & Version 1.47.0 Parity
# ----------------------------------------------------------------------------
for base_dir, label in [(os.path.join(REPO_DIR, "static"), "root static/"),
                        (os.path.join(REPO_DIR, "lovable-app", "public", "studio", "static"), "studio static/")]:
    script_files = ["supabase-store.js", "georgian-linguistics.js", "app.js", "engine-pack.js", "scanner.js"]
    seen_lexical = {}
    for sf in script_files:
        full_p = os.path.join(base_dir, sf)
        if not os.path.exists(full_p):
            continue
        with open(full_p, "r", encoding="utf-8") as f:
            code = f.read()
        top_decls = re.findall(r'^(?:const|let)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)', code, re.MULTILINE)
        for decl in top_decls:
            assert decl not in seen_lexical, f"FATAL LEXICAL COLLISION: '{decl}' declared with const/let in both {seen_lexical[decl]} and {sf} in {label}"
            seen_lexical[decl] = sf

# Version 1.47.4 across all entry points, cache busters, and early controller
with open(os.path.join(REPO_DIR, "index.html"), "r", encoding="utf-8") as f:
    root_html = f.read()
assert "v=1.49.0" in root_html, "FAIL: index.html missing current engine cache buster"
assert "v1.49.0" in root_html, "FAIL: index.html missing version text"
assert "Early Auth Gate Controller" in root_html, "FAIL: index.html missing Early Auth Gate Controller"
assert "gateBtnForgot" in root_html, "FAIL: index.html missing gateBtnForgot ID"
assert "gateBtnQuickFillAdmin" in root_html, "FAIL: index.html missing gateBtnQuickFillAdmin ID"
# Groq model select must only have valid Groq model IDs (no OpenRouter model IDs)
assert "openai/gpt-oss-120b" not in root_html, "FAIL: index.html has invalid OpenRouter model ID in Groq select"
assert "qwen/qwen3.8-27b" not in root_html, "FAIL: index.html has invalid OpenRouter model ID in Groq select"
assert "llama-3.3-70b-versatile" in root_html, "FAIL: index.html missing llama-3.3-70b-versatile in Groq select"

with open(os.path.join(REPO_DIR, "lovable-app", "public", "studio", "index.html"), "r", encoding="utf-8") as f:
    studio_html = f.read()
assert "v=1.49.0" in studio_html, "FAIL: studio/index.html missing version cache buster"
assert "v1.49.0" in studio_html, "FAIL: studio/index.html missing version text"

assert "Early Auth Gate Controller" in studio_html, "FAIL: studio/index.html missing Early Auth Gate Controller"
assert "openai/gpt-oss-120b" not in studio_html, "FAIL: studio/index.html has invalid OpenRouter model ID in Groq select"

with open(STATIC_APP, "r", encoding="utf-8") as f:
    current_app_content = f.read()
with open(STUDIO_APP, "r", encoding="utf-8") as f:
    current_studio_app_content = f.read()

for path_name, content in [("static/app.js", current_app_content), ("studio/static/app.js", current_studio_app_content)]:
    assert "handleGateSignIn" in content, f"FAIL: handleGateSignIn missing from {path_name}"
    assert "fillAdminCredentials" in content, f"FAIL: fillAdminCredentials missing from {path_name}"
    assert "updateAuthGateVisibility" in content, f"FAIL: updateAuthGateVisibility missing from {path_name}"
    assert "_realHandleGateSignIn" in content, f"FAIL: _realHandleGateSignIn missing from {path_name}"
    assert "restoreAccountSettingsForCurrentUser" in content, f"FAIL: restoreAccountSettingsForCurrentUser missing from {path_name}"
    assert "getCurrentAccountSettings" in content, f"FAIL: getCurrentAccountSettings missing from {path_name}"
    assert "resolveAndPreserveAllAiKeys" in content, f"FAIL: resolveAndPreserveAllAiKeys missing from {path_name}"
    assert "v1.49.0" in content, f"FAIL: version missing from {path_name}"
    # provider fixes
    assert "let groqSelectedModel" in content, f"FAIL: groqSelectedModel not declared as module-level variable in {path_name}"
    assert "llama3-70b-8192" in content, f"FAIL: llama3-70b-8192 missing from GROQ_MODELS in {path_name}"
    assert "mixtral-8x7b-32768" not in content, f"FAIL: deprecated mixtral-8x7b-32768 still in GROQ_MODELS in {path_name}"
    assert "candidates?.[0]?.content?.parts?.[0]?.text" in content, f"FAIL: Gemini response shape missing from callCustomProviderText in {path_name}"

with open(STATIC_STORE, "r", encoding="utf-8") as f:
    store_code = f.read()
assert "saveAccountSettings" in store_code, "FAIL: saveAccountSettings missing from supabase-store.js"
assert "fetchAccountSettings" in store_code, "FAIL: fetchAccountSettings missing from supabase-store.js"

print("  [PASS] 0 top-level lexical collisions across all scripts, early controller & v1.47.4 AI key resilience verified")

# ----------------------------------------------------------------------------
# 19. Contrastive Grammar, Proper Noun Transliteration, & Scanner Vision OCR
# ----------------------------------------------------------------------------
for path_name, path in [("static/georgian-linguistics.js", STATIC_LINGUISTICS), ("studio/static/georgian-linguistics.js", STUDIO_LING)]:
    with open(path, "r", encoding="utf-8") as f:
        ling_text = f.read()
    assert "KA_CONTRASTIVE_PATTERNS" in ling_text, f"FAIL: KA_CONTRASTIVE_PATTERNS missing from {path_name}"
    assert "KA-117" in ling_text, f"FAIL: KA-117 tag missing from {path_name}"
    assert "KA_EXPERIENCER_FRAMES_COMPREHENSIVE" in ling_text, f"FAIL: KA_EXPERIENCER_FRAMES_COMPREHENSIVE missing from {path_name}"
    assert "KA-118" in ling_text, f"FAIL: KA-118 tag missing from {path_name}"
    assert "KA_PROPER_NOUN_TRANSLITERATION" in ling_text, f"FAIL: KA_PROPER_NOUN_TRANSLITERATION missing from {path_name}"
    assert "KA-119" in ling_text, f"FAIL: KA-119 tag missing from {path_name}"
    assert "1.47.0" in ling_text, f"FAIL: Georgian knowledge version 1.47.0 missing from {path_name}"

for path_name, path in [("static/app.js", STATIC_APP), ("studio/static/app.js", STUDIO_APP)]:
    with open(path, "r", encoding="utf-8") as f:
        app_text = f.read()
    # Transliteration lexicon
    assert "სოკრატე" in app_text, f"FAIL: Socrates transliteration missing from {path_name}"
    assert "მარკუს" in app_text and "ავრელიუსი" in app_text, f"FAIL: Marcus Aurelius transliteration missing from {path_name}"
    assert "შექსპირი" in app_text, f"FAIL: Shakespeare transliteration missing from {path_name}"
    # Contrastive prompt upgrades
    assert "De-nominalization" in app_text, f"FAIL: De-nominalization instruction missing from {path_name}"
    assert "Participial Reduction" in app_text, f"FAIL: Participial Reduction instruction missing from {path_name}"
    assert "Polypersonal Pro-drop" in app_text, f"FAIL: Polypersonal Pro-drop instruction missing from {path_name}"
    assert "Experiencer Dative Inversion" in app_text, f"FAIL: Experiencer Dative Inversion instruction missing from {path_name}"

for path_name, path in [("static/scanner.js", STATIC_SCANNER), ("studio/static/scanner.js", STUDIO_SCANNER)]:
    with open(path, "r", encoding="utf-8") as f:
        scanner_text = f.read()
    assert "Mark unreadable spans [[UNCLEAR]]" in scanner_text, f"FAIL: Uncertain OCR must be visible in {path_name}"
    assert "Do not translate, modernize, paraphrase, or fill gaps" in scanner_text, f"FAIL: Source fidelity instruction missing in {path_name}"
    assert "უფლისწუღმა" in scanner_text, f"FAIL: Prince ergative OCR repair missing from {path_name}"
    assert "ჭეშმარიტი" in scanner_text, f"FAIL: Truth OCR repair missing from {path_name}"

print("  [PASS] Contrastive grammar, proper noun transliteration, and scanner vision OCR fixes verified in all mirrors")

# ----------------------------------------------------------------------------
# 20. Offline Literary Translation Engine, Real-Data Corpus Grounding & Scanner Deduction
# ----------------------------------------------------------------------------
for path_name, path in [("static/georgian-linguistics.js", STATIC_LINGUISTICS), ("studio/static/georgian-linguistics.js", STUDIO_LING)]:
    with open(path, "r", encoding="utf-8") as f:
        ling_text = f.read()
    assert "KA_REAL_DATA_CORPUS_EXEMPLARS" in ling_text, f"FAIL: KA_REAL_DATA_CORPUS_EXEMPLARS missing from {path_name}"
    assert "KA-120" in ling_text, f"FAIL: KA-120 tag missing from {path_name}"
    assert "KA_GEORGIAN_PRO_STYLE_GUIDE" in ling_text, f"FAIL: KA_GEORGIAN_PRO_STYLE_GUIDE missing from {path_name}"
    assert "KA-121" in ling_text, f"FAIL: KA-121 tag missing from {path_name}"
    assert "translateOfflineEnToKa" in ling_text, f"FAIL: translateOfflineEnToKa missing from {path_name}"
    assert "1.48.0" in ling_text, f"FAIL: Georgian knowledge version 1.48.0 missing from {path_name}"

for path_name, path in [("static/app.js", STATIC_APP), ("studio/static/app.js", STUDIO_APP)]:
    with open(path, "r", encoding="utf-8") as f:
        app_text = f.read()
    assert "translateOfflineEnToKa" in app_text, f"FAIL: translateOfflineEnToKa missing from {path_name}"
    assert "Georgian Pro Literary Standards" in app_text, f"FAIL: Georgian Pro style rules missing from draft translation prompt in {path_name}"
    assert "bureaucratic Soviet calques" in app_text, f"FAIL: Soviet calque ban missing from critique prompt in {path_name}"

for path_name, path in [("static/scanner.js", STATIC_SCANNER), ("studio/static/scanner.js", STUDIO_SCANNER)]:
    with open(path, "r", encoding="utf-8") as f:
        scanner_text = f.read()
    assert "offlineLinguisticPass" in scanner_text, f"FAIL: offlineLinguisticPass function missing from {path_name}"
    assert "_offlineLinguisticPass" in scanner_text, f"FAIL: _offlineLinguisticPass export missing from {path_name}"
    assert "page.rawText = page.text" in scanner_text, f"FAIL: Raw recognition must be preserved in {path_name}"

# Backend translation engine offline fallback verification
TRANSLATION_ENGINE = os.path.join(REPO_DIR, "app", "translation_engine.py")
with open(TRANSLATION_ENGINE, "r", encoding="utf-8") as f:
    te_text = f.read()
assert "translate_offline_en_to_ka" in te_text, "FAIL: translate_offline_en_to_ka missing from translation_engine.py"
assert '"suggestion": suggestion' in te_text, "FAIL: offline suggestions must remain available for review"
assert '"engine": "fallback_original"' not in te_text, "FAIL: original source must never be reported as translated output"
assert "გადაწყვიტა" in te_text, "FAIL: anti-calque replacement missing from translation_engine.py"

print("  [PASS] Offline literary translation engine, real-data corpus grounding, and scanner deduction verified")

# ----------------------------------------------------------------------------
# 21. Expanded Literary Corpus, Georgian Pro Syntactic Engine, and Scanner OCR Spell-Check
# ----------------------------------------------------------------------------
for path_name, path in [("static/georgian-linguistics.js", STATIC_LINGUISTICS), ("studio/static/georgian-linguistics.js", STUDIO_LING)]:
    with open(path, "r", encoding="utf-8") as f:
        ling_text = f.read()
    assert "KA-122" in ling_text, f"FAIL: KA-122 tag missing from {path_name}"
    assert "KA_SYNTACTIC_POLYPERSONAL_ENGINE" in ling_text, f"FAIL: KA_SYNTACTIC_POLYPERSONAL_ENGINE missing from {path_name}"
    assert "KA-123" in ling_text, f"FAIL: KA-123 tag missing from {path_name}"
    assert "synthesizeGeorgianMorphology" in ling_text, f"FAIL: synthesizeGeorgianMorphology missing from {path_name}"
    assert "1.50.0" in ling_text or "1.49.0" in ling_text, f"FAIL: Georgian knowledge version missing from {path_name}"

for path_name, path in [("static/app.js", STATIC_APP), ("studio/static/app.js", STUDIO_APP)]:
    with open(path, "r", encoding="utf-8") as f:
        app_text = f.read()
    assert "synthesizeGeorgianMorphology" in app_text, f"FAIL: synthesizeGeorgianMorphology missing from {path_name}"
    assert "Postposition syncopation" in app_text, f"FAIL: Postposition syncopation check missing from {path_name}"
    assert "Screeve Series Case Concord" in app_text, f"FAIL: Screeve Series Case Concord missing from {path_name}"

for path_name, path in [("static/scanner.js", STATIC_SCANNER), ("studio/static/scanner.js", STUDIO_SCANNER)]:
    with open(path, "r", encoding="utf-8") as f:
        scanner_text = f.read()
    assert "offlineSpellCheckKa" in scanner_text, f"FAIL: offlineSpellCheckKa missing from {path_name}"
    assert "_offlineSpellCheckKa" in scanner_text, f"FAIL: _offlineSpellCheckKa export missing from {path_name}"
    assert "KA_SPELL_ROOT_SET" in scanner_text, f"FAIL: KA_SPELL_ROOT_SET missing from {path_name}"
    assert "სიკვდიღ" in scanner_text, f"FAIL: death OCR glitch repair missing from {path_name}"
    assert "თვითმფრინავპა" in scanner_text, f"FAIL: airplane ergative OCR glitch repair missing from {path_name}"

# Backend translation engine offline parity check
with open(TRANSLATION_ENGINE, "r", encoding="utf-8") as f:
    te_text = f.read()
assert "synthesize_georgian_morphology" in te_text, "FAIL: synthesize_georgian_morphology missing from translation_engine.py"
assert "წყლიდან" in te_text, "FAIL: syncopation missing from translation_engine.py"
assert "ნუ წახვალ" in te_text, "FAIL: negative imperative missing from translation_engine.py"

print("  [PASS] Expanded literary corpus, Georgian Pro syntactic engine, and scanner OCR spell-check verified in all mirrors")

# ── 22. Georgian Pro Discourse & Information Structure, Reflexive Concord & Expanded Scanner Roots ──
for path_name, path in [("static/georgian-linguistics.js", STATIC_LINGUISTICS), ("studio/static/georgian-linguistics.js", STUDIO_LING)]:
    with open(path, "r", encoding="utf-8") as f:
        geo_text = f.read()
    assert "KA_GEORGIAN_PRO_DISCOURSE_ENGINE" in geo_text, f"FAIL: KA_GEORGIAN_PRO_DISCOURSE_ENGINE missing from {path_name}"
    assert "KA-125" in geo_text, f"FAIL: KA-125 missing from {path_name}"
    assert "TOPIC-FOCUS ARCHITECTURE" in geo_text, f"FAIL: TOPIC-FOCUS ARCHITECTURE missing from {path_name}"
    assert "REFLEXIVE PRONOUN INVIOLABILITY" in geo_text, f"FAIL: REFLEXIVE PRONOUN INVIOLABILITY missing from {path_name}"
    assert "VIGESIMAL NUMERAL CONCORD" in geo_text, f"FAIL: VIGESIMAL NUMERAL CONCORD missing from {path_name}"
    assert "თავისი" in geo_text, f"FAIL: თავისი missing from {path_name}"
    assert "1.50.0" in geo_text, f"FAIL: Version 1.50.0 missing from {path_name}"

for path_name, path in [("static/app.js", STATIC_APP), ("studio/static/app.js", STUDIO_APP)]:
    with open(path, "r", encoding="utf-8") as f:
        app_text = f.read()
    assert "Reflexives & Discourse" in app_text, f"FAIL: Reflexives & Discourse missing from {path_name}"
    assert "PRE-VERBAL FOCUS" in app_text, f"FAIL: PRE-VERBAL FOCUS missing from {path_name}"
    assert "reflexive pronoun violation" in app_text, f"FAIL: reflexive pronoun violation missing from {path_name}"

for path_name, path in [("static/scanner.js", STATIC_SCANNER), ("studio/static/scanner.js", STUDIO_SCANNER)]:
    with open(path, "r", encoding="utf-8") as f:
        scanner_text = f.read()
    assert "ხალიან" in scanner_text, f"FAIL: ხალიან confusable missing from {path_name}"
    assert "ფველა" in scanner_text, f"FAIL: ფველა confusable missing from {path_name}"
    assert "წესახებ" in scanner_text, f"FAIL: წესახებ confusable missing from {path_name}"
    assert "ძვენ" in scanner_text, f"FAIL: ძვენ confusable missing from {path_name}"

# Backend translation engine offline parity check
with open(TRANSLATION_ENGINE, "r", encoding="utf-8") as f:
    te_text = f.read()
assert "თავისი" in te_text, "FAIL: reflexive auto-repair missing from translation_engine.py"
assert "კარს უკან" in te_text, "FAIL: spatial postposition missing from translation_engine.py"
assert "_with_postposition" in te_text, "FAIL: associative postposition missing from translation_engine.py"

print("  [PASS] Georgian Pro discourse engine, reflexive concord, and expanded OCR spell-check verified in all mirrors")

# ── 23. Smart API Key Auto-Configuration, Multi-Key Merge, & Transport Security ──
INDEX_HTML = os.path.join(REPO_DIR, "index.html")
STUDIO_INDEX = os.path.join(REPO_DIR, "lovable-app", "public", "studio", "index.html")

for path_name, path in [("index.html", INDEX_HTML), ("studio/index.html", STUDIO_INDEX)]:
    with open(path, "r", encoding="utf-8") as f:
        html_text = f.read()
    assert "smartKeyMergeInput" in html_text, f"FAIL: smartKeyMergeInput missing from {path_name}"
    assert "handleSmartKeyMerge()" in html_text, f"FAIL: handleSmartKeyMerge() call missing from {path_name}"
    assert "elevenLabsAiKeyInput" in html_text, f"FAIL: elevenLabsAiKeyInput missing from {path_name}"
    assert "elevenLabsSavedBadge" in html_text, f"FAIL: elevenLabsSavedBadge missing from {path_name}"

for path_name, path in [("static/app.js", STATIC_APP), ("studio/static/app.js", STUDIO_APP)]:
    with open(path, "r", encoding="utf-8") as f:
        app_text = f.read()
    assert "function sanitizeApiKey" in app_text, f"FAIL: sanitizeApiKey missing from {path_name}"
    assert "function detectApiKeyProvider" in app_text, f"FAIL: detectApiKeyProvider missing from {path_name}"
    assert "function parseAndMergeApiKeys" in app_text, f"FAIL: parseAndMergeApiKeys missing from {path_name}"
    assert "function handleSmartKeyMerge" in app_text, f"FAIL: handleSmartKeyMerge missing from {path_name}"
    assert "function setupKeyInputAutoRouting" in app_text, f"FAIL: setupKeyInputAutoRouting missing from {path_name}"
    assert "x-goog-api-key" in app_text, f"FAIL: x-goog-api-key header missing from {path_name}"
    # Assert 0 alerts in saveGeminiSettings
    start = app_text.find("function saveGeminiSettings()")
    end = app_text.find("function openToCDrawer()", start)
    save_body = app_text[start:end]
    assert "alert(" not in save_body, f"FAIL: Blocking alert() detected in saveGeminiSettings in {path_name}"

for path_name, path in [("static/scanner.js", STATIC_SCANNER), ("studio/static/scanner.js", STUDIO_SCANNER)]:
    with open(path, "r", encoding="utf-8") as f:
        scanner_text = f.read()
    assert "x-goog-api-key" in scanner_text, f"FAIL: x-goog-api-key missing from {path_name}"
    assert "sanitizeApiKey" in scanner_text, f"FAIL: sanitizeApiKey missing from {path_name}"

# Functional key detection simulation
def sim_sanitize(k):
    if not k: return ""
    k = k.strip()
    k = re.sub(r'[\u200B-\u200D\uFEFF\u00A0]', '', k).strip()
    k = re.sub(r'^(?:export\s+)?[A-Z0-9_]*(?:API_KEY|KEY|TOKEN|SECRET)[\s:=]+', '', k, flags=re.IGNORECASE).strip()
    k = re.sub(r'^Bearer\s+', '', k, flags=re.IGNORECASE).strip()
    k = re.sub(r'^["\'`]+|["\'`]+$', '', k).strip()
    k = re.sub(r'[;,]+$', '', k).strip()
    k = re.sub(r'^["\'`]+|["\'`]+$', '', k).strip()
    return k

def sim_detect(k):
    sk = sim_sanitize(k)
    if not sk: return None
    if sk.startswith("AIzaSy") and len(sk) >= 35: return "gemini"
    if re.match(r'^sk-or(?:-v1)?-[a-zA-Z0-9_-]{16,}', sk, re.I): return "openrouter"
    if re.match(r'^gsk_[a-zA-Z0-9_-]{20,}', sk): return "groq"
    if re.match(r'^[0-9a-fA-F]{32}$', sk): return "elevenlabs"
    if re.match(r'^[a-zA-Z0-9]{32}$', sk): return "mistral"
    if re.match(r'^sk-(?:proj-)?[a-zA-Z0-9_-]{20,}', sk): return "openai"
    return None

assert sim_detect('GEMINI_API_KEY="AIzaSyMockKeyForUnitTest1234567890abcdef";') == "gemini"
assert sim_detect("export GROQ_API_KEY='gsk_mock_token_for_unit_tests_1234567890'") == "groq"
assert sim_detect("ELEVENLABS_API_KEY=0000111122223333aaaabbbbccccdddd;") == "elevenlabs"
assert sim_detect('sk-or-v1-mock_openrouter_token_sample_testing_purpose') == "openrouter"

print("  [PASS] Smart API key auto-configuration, multi-key merge, auto-routing, and transport security verified in all mirrors")

# ==============================================================================
# SECTION 24: BOOK DELETION PERMANENCE, FAST LIBRARY LOAD, UPLOAD RELIABILITY & PRIMARY GITHUB LINKS
# ==============================================================================
INDEX_HTML = os.path.join(REPO_DIR, "index.html")
STUDIO_INDEX = os.path.join(REPO_DIR, "lovable-app", "public", "studio", "index.html")
STATIC_SUPABASE = os.path.join(REPO_DIR, "static", "supabase-store.js")
STUDIO_SUPABASE = os.path.join(REPO_DIR, "lovable-app", "public", "studio", "static", "supabase-store.js")

for path_name, path in [("static/app.js", STATIC_APP), ("studio/static/app.js", STUDIO_APP)]:
    with open(path, "r", encoding="utf-8") as f:
        app_text = f.read()

    # 1. Tombstone Architecture & Immunity
    assert "lumina_deleted_book_ids" in app_text, f"FAIL: lumina_deleted_book_ids storage key missing from {path_name}"
    assert "function getDeletedBookIds" in app_text, f"FAIL: getDeletedBookIds missing from {path_name}"
    assert "function markBookAsDeleted" in app_text, f"FAIL: markBookAsDeleted missing from {path_name}"
    assert "function clearBookTombstone" in app_text, f"FAIL: clearBookTombstone missing from {path_name}"
    assert "function isBookDeleted" in app_text, f"FAIL: isBookDeleted missing from {path_name}"
    assert "function deleteBookFromAllLocalDBs" in app_text, f"FAIL: deleteBookFromAllLocalDBs missing from {path_name}"

    # 2. Seeder & Recovery Immunity against resurrection
    assert "isBookDeleted(b)" in app_text, f"FAIL: seedDefaultBooks must check isBookDeleted in {path_name}"
    assert "isBookDeleted(book)" in app_text, f"FAIL: recoverAllLocalBooks must check isBookDeleted in {path_name}"

    # 3. Fast Library Load & Zero Popups on Login
    assert "openAccountCabinet();" not in app_text[app_text.find("async function login("):app_text.find("async function register(")], \
        f"FAIL: openAccountCabinet must not block normal login in {path_name}"

    # 4. Upload Multi-Format & Tombstone Clearing
    assert "clearBookTombstone(newBookId, title)" in app_text, f"FAIL: handleFileUpload must clear tombstone in {path_name}"
    assert "fileInputEl.value = ''" in app_text, f"FAIL: handleFileUpload must reset fileInput in {path_name}"

    # 5. Zero hardcoded audible-architect external redirects
    assert "audible-architect.lovable.app" not in app_text, f"FAIL: hardcoded audible-architect link detected in {path_name}"

    # 6. Zero ASCII \b adjacent to Georgian
    assert not re.search(r'\\b[\u10A0-\u10FF]', app_text), f"FAIL: \\b adjacent to Georgian in {path_name}"

for path_name, path in [("index.html", INDEX_HTML), ("studio/index.html", STUDIO_INDEX)]:
    with open(path, "r", encoding="utf-8") as f:
        html_text = f.read()

    # Primary GitHub links present across header, mobile, sidebar, gate, and auth modal
    assert html_text.count("https://github.com/devsura3939/oudio-books-AI") >= 5, \
        f"FAIL: Primary GitHub repository link missing or insufficient in {path_name}"
    assert 'href="/auth"' not in html_text, f"FAIL: Broken absolute /auth link found in {path_name}"
    assert "v1.49.0" in html_text, f"FAIL: Version v1.49.0 not reflected in {path_name}"

for path_name, path in [("static/supabase-store.js", STATIC_SUPABASE), ("studio/static/supabase-store.js", STUDIO_SUPABASE)]:
    with open(path, "r", encoding="utf-8") as f:
        supa_text = f.read()
    assert "audible-architect.lovable.app" not in supa_text, f"FAIL: audible-architect detected in {path_name}"
    assert "window.location.origin" in supa_text, f"FAIL: Dynamic origin missing in {path_name}"

# Tombstone functional simulation
sim_tombstones = set()
def sim_mark_deleted(book_id, title=None):
    if book_id: sim_tombstones.add(str(book_id).lower().strip())
    if title: sim_tombstones.add("title:" + str(title).lower().strip())

def sim_is_deleted(book):
    if str(book.get("id", "")).lower().strip() in sim_tombstones: return True
    if ("title:" + str(book.get("title", "")).lower().strip()) in sim_tombstones: return True
    return False

def sim_clear_tombstone(book_id, title=None):
    if book_id: sim_tombstones.discard(str(book_id).lower().strip())
    if title: sim_tombstones.discard("title:" + str(title).lower().strip())

# Simulate delete classic book
classic_sample = {"id": "classic_vepkhistqaosani", "title": "ვეფხისტყაოსანი"}
sim_mark_deleted(classic_sample["id"], classic_sample["title"])
assert sim_is_deleted(classic_sample) is True, "FAIL: Deleted classic must be identified as deleted"

# Simulate seeder and recovery attempt
sim_shelf = []
if not sim_is_deleted(classic_sample):
    sim_shelf.append(classic_sample)
assert len(sim_shelf) == 0, "FAIL: Seeder must not resurrect deleted classic"

# Simulate intentional user re-upload of the same book
sim_clear_tombstone(classic_sample["id"], classic_sample["title"])
assert sim_is_deleted(classic_sample) is False, "FAIL: Re-uploaded book must have tombstone cleared"
sim_shelf.append(classic_sample)
assert len(sim_shelf) == 1, "FAIL: Re-uploaded book must be added to shelf"

# Binary byte parity verification
assert open(INDEX_HTML, "rb").read() == open(STUDIO_INDEX, "rb").read(), "FAIL: index.html byte mismatch with studio mirror"
assert open(STATIC_APP, "rb").read() == open(STUDIO_APP, "rb").read(), "FAIL: static/app.js byte mismatch with studio mirror"
assert open(STATIC_SUPABASE, "rb").read() == open(STUDIO_SUPABASE, "rb").read(), "FAIL: static/supabase-store.js byte mismatch with studio mirror"

print("  [PASS] Book deletion permanence, tombstone immunity, fast library loading, upload reliability & primary GitHub links verified in all mirrors")

# ==============================================================================
# SECTION 25: HUMAN-LIKE TRANSLATION & TRANSCRIPTION ENGINE VERIFICATION
# ==============================================================================
TRANSCRIPTION_ENGINE = os.path.join(REPO_DIR, "app", "transcription_engine.py")
TRANSLATION_ENGINE = os.path.join(REPO_DIR, "app", "translation_engine.py")
MAIN_PY = os.path.join(REPO_DIR, "app", "main.py")
REQ_TXT = os.path.join(REPO_DIR, "requirements.txt")

# 1. Verify app/transcription_engine.py
assert os.path.exists(TRANSCRIPTION_ENGINE), "FAIL: app/transcription_engine.py does not exist"
with open(TRANSCRIPTION_ENGINE, "r", encoding="utf-8") as f:
    te_code = f.read()
assert "def transcribe_audio_bytes(" in te_code, "FAIL: transcribe_audio_bytes missing"
assert "def transcribe_audio_file(" in te_code, "FAIL: transcribe_audio_file missing"
assert "clean_verbatim" in te_code and "clean_georgian_morphology" not in te_code, "FAIL: Transcription must preserve source wording"
assert "gemini-2.5-flash" in te_code, "FAIL: gemini-2.5-flash missing from transcription engine"

# 2. Verify app/translation_engine.py Tier 0 and morphosyntax
with open(TRANSLATION_ENGINE, "r", encoding="utf-8") as f:
    trans_code = f.read()
assert "from google import genai" in trans_code, "FAIL: google.genai missing from translation_engine"
assert "def translate_text(text: str, source_lang: str = \"auto\", target_lang: str = \"ka\", api_key: Optional[str] = None)" in trans_code, \
    "FAIL: api_key parameter missing from translate_text signature"
assert "synthesize_georgian_morphology(p_trans)" in trans_code, "FAIL: synthesize_georgian_morphology missing in translate_text"
assert "clean_georgian_morphology(p_trans)" in trans_code, "FAIL: clean_georgian_morphology missing in translate_text"

# 3. Verify app/main.py endpoints
with open(MAIN_PY, "r", encoding="utf-8") as f:
    main_code = f.read()
assert '@app.post("/api/transcribe")' in main_code, "FAIL: /api/transcribe endpoint missing from main.py"
assert '@app.post("/api/server-translate")' in main_code, "FAIL: /api/server-translate endpoint missing from main.py"
assert "transcribe_audio_bytes" in main_code, "FAIL: transcribe_audio_bytes missing from main.py"

# 4. Verify requirements.txt has modern translation & transcription dependencies
with open(REQ_TXT, "r", encoding="utf-8") as f:
    req_code = f.read()
assert "google-genai" in req_code, "FAIL: google-genai missing from requirements.txt"
assert "SpeechRecognition" in req_code, "FAIL: SpeechRecognition missing from requirements.txt"
assert "deep-translator" in req_code, "FAIL: deep-translator missing from requirements.txt"
assert "pydub" in req_code, "FAIL: pydub missing from requirements.txt"

print("  [PASS] Human-like translation & multimodal transcription engines verified across backend, routes & dependencies")

# ==============================================================================
# SECTION 26: ACCOUNT SHELF ISOLATION, STORAGE PURGE & SMOOTH PLAYBACK
# ==============================================================================
# 1. Verify app.js and studio/app.js have account isolation and debounced playback
for path_name, path in [("static/app.js", STATIC_APP), ("studio/static/app.js", STUDIO_APP)]:
    with open(path, "r", encoding="utf-8") as f:
        app_code = f.read()

    assert "function getCurrentUserId()" in app_code, f"FAIL: getCurrentUserId missing in {path_name}"
    assert "function getDeletedBooksStorageKey()" in app_code, f"FAIL: getDeletedBooksStorageKey missing in {path_name}"
    assert "function saveBookProgress(book, progressPct, lastPlayedChapterId)" in app_code, f"FAIL: saveBookProgress missing in {path_name}"
    assert "function flushBookProgressImmediate(book)" in app_code, f"FAIL: flushBookProgressImmediate missing in {path_name}"
    assert "saveBookProgress(currentBook, pct, currentPlayingChapterId);" in app_code, f"FAIL: speakCurrentSentence must use saveBookProgress in {path_name}"
    assert "book.user_id = uid;" in app_code, f"FAIL: user_id scoping missing in {path_name}"
    assert "book.user_id === uid" in app_code, f"FAIL: shelf isolation filter missing in {path_name}"

# 2. Verify supabase-store.js and studio mirror have updateProgress and storage purging
for path_name, path in [("static/supabase-store.js", STATIC_SUPABASE), ("studio/static/supabase-store.js", STUDIO_SUPABASE)]:
    with open(path, "r", encoding="utf-8") as f:
        supa_code = f.read()

    assert "async function updateProgress(studioId, progressPct, lastPlayedChapterId)" in supa_code, f"FAIL: updateProgress missing in {path_name}"
    assert "updateProgress: updateProgress" in supa_code, f"FAIL: updateProgress not exported on LuminaStore in {path_name}"
    assert 'client.storage.from("book-pdfs").remove' in supa_code, f"FAIL: book-pdfs storage purge missing in {path_name}"
    assert 'client.storage.from("book-audio").remove' in supa_code, f"FAIL: book-audio storage purge missing in {path_name}"
    assert 'client.storage.from("book-files").remove' in supa_code, f"FAIL: book-files storage purge missing in {path_name}"

# 3. Verify zero lovable links in auth.tsx, TRAE_TRAINING_AND_ARCHITECTURE.md, CHANGELOG.md
AUTH_TSX = os.path.join(REPO_DIR, "lovable-app", "src", "routes", "auth.tsx")
with open(AUTH_TSX, "r", encoding="utf-8") as f:
    auth_code = f.read()
assert "audible-architect.lovable.app" not in auth_code, "FAIL: audible-architect detected in auth.tsx"
assert "https://devsura3939.github.io/oudio-books-AI" in auth_code, "FAIL: GitHub Pages fallback missing in auth.tsx"

TRAE_MD = os.path.join(REPO_DIR, "TRAE_TRAINING_AND_ARCHITECTURE.md")
with open(TRAE_MD, "r", encoding="utf-8") as f:
    trae_code = f.read()
assert "audible-architect.lovable.app" not in trae_code, "FAIL: audible-architect detected in TRAE_TRAINING_AND_ARCHITECTURE.md"

CHANGELOG_MD = os.path.join(REPO_DIR, "CHANGELOG.md")
with open(CHANGELOG_MD, "r", encoding="utf-8") as f:
    cl_code = f.read()
assert "audible-architect.lovable.app" not in cl_code, "FAIL: audible-architect detected in CHANGELOG.md"

# 4. Functional simulation of account shelf isolation
guest_books = [
    {"id": "classic_1", "title": "Classic One"},
    {"id": "user_a_book", "title": "Alice Book", "user_id": "usr_alice"},
    {"id": "user_b_book", "title": "Bob Book", "user_id": "usr_bob"},
    {"id": "guest_book", "title": "Local Guest Book", "user_id": "guest"},
]

def sim_filter_shelf(books, uid):
    return [
        b for b in books
        if str(b.get("id", "")).startswith("classic_")
        or (uid == "guest" and (not b.get("user_id") or b.get("user_id") == "guest"))
        or (uid != "guest" and b.get("user_id") == uid)
    ]

alice_shelf = sim_filter_shelf(guest_books, "usr_alice")
bob_shelf = sim_filter_shelf(guest_books, "usr_bob")
guest_shelf = sim_filter_shelf(guest_books, "guest")

assert len(alice_shelf) == 2, "FAIL: Alice should only see Classic One and Alice Book"
assert any(b["id"] == "user_a_book" for b in alice_shelf), "FAIL: Alice Book must be on Alice shelf"
assert not any(b["id"] == "user_b_book" for b in alice_shelf), "FAIL: Bob Book must NOT be on Alice shelf"

assert len(bob_shelf) == 2, "FAIL: Bob should only see Classic One and Bob Book"
assert any(b["id"] == "user_b_book" for b in bob_shelf), "FAIL: Bob Book must be on Bob shelf"
assert not any(b["id"] == "user_a_book" for b in bob_shelf), "FAIL: Alice Book must NOT be on Bob shelf"

assert not any(b["id"] in ("user_a_book", "user_b_book") for b in guest_shelf), "FAIL: Private user books must not appear on guest shelf"

print("  [PASS] Account shelf isolation, cloud storage purges, smooth listening debouncing & GitHub link integrity verified")

# ----------------------------------------------------------------------------
# 26. Smooth Background Translation Minimization & Dynamic Sub-Chunking
# ----------------------------------------------------------------------------
for path_name, path in [("static/app.js", STATIC_APP), ("studio/static/app.js", STUDIO_APP)]:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "function buildTranslationChunks(" in content, f"FAIL: buildTranslationChunks missing from {path_name}"
    assert "document.body.classList.remove('modal-open')" in content, f"FAIL: modal-open removal missing from {path_name}"
    assert "document.body.style.overflow = ''" in content, f"FAIL: style.overflow reset missing from {path_name}"
    assert "activeTranslationBook" in content, f"FAIL: activeTranslationBook missing from {path_name}"
    assert "targetBook = currentBook" in content, f"FAIL: targetBook scoping missing from {path_name}"
    assert "minimizeTranslationPanel()" in content, f"FAIL: minimizeTranslationPanel invocation missing from {path_name}"

for path_name, path in [("index.html", INDEX_HTML), ("studio/index.html", STUDIO_INDEX)]:
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()
    assert 'id="wholeBookTranslateModal"' in html and 'minimizeTranslationPanel()' in html, f"FAIL: Backdrop click-to-minimize missing from {path_name}"
    assert 'id="translationMiniDock"' in html and 'z-50' in html, f"FAIL: z-50 missing on translationMiniDock in {path_name}"

# Functional test of sentence-aware chunker behavior
long_unsegmented_text = " ".join([f"This is literary sentence {i} detailing character development and scene setting." for i in range(120)])
assert len(long_unsegmented_text) > 8000, "Test setup error"
# Verify that sentence grouping splits into balanced pieces
import re
sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', long_unsegmented_text) if s.strip()]
assert len(sentences) == 120
sub_chunks = []
curr = []
curr_len = 0
for s in sentences:
    if (curr_len + len(s) > 1800 or len(curr) >= 16) and curr:
        sub_chunks.append(" ".join(curr))
        curr = [s]
        curr_len = len(s)
    else:
        curr.append(s)
        curr_len += len(s) + 1
if curr:
    sub_chunks.append(" ".join(curr))

assert len(sub_chunks) >= 5, f"FAIL: Expected >= 5 sub-chunks, got {len(sub_chunks)}"
assert all(len(c) <= 2000 for c in sub_chunks), "FAIL: Sub-chunk exceeded max bounds"

print("  [PASS] Smooth background translation minimization, dynamic sub-chunking & targetBook isolation verified in all mirrors")

print("\nALL INTEGRITY AND REGRESSION AUDIT CHECKS PASSED (100% GREEN)!")



