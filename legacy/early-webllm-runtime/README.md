# Early WebLLM Runtime Archive

This directory preserves the handwritten browser inference core shipped with ChatLLM Web v1.0.0.

The original implementation loaded TVM.js, tokenizer assets, Vicuna weights, and a WebGPU WASM runtime through a dedicated worker. It also implemented worker messages, streaming tokens, initialization progress, and model configuration before the modern `@mlc-ai/web-llm` package offered the production runtime used by v3.

## Contents

- `web-worker/web-llm.worker.ts` — worker runtime and token generation loop.
- `hooks/web-llm.ts` — React-facing worker bridge.
- `types/web-llm.ts` — original message and runtime types.
- `public/lib/WebLLM/config.json` — original model runtime configuration.

The archive is excluded from TypeScript, ESLint, Vite, PWA, and production code. The complete v1 application and bundled model assets remain available from the [`v1.0.0`](https://github.com/Ryan-yang125/ChatLLM-Web/tree/v1.0.0) tag.

ChatLLM Web v3 uses a single-worker Engine Manager built on `@mlc-ai/web-llm`, a curated model catalog, official browser caching helpers, cancellation, model switching, and explicit recovery states.
