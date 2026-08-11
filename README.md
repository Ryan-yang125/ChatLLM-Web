<div align="center">
  <img src="./public/brand/chatllm-icon-192.png" alt="ChatLLM" width="104" />
  <h1>ChatLLM Web</h1>
  <p>Private, browser-native AI chat powered by WebGPU.</p>
  <p><a href="https://chatllm-web.pages.dev">Open ChatLLM</a></p>
</div>

## What it does

- Runs Llama 3.2 1B entirely in a Web Worker with WebGPU.
- Streams responses with Markdown, syntax highlighting, and math rendering.
- Keeps conversations and model files in browser storage.
- Supports multiple conversations, search, keyboard commands, dark mode, and PWA installation.
- Downloads about 880 MB on the first model load and reuses the browser cache afterward.

## Stack

- React 18, TypeScript, Vite 6
- Tailwind CSS 4 and Motion
- TanStack Router and Zustand
- MLC WebLLM
- Cloudflare Pages

## Requirements

Use a current Chrome or Edge browser with WebGPU and hardware acceleration enabled. The model needs roughly 1 GB of available GPU memory.

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Deploy

Build the static site and deploy `dist` to Cloudflare Pages:

```bash
npm run build
npx wrangler pages deploy dist --project-name chatllm-web
```

## License

[MIT](./LICENSE)
