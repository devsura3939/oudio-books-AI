# Local English-to-Georgian translation

The no-credit fallback uses **Helsinki-NLP/opus-mt-synthetic-en-ka**, a small model trained specifically for this language pair. It produces real translations, not dictionary substitutions or English written in Georgian letters. It needs about 160 MB of model files and runs on the CPU. The browser remains responsive while the server works.

Free online machine translation still runs first. Paid LLM editing is optional and receives the existing draft plus source context. If editing times out or credits run out, a valid machine translation continues. If all real engines are unavailable, the app preserves accepted work and reports the failure instead of fabricating a completed book.

## Setup

From the repository root, using Python 3.11 or later:

```powershell
python -m pip install -r requirements.txt -r local-engine/requirements.txt
python local-engine/download-model.py
python local-engine/serve.py
```

In EngBot → AI settings → **Translation without API credits**, enter `http://127.0.0.1:8766` and the connection token printed by the service. Choose **Connect and save**. The connection is scoped to the signed-in account on that device. Keep the service running while translating. No paid API key is required.

GitHub Pages cannot run model inference. On a phone, localhost means the phone itself. To use the model from other devices, deploy the bridge on reachable compute behind HTTPS, set a persistent `ENGBOT_LOCAL_TOKEN`, and set `ENGBOT_LOCAL_ORIGINS` to the app's exact origin. The default script binds only to loopback. An example production command is `uvicorn serve:app --app-dir local-engine --host 127.0.0.1 --port 8766` behind a reverse proxy. This repository does not automatically provision or bill cloud compute.

`ENGBOT_LOCAL_MODEL_DIR` selects a preinstalled model directory. Setting it on the existing Python audiobook server also enables the local model there. Model downloads occur only during explicit setup. The bridge limits request size and concurrency; generation runs off the HTTP event loop. It rejects truncated and visibly corrupt output. Browser cancellation prevents late saves; an already-running local generation may finish before releasing the server slot.

**Direction:** this model supports English → Georgian. Georgian → English continues using the existing online engines. Model availability is not a guarantee of professional literary quality: vocabulary, idiom, and literary style still need review.

## Evaluation and training

Run `python local-engine/benchmark.py` to generate `benchmark-results.json` on your machine. The checked-in report covers five short examples, not a whole-book quality certification. On this workstation, the original model test took approximately 0.2–0.4 seconds per sentence after loading. It retained negation, names, numbers and basic meaning much better than the rejected alternatives; some wording remained literal.

The model is already trained by Helsinki-NLP. EngBot's Training Lab manages evaluated rule packs, not neural weight fine-tuning. Generated translations must not automatically become trusted training references. Target-only grammar substitutions remain available in explicit repair, because blindly applying them can change pronouns, negation and meaning.

Re-translating from the original source uses a new checkpoint configuration; the old translation is retained in chapter history. Already-saved editions are not silently rewritten by a version update.

## Model provenance and attribution

- Model: [Helsinki-NLP/opus-mt-synthetic-en-ka](https://huggingface.co/Helsinki-NLP/opus-mt-synthetic-en-ka)
- Revision: `a6ce8b81bfb8ada72c208493ecc1bce50650cd47`
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit the model authors when redistributing weights or derived conversions.
- Research: Ona de Gibert, Joseph Attieh, Teemu Vahtola, Mikko Aulamo, Zihao Li, Raúl Vázquez, Tiancheng Hu and Jörg Tiedemann, [Scaling Low-Resource MT via Synthetic Data Generation with LLMs](https://arxiv.org/abs/2505.14423), 2025.
- This integration uses unchanged pretrained weights. The download script pins the revision and verifies file sizes and model-weight SHA-256. No model binaries are committed to Git.

## Rejected alternatives

These findings apply to the exact conversions and configurations tested:

1. `Xenova/m2m100_418M`, revision `9c374f0b7aca709787cea97b047bfbbd1559d177`, q8 / Transformers.js 3.8.1: repeated `საფეხბურთო` and `არასოდეს` on simple source sentences, through both direct generation and the standard pipeline. Not offered as a browser fallback.
2. `zenoverflow/madlad400-3b-mt-int8-float32`, revision `1fc4bdce0fd3e9c169cfaecfd1bf17a3f9f1a3a1`, CTranslate2 4.8.2 / CPU / beam 4: unreadable Georgian on four examples. Reproduction scripts are in `experiments/`.
3. `mradermacher/translategemma-4b-it-GGUF`, revision `35a7486e128b19642cdc72d7b91b21ba388aaf42`, Q4_K_M / llama.cpp b10909 / CPU / temperature 0 / official translation prompt: some plausible sentences, but also mixed French/Greek fragments and meaning errors. Its English-to-Georgian output did not qualify. Results are in `experiments/translategemma-results.json`. LM Studio's template verifier also failed to load this model; the benchmark used isolated llama.cpp with a raw completion prompt.

Larger parameter counts and Georgian character coverage alone did not predict usable Georgian translation.
