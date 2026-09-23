"""
Autonomous Training Script for EngBot / Lumina Audio Studio
Expands benchmark cases with Rule Groups 51-65 literary test pairs,
injects corresponding calibrated training items, and trains active_pack_ka to v41+.
"""

import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.training_engine import (
    load_active_pack, save_active_pack,
    load_benchmark_cases, evaluate_pack,
    BENCHMARK_CASES_KA_FILE, ACTIVE_PACK_KA_FILE,
    SESSIONS_FILE, ITERATIONS_FILE
)

NEW_BENCHMARK_CASES = [
    # Rule 51: Mental state idioms
    {
        "id": "case-idiom-mind-01",
        "kind": "translate",
        "source": "მან დაკარგა თავისი გონება შიშის გამო.",
        "expected": "მან ჭკუიდან შეიშალა შიშის გამო.",
        "weight": 1.0,
        "tags": ["idiom", "psychological", "mind"]
    },
    {
        "id": "case-idiom-mind-02",
        "kind": "translate",
        "source": "მან შეცვალა თავისი გონება და დარჩა.",
        "expected": "მან გადაიფიქრა და დარჩა.",
        "weight": 1.0,
        "tags": ["idiom", "psychological", "mind"]
    },
    {
        "id": "case-idiom-mind-03",
        "kind": "translate",
        "source": "შეინახეთ გონებაში ეს გაკვეთილი.",
        "expected": "გაითვალისწინეთ ეს გაკვეთილი.",
        "weight": 1.0,
        "tags": ["idiom", "psychological", "mind"]
    },
    # Rule 52: Sensory gaze collocations
    {
        "id": "case-sensory-gaze-01",
        "kind": "translate",
        "source": "მან დაიჭირა მისი თვალი ბრბოში.",
        "expected": "მან თვალი მოჰკრა ბრბოში.",
        "weight": 1.0,
        "tags": ["sensory", "gaze", "collocation"]
    },
    {
        "id": "case-sensory-gaze-02",
        "kind": "translate",
        "source": "მან დაადო თვალი მას მაშინვე.",
        "expected": "მან თვალი შეავლო მას მაშინვე.",
        "weight": 1.0,
        "tags": ["sensory", "gaze", "collocation"]
    },
    {
        "id": "case-sensory-gaze-03",
        "kind": "translate",
        "source": "ერთი თვალის დახამხამებაში ყველაფერი გაქრა.",
        "expected": "თვალის დახამხამებაში ყველაფერი გაქრა.",
        "weight": 1.0,
        "tags": ["sensory", "gaze", "collocation"]
    },
    # Rule 53: Instrumental bodily organ singular concord
    {
        "id": "case-organ-singular-01",
        "kind": "translate",
        "source": "მან საკუთარი თვალებით ნახა სასწაული.",
        "expected": "მან საკუთარი თვალით ნახა სასწაული.",
        "weight": 1.0,
        "tags": ["morphosyntax", "organ", "instrumental"]
    },
    {
        "id": "case-organ-singular-02",
        "kind": "translate",
        "source": "მან საკუთარი ყურებით მოისმინა ხმა.",
        "expected": "მან საკუთარი ყურით მოისმინა ხმა.",
        "weight": 1.0,
        "tags": ["morphosyntax", "organ", "instrumental"]
    },
    {
        "id": "case-organ-singular-03",
        "kind": "translate",
        "source": "მან შიშველი ხელებით ააშენა სახლი.",
        "expected": "მან შიშველი ხელით ააშენა სახლი.",
        "weight": 1.0,
        "tags": ["morphosyntax", "organ", "instrumental"]
    },
    # Rule 54: Spatial binomials
    {
        "id": "case-spatial-binomial-01",
        "kind": "translate",
        "source": "ისინი იდგნენ გვერდი გვერდით ქარში.",
        "expected": "ისინი იდგნენ მხარდამხარ ქარში.",
        "weight": 1.0,
        "tags": ["spatial", "binomial", "motion"]
    },
    {
        "id": "case-spatial-binomial-02",
        "kind": "translate",
        "source": "მცველი უკან და წინ დადიოდა დილით.",
        "expected": "მცველი წინ და უკან დადიოდა დილით.",
        "weight": 1.0,
        "tags": ["spatial", "binomial", "motion"]
    },
    {
        "id": "case-spatial-binomial-03",
        "kind": "translate",
        "source": "გმირები სახე სახესთან შეხვდნენ.",
        "expected": "გმირები პირისპირ შეხვდნენ.",
        "weight": 1.0,
        "tags": ["spatial", "binomial", "motion"]
    },
    # Rule 55: Discourse transitions
    {
        "id": "case-discourse-trans-01",
        "kind": "translate",
        "source": "პირველ შეხედვაზე საქმე მარტივი იყო.",
        "expected": "ერთი შეხედვით საქმე მარტივი იყო.",
        "weight": 1.0,
        "tags": ["discourse", "transition"]
    },
    {
        "id": "case-discourse-trans-02",
        "kind": "translate",
        "source": "როგორც ფაქტის საკითხი, ის მართალი იყო.",
        "expected": "სინამდვილეში, ის მართალი იყო.",
        "weight": 1.0,
        "tags": ["discourse", "transition"]
    },
    {
        "id": "case-discourse-trans-03",
        "kind": "translate",
        "source": "ყველა მოულოდნელად ქარიშხალი ამოვარდა.",
        "expected": "უეცრად ქარიშხალი ამოვარდა.",
        "weight": 1.0,
        "tags": ["discourse", "transition"]
    },
    # Rule 56: Verba dicendi & inquit
    {
        "id": "case-inquit-dicendi-01",
        "kind": "translate",
        "source": "მან ჩურჩულით თქვა პასუხი სიბნელეში.",
        "expected": "მან ჩაიჩურჩულა პასუხი სიბნელეში.",
        "weight": 1.0,
        "tags": ["verba_dicendi", "inquit", "dialogue"]
    },
    {
        "id": "case-inquit-dicendi-02",
        "kind": "translate",
        "source": "მან ყვირილით თქვა გაფრთხილება ხალხს.",
        "expected": "მან დაიყვირა გაფრთხილება ხალხს.",
        "weight": 1.0,
        "tags": ["verba_dicendi", "inquit", "dialogue"]
    },
    {
        "id": "case-inquit-dicendi-03",
        "kind": "translate",
        "source": "მეფემ მისცა პასუხი ელჩს.",
        "expected": "მეფემ უპასუხა ელჩს.",
        "weight": 1.0,
        "tags": ["verba_dicendi", "inquit", "dialogue"]
    },
    # Rule 57: Involuntary somatic reflexes
    {
        "id": "case-somatic-reflex-01",
        "kind": "translate",
        "source": "მოგზაურმა გამოუშვა ოხვრა დაღლილობისგან.",
        "expected": "მოგზაურმა ამოიოხრა დაღლილობისგან.",
        "weight": 1.0,
        "tags": ["somatic", "reflex", "physiological"]
    },
    {
        "id": "case-somatic-reflex-02",
        "kind": "translate",
        "source": "მისი გული ჩაიძირა ცუდი ამბის გაგონებაზე.",
        "expected": "გული გადაუქანდა ცუდი ამბის გაგონებაზე.",
        "weight": 1.0,
        "tags": ["somatic", "reflex", "physiological"]
    },
    {
        "id": "case-somatic-reflex-03",
        "kind": "translate",
        "source": "მან აიღო ღრმა სუნთქვა ბრძოლის წინ.",
        "expected": "მან ღრმად ჩაისუნთქა ბრძოლის წინ.",
        "weight": 1.0,
        "tags": ["somatic", "reflex", "physiological"]
    },
    # Rule 58: Epistemic modals & stance
    {
        "id": "case-epistemic-modal-01",
        "kind": "translate",
        "source": "მიდის უთქმელად, რომ ეს მნიშვნელოვანია.",
        "expected": "თავისთავად ცხადია, რომ ეს მნიშვნელოვანია.",
        "weight": 1.0,
        "tags": ["epistemic", "modal", "stance"]
    },
    {
        "id": "case-epistemic-modal-02",
        "kind": "translate",
        "source": "ყველა ალბათობაში მატარებელი მოვა.",
        "expected": "დიდი ალბათობით მატარებელი მოვა.",
        "weight": 1.0,
        "tags": ["epistemic", "modal", "stance"]
    },
    {
        "id": "case-epistemic-modal-03",
        "kind": "translate",
        "source": "რომ თქვა სიმართლე, მე დავიღალე.",
        "expected": "სიმართლე რომ ითქვას, მე დავიღალე.",
        "weight": 1.0,
        "tags": ["epistemic", "modal", "stance"]
    },
    # Rule 59: Temporal duratives
    {
        "id": "case-temporal-durative-01",
        "kind": "translate",
        "source": "ისინი მუშაობდნენ მთელი დღე გრძელი ველზე.",
        "expected": "ისინი მუშაობდნენ მთელი დღის განმავლობაში ველზე.",
        "weight": 1.0,
        "tags": ["temporal", "durative", "aspect"]
    },
    {
        "id": "case-temporal-durative-02",
        "kind": "translate",
        "source": "დროის კურსში მეგობრობა განმტკიცდა.",
        "expected": "დროთა განმავლობაში მეგობრობა განმტკიცდა.",
        "weight": 1.0,
        "tags": ["temporal", "durative", "aspect"]
    },
    # Rule 60: Adversative & concessive antithesis
    {
        "id": "case-adversative-antithesis-01",
        "kind": "translate",
        "source": "საპირისპიროზე, მან მხარი დაუჭირა გეგმას.",
        "expected": "პირიქით, მან მხარი დაუჭირა გეგმას.",
        "weight": 1.0,
        "tags": ["adversative", "antithesis", "concessive"]
    },
    {
        "id": "case-adversative-antithesis-02",
        "kind": "translate",
        "source": "ერთ ხელზე ეს კარგია, მეორე ხელზე კი ძვირია.",
        "expected": "ერთი მხრივ ეს კარგია, მეორე მხრივ კი ძვირია.",
        "weight": 1.0,
        "tags": ["adversative", "antithesis", "concessive"]
    },
    # Rule 61: Auditory sound verbs
    {
        "id": "case-auditory-sound-01",
        "kind": "translate",
        "source": "კარი დაეჯახა დახურულად ქარის გამო.",
        "expected": "კარი გაჯახუნდა ქარის გამო.",
        "weight": 1.0,
        "tags": ["auditory", "sound", "acoustic"]
    },
    {
        "id": "case-auditory-sound-02",
        "kind": "translate",
        "source": "ძველი იატაკი ყვიროდა ნაბიჯების ქვეშ.",
        "expected": "ძველი იატაკი აჭრაჭუნდა ნაბიჯების ქვეშ.",
        "weight": 1.0,
        "tags": ["auditory", "sound", "acoustic"]
    },
    {
        "id": "case-auditory-sound-03",
        "kind": "translate",
        "source": "სიცივეში მისი კბილები ლაპარაკობდნენ.",
        "expected": "სიცივეში კბილი კბილზე ადიოდა.",
        "weight": 1.0,
        "tags": ["auditory", "sound", "acoustic"]
    },
    # Rule 62: Emotional metaphors
    {
        "id": "case-emotional-metaphor-01",
        "kind": "translate",
        "source": "მან დაკარგა ტემპერამენტი კამათის დროს.",
        "expected": "მან მოთმინება დაკარგა კამათის დროს.",
        "weight": 1.0,
        "tags": ["emotional", "cognitive", "metaphor"]
    },
    {
        "id": "case-emotional-metaphor-02",
        "kind": "translate",
        "source": "მან შეინარჩუნა სიგრილე საფრთხის წინაშე.",
        "expected": "მან სიმშვიდე შეინარჩუნა საფრთხის წინაშე.",
        "weight": 1.0,
        "tags": ["emotional", "cognitive", "metaphor"]
    },
    # Rule 63: Physical posture
    {
        "id": "case-physical-posture-01",
        "kind": "translate",
        "source": "ბერი იჯდა გადაჯვარედინებული ფეხებით ხალიჩაზე.",
        "expected": "ბერი ფეხმორთხმით იჯდა ხალიჩაზე.",
        "weight": 1.0,
        "tags": ["posture", "stative", "orientation"]
    },
    {
        "id": "case-physical-posture-02",
        "kind": "translate",
        "source": "ბავშვი იდგა ფეხის თითებზე ფანჯარასთან.",
        "expected": "ბავშვი ფეხის წვერებზე იდგა ფანჯარასთან.",
        "weight": 1.0,
        "tags": ["posture", "stative", "orientation"]
    },
    # Rule 64: Quantificational intensifiers
    {
        "id": "case-quantifier-degree-01",
        "kind": "translate",
        "source": "დიდით და ვრცელით ეს წარმატება იყო.",
        "expected": "მთლიანობაში ეს წარმატება იყო.",
        "weight": 1.0,
        "tags": ["quantifier", "degree", "intensifier"]
    },
    {
        "id": "case-quantifier-degree-02",
        "kind": "translate",
        "source": "ისინი ერთხელ ლურჯ მთვარეზე ნახულობდნენ ერთმანეთს.",
        "expected": "ისინი ძალზე იშვიათად ნახულობდნენ ერთმანეთს.",
        "weight": 1.0,
        "tags": ["quantifier", "degree", "intensifier"]
    },
    # Rule 65: Polysemous motion directionals
    {
        "id": "case-motion-directional-01",
        "kind": "translate",
        "source": "მგზავრი მობრუნდა უკან გზაჯვარედინზე.",
        "expected": "მგზავრი გამობრუნდა გზაჯვარედინზე.",
        "weight": 1.0,
        "tags": ["motion", "directional", "phrasal"]
    },
    {
        "id": "case-motion-directional-02",
        "kind": "translate",
        "source": "მან მოშორებით შებრუნდა და წავიდა.",
        "expected": "მან ზურგი შეაქცია და წავიდა.",
        "weight": 1.0,
        "tags": ["motion", "directional", "phrasal"]
    }
]

NEW_TRAINING_RULES = [
    # Rule 51
    {"type": "glossary", "pattern": "დაკარგა თავისი გონება", "replacement": "ჭკუიდან შეიშალა", "note": "Lost his mind calque"},
    {"type": "glossary", "pattern": "შეცვალა თავისი გონება", "replacement": "გადაიფიქრა", "note": "Changed his mind calque"},
    {"type": "glossary", "pattern": "შეინახეთ გონებაში", "replacement": "გაითვალისწინეთ", "note": "Keep in mind calque"},
    # Rule 52
    {"type": "glossary", "pattern": "დაიჭირა მისი თვალი", "replacement": "თვალი მოჰკრა", "note": "Caught his eye calque"},
    {"type": "glossary", "pattern": "დაადო თვალი მას", "replacement": "თვალი შეავლო მას", "note": "Laid eyes on calque"},
    {"type": "glossary", "pattern": "ერთი თვალის დახამხამებაში", "replacement": "თვალის დახამხამებაში", "note": "Blink of eye calque"},
    # Rule 53
    {"type": "glossary", "pattern": "საკუთარი თვალებით", "replacement": "საკუთარი თვალით", "note": "Paired organ instrumental singular"},
    {"type": "glossary", "pattern": "საკუთარი ყურებით", "replacement": "საკუთარი ყურით", "note": "Paired organ instrumental singular"},
    {"type": "glossary", "pattern": "შიშველი ხელებით", "replacement": "შიშველი ხელით", "note": "Bare hands instrumental singular"},
    # Rule 54
    {"type": "glossary", "pattern": "გვერდი გვერდით", "replacement": "მხარდამხარ", "note": "Side by side binomial"},
    {"type": "glossary", "pattern": "უკან და წინ", "replacement": "წინ და უკან", "note": "Back and forth binomial"},
    {"type": "glossary", "pattern": "სახე სახესთან", "replacement": "პირისპირ", "note": "Face to face binomial"},
    # Rule 55
    {"type": "glossary", "pattern": "პირველ შეხედვაზე", "replacement": "ერთი შეხედვით", "note": "At first glance connector"},
    {"type": "glossary", "pattern": "როგორც ფაქტის საკითხი,", "replacement": "სინამდვილეში,", "note": "As a matter of fact connector"},
    {"type": "glossary", "pattern": "ყველა მოულოდნელად", "replacement": "უეცრად", "note": "All of a sudden connector"},
    # Rule 56
    {"type": "glossary", "pattern": "ჩურჩულით თქვა", "replacement": "ჩაიჩურჩულა", "note": "Whispered inquit verb"},
    {"type": "glossary", "pattern": "ყვირილით თქვა", "replacement": "დაიყვირა", "note": "Shouted inquit verb"},
    {"type": "glossary", "pattern": "მისცა პასუხი", "replacement": "უპასუხა", "note": "Gave answer light verb"},
    # Rule 57
    {"type": "glossary", "pattern": "გამოუშვა ოხვრა", "replacement": "ამოიოხრა", "note": "Let out a sigh somatic"},
    {"type": "glossary", "pattern": "მისი გული ჩაიძირა", "replacement": "გული გადაუქანდა", "note": "Heart sank somatic"},
    {"type": "glossary", "pattern": "აიღო ღრმა სუნთქვა", "replacement": "ღრმად ჩაისუნთქა", "note": "Deep breath somatic"},
    # Rule 58
    {"type": "glossary", "pattern": "მიდის უთქმელად,", "replacement": "თავისთავად ცხადია,", "note": "Goes without saying modal"},
    {"type": "glossary", "pattern": "ყველა ალბათობაში", "replacement": "დიდი ალბათობით", "note": "In all likelihood modal"},
    {"type": "glossary", "pattern": "რომ თქვა სიმართლე,", "replacement": "სიმართლე რომ ითქვას,", "note": "To tell the truth modal"},
    # Rule 59
    {"type": "glossary", "pattern": "მთელი დღე გრძელი", "replacement": "მთელი დღის განმავლობაში", "note": "All day long durative"},
    {"type": "glossary", "pattern": "დროის კურსში", "replacement": "დროთა განმავლობაში", "note": "In the course of time durative"},
    # Rule 60
    {"type": "glossary", "pattern": "საპირისპიროზე,", "replacement": "პირიქით,", "note": "On the contrary antithesis"},
    {"type": "glossary", "pattern": "ერთ ხელზე", "replacement": "ერთი მხრივ", "note": "On one hand antithesis"},
    {"type": "glossary", "pattern": "მეორე ხელზე კი", "replacement": "მეორე მხრივ კი", "note": "On other hand antithesis"},
    # Rule 61
    {"type": "glossary", "pattern": "კარი დაეჯახა დახურულად", "replacement": "კარი გაჯახუნდა", "note": "Door slammed auditory"},
    {"type": "glossary", "pattern": "იატაკი ყვიროდა", "replacement": "იატაკი აჭრაჭუნდა", "note": "Floor creaked auditory"},
    {"type": "glossary", "pattern": "მისი კბილები ლაპარაკობდნენ.", "replacement": "კბილი კბილზე ადიოდა.", "note": "Teeth chattered auditory"},
    # Rule 62
    {"type": "glossary", "pattern": "დაკარგა ტემპერამენტი", "replacement": "მოთმინება დაკარგა", "note": "Lost temper emotional"},
    {"type": "glossary", "pattern": "შეინარჩუნა სიგრილე", "replacement": "სიმშვიდე შეინარჩუნა", "note": "Kept cool emotional"},
    # Rule 63
    {"type": "glossary", "pattern": "იჯდა გადაჯვარედინებული ფეხებით", "replacement": "ფეხმორთხმით იჯდა", "note": "Sat cross-legged posture"},
    {"type": "glossary", "pattern": "იდგა ფეხის თითებზე", "replacement": "ფეხის წვერებზე იდგა", "note": "Stood on tiptoe posture"},
    # Rule 64
    {"type": "glossary", "pattern": "დიდით და ვრცელით", "replacement": "მთლიანობაში", "note": "By and large quantifier"},
    {"type": "glossary", "pattern": "ერთხელ ლურჯ მთვარეზე", "replacement": "ძალზე იშვიათად", "note": "Once in a blue moon quantifier"},
    # Rule 65
    {"type": "glossary", "pattern": "მობრუნდა უკან", "replacement": "გამობრუნდა", "note": "Turned back directional"},
    {"type": "glossary", "pattern": "მოშორებით შებრუნდა", "replacement": "ზურგი შეაქცია", "note": "Turned away directional"}
]


def train():
    print("=" * 70)
    print("  EngBot / Lumina Audio Studio — Autonomous Engine Training v41")
    print("=" * 70)

    # 1. Load active pack & benchmark
    pack = load_active_pack("ka")
    cases = load_benchmark_cases("ka")
    print(f"Initial State:")
    print(f"  * Pack Version: {pack.get('version')}")
    print(f"  * Pack Items  : {len(pack.get('items', []))}")
    print(f"  * Cases Total : {len(cases)}")

    eval_initial = evaluate_pack(pack.get("items", []), cases)
    print(f"  * Initial Score: {eval_initial['score']}% (Passed: {eval_initial['passed']}/{eval_initial['total']})\n")

    # 2. Add new benchmark cases if not present
    existing_case_ids = {c["id"] for c in cases}
    cases_added = 0
    for nc in NEW_BENCHMARK_CASES:
        if nc["id"] not in existing_case_ids:
            cases.append(nc)
            existing_case_ids.add(nc["id"])
            cases_added += 1

    BENCHMARK_CASES_KA_FILE.write_text(json.dumps(cases, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] Added {cases_added} new benchmark test cases (Total: {len(cases)})")

    # 3. Add new training rules to candidate items
    existing_item_patterns = {f"{i.get('type')}::{i.get('pattern')}" for i in pack.get("items", [])}
    session_id = f"training-session-v41-{uuid.uuid4().hex[:8]}"
    items_to_add = []
    for nr in NEW_TRAINING_RULES:
        key = f"{nr['type']}::{nr['pattern']}"
        if key not in existing_item_patterns:
            item = {
                "id": str(uuid.uuid4()),
                "type": nr["type"],
                "language": "ka",
                "pattern": nr["pattern"],
                "replacement": nr["replacement"],
                "severity": "warn",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "session_id": session_id,
                "model": "autonomous-trainer-v41",
                "note": nr["note"]
            }
            items_to_add.append(item)
            existing_item_patterns.add(key)

    candidate_items = pack.get("items", []) + items_to_add
    print(f"[OK] Formulated {len(items_to_add)} candidate training rules (Total: {len(candidate_items)})")

    # 4. Evaluate candidate pack on entire updated benchmark suite
    print("\nReplaying all benchmark cases with candidate pack...")
    eval_candidate = evaluate_pack(candidate_items, cases)
    print(f"  * Candidate Score : {eval_candidate['score']}%")
    print(f"  * Passed Exact    : {eval_candidate['passed']} / {eval_candidate['total']}")
    print(f"  * Failures Count  : {len(eval_candidate['failures'])}")
    print(f"  * QA False Pos    : {eval_candidate['qa_false_positives']}")

    if eval_candidate["failures"]:
        print("\nFAILURES DETECTED:")
        for f in eval_candidate["failures"][:5]:
            print(f"  [{f['id']}]:\n    source:   {f['source']}\n    got:      {f['got']}\n    expected: {f['expected']}")
        raise SystemExit(1)

    assert eval_candidate["score"] == 100.0, f"Expected 100.0 score, got {eval_candidate['score']}"
    assert eval_candidate["passed"] == eval_candidate["total"], "Not all cases passed exact"
    assert eval_candidate["qa_false_positives"] == 0, "QA false positives found"

    # 5. Promote active pack to v41
    new_version = pack.get("version", 40) + 1
    pack["version"] = new_version
    pack["items"] = candidate_items
    pack["score"] = eval_candidate["score"]
    pack["updated_at"] = datetime.now(timezone.utc).isoformat()
    save_active_pack("ka", pack)
    print(f"\n[PROMOTED] Active Pack promoted to Version {new_version}!")

    # 6. Record session and iteration
    try:
        sessions = json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
    except Exception:
        sessions = {}

    sessions[session_id] = {
        "id": session_id,
        "language": "ka",
        "scope": "both",
        "driver": "autonomous-training-v41",
        "model": "lumina-linguistic-trainer-v41",
        "status": "completed",
        "iterations": 1,
        "accepted": 1,
        "start_score": eval_initial["score"],
        "current_score": eval_candidate["score"],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "summary": f"Promoted to v{new_version}. Added Rule Groups 51-65 benchmark pairs and training rules with 100.0% accuracy across {len(cases)} benchmark cases."
    }
    SESSIONS_FILE.write_text(json.dumps(sessions, indent=2, ensure_ascii=False), encoding="utf-8")

    print("[RECORDED] Training session and analytics logged successfully.")
    print("=" * 70)


if __name__ == "__main__":
    train()
