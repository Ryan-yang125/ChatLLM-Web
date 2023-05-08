<div align="center">
<img src="./docs/images/icon.jpg" alt="icon" height="160"/>

<h1 align="center">ChatLLM Web</h1>

<!-- English / [简体中文](./README_CN.md) -->

🗣️ Chat with LLM like Vicuna totally in your browser with WebGPU, safely, privately, and with no server. Powered By [web-llm](https://github.com/mlc-ai/web-llm).

[Try it now](https://chat-llm-web.vercel.app)

![cover](./docs/images/cover.png)

</div>

## Features

- 🤖 Everything runs inside the browser with **no server support** and is **accelerated with WebGPU**.

- 💾 Model caching is supported, so you only need to download the model once.

- 🚀 Easy to deploy for free with one-click on Vercel in under 1 minute, then you get your own ChatLLM Web.

- 💬 Multi-conversation chat, with all data stored locally in the browser for privacy.

- 📝 Markdown and streaming response support: math, code highlighting, etc.

- 🎨 responsive and well-designed UI, including dark mode.

## Instructions

- 🌐 To use this app, you need a browser that supports WebGPU, such as Chrome 113 or Chrome Canary. Chrome versions ≤ 112 are not supported.

- 💻 You will need a GPU with about 6.4GB of memory. If your GPU has less memory, the app will still run, but the response time will be slower.

- 📥 The first time you use the app, you will need to download the model. For the Vicuna-7b-v1.1 model that we are currently using, the download size is about 4GB. After the initial download, the model will be loaded from the browser cache for faster usage.

- ℹ️ For more details, please visit [mlc.ai/web-llm](https://mlc.ai/web-llm/)

## Roadmap

- [✅] LLM: using web worker to create an LLM instance and generate answers.

- [✅] Conversations: Multi-conversation support is available.

- [] Models: Support for more models is planned.

- [] Desktop: Build a desktop version with Tauri, which will use system cache (not just browser cache) and run locally and offline.

- [] Package: rewrite the logic of web-llm in TS and pack it into a npm package.
- [] UI: Dark and Light Theme.

## Deploy to Vercel

1. Click
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRyan-yang125%2FChatLLM-Web&project-name=chat-llm-web&repository-name=ChatLLM-Web), follow the instructions, and finish in just 1 minute.
2. Enjoy it 😊

## Development

```shell
git clone https://github.com/Ryan-yang125/ChatLLM-Web.git
npm i
npm run dev
```

## Screenshots

![Home](./docs/images/home.png)

![More](./docs/images/mobile.png)

## LICENSE

[MIT](./LICENSE)
