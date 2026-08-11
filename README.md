<div align="center">
  <img src="./public/brand/chatllm-icon-192.png" alt="ChatLLM" width="96" />
  <h1>ChatLLM Web</h1>
  <p>Private local AI chat powered by WebGPU.</p>
  <p>
    <a href="https://chatllm-web.pages.dev">Live app</a>
    ·
    <a href="https://github.com/Ryan-yang125/ChatLLM-Web/releases">Releases</a>
    ·
    <a href="./LICENSE">MIT License</a>
  </p>
</div>

ChatLLM runs **Llama 3.2 1B** directly in your browser with [MLC WebLLM](https://github.com/mlc-ai/web-llm). Conversations, prompts, and generated responses stay on your device.

## Highlights

- Local WebGPU inference in a dedicated Web Worker
- Streaming Markdown, syntax highlighting, and math rendering
- Multiple conversations with local search and persistence
- Command palette, keyboard shortcuts, dark mode, and responsive mobile UI
- Installable PWA with browser-cached model files
- Static deployment on Cloudflare Pages

## Try it

Open **[chatllm-web.pages.dev](https://chatllm-web.pages.dev)** in a current Chrome or Edge browser with WebGPU and hardware acceleration enabled.

The first model load downloads about **880 MB** from Hugging Face. Later sessions reuse the browser cache. Roughly 1 GB of available GPU memory is recommended.

## Development

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Stack

React 18 · TypeScript · Vite 6 · Tailwind CSS 4 · Motion · TanStack Router · Zustand · MLC WebLLM

## Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name chatllm-web
```

Production: **[chatllm-web.pages.dev](https://chatllm-web.pages.dev)**
