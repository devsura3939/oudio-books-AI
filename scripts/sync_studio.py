import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

files = [
    'index.html',
    'static/app.js',
    'static/scanner.js',
    'static/georgian-linguistics.js',
    'static/engine-pack.js',
    'static/supabase-store.js',
    'static/engine-core.js',
    'static/job-store.js',
    'static/repair-review.js',
    'static/training-client.js',
    'static/narration.js',
    'static/training-runner.js',
    'static/training-studio.js',
    'static/studio-ui.js',
    'static/provider-runtime.js',
    'static/model-discovery.js',
    'static/studio-ui.css',
    'static/styles.css',
    'static/library-sync.js',
    'static/translation-phases.js',
    'static/lm-studio.js',
    'static/local-translation.js',
    'static/ai-settings.js',
    'static/translation-machine.js',
    'static/reading-state.js',
    'static/reading-ui.js',
    'static/book-structure.js',
    'static/english-linguistics.js',
    'static/embeddinggemma-studio.js',
]

failed = False
target_base = ROOT / 'lovable-app' / 'public' / 'studio'

for rel in files:
    src = ROOT / rel
    dst = target_base / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not src.exists():
        print(f"Warning: source {src} does not exist")
        continue
    src_content = src.read_bytes()
    dst.write_bytes(src_content)

print("Studio mirrors synchronized via python.")
