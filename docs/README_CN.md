<div align="center">
<img src="./images/icon.jpg" alt="icon" height="160"/>

<h1 align="center">ChatLLM Web</h1>

[English](../README.md) / 简体中文

🗣️ 使用 WebGPU 在浏览器中与 LLM（语言模型）进行聊天，完全安全、私密，无需服务器。 由 [web-llm](https://github.com/mlc-ai/web-llm) 提供支持。

[Try it now](https://chat-llm-web.vercel.app)

![cover](./images/cover.png)

</div>

## Features

- 🤖 一切都在浏览器内运行，无需服务器支持，并且使用 WebGPU 进行加速。

- ⚙️ 模型在 Web Worker 中运行，确保不会阻塞用户界面，提供无缝体验

- 🚀 通过在 Vercel 上单击一次即可轻松免费部署，不到 1 分钟，即可获得自己的 ChatLLM Web。

- 💾 支持模型缓存，因此您只需要下载模型一次。

- 💬 多对话聊天，所有数据都存储在浏览器中，以保护隐私。

- 📝 支持 Markdown 和流式响应：数学、代码高亮等。

- 🎨 响应式和设计良好的 UI，包括暗黑模式。

## Instructions

- 🌐 要使用此应用程序，您需要使用支持 WebGPU 的浏览器，例如 Chrome 113 或 Chrome Canary。不支持 Chrome 版本 ≤ 112。

- 💻 您需要具有约 6.4GB 的内存的 GPU。如果您的 GPU 内存较少，则应用程序仍将运行，但响应时间会较慢。

- 📥 第一次使用应用程序时，您需要下载模型。对于我们当前使用的 Vicuna-7b 模型，下载大小约为 4GB。初始下载后，模型将从浏览器缓存中加载，以加快使用速度。
- ℹ️ 有关更多详细信息，请访问 [mlc.ai/web-llm](https://mlc.ai/web-llm/)

## Roadmap

- [✅] LLM：使用 Web Worker 创建 LLM 实例并生成答案。

- [✅] 对话：支持多对话。

- [] 桌面版：使用 Tauri 构建桌面版，它将使用系统缓存（而不仅仅是浏览器缓存）并在本地和离线运行。

- [] UI：暗黑和明亮主题。

## Deploy to Vercel

1. 单击
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRyan-yang125%2FChatLLM-Web&project-name=chat-llm-web&repository-name=ChatLLM-Web)，按照说明操作，只需 1 分钟即可完成。
2. 尽情享受吧 😊

## Development

```shell
git clone https://github.com/Ryan-yang125/ChatLLM-Web.git
npm i
npm run dev
```

## Screenshots

![Home](./images/home.png)

![More](./images/mobile.png)

## LICENSE

[MIT](./LICENSE)
