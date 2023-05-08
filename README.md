<div align="center">
<img src="./docs/images/icon.jpg" alt="icon" height="30"/>

<h1 align="center">ChatLLM Web</h1>

<!-- English / [简体中文](./README_CN.md) -->

🗣️ Chat With LLM like Vicuna totally in your brower with webgpu, saftely, privately, with no server.

Powered By [web-llm](https://github.com/mlc-ai/web-llm).

<!-- ![cover](./docs/images/cover.png) -->
</div>

## Features

- 🤖 Everything runs inside the browser **with no server support** and accelerated with WebGPU.
- 💾 Model Cache supportted, download model only once.
- 🚀 Easy to Deploy for free with one-click on Vercel in under 1 minute, then you get your own ChatLLM Web.
- 💬 Multi conversations chat, all data stored locally in the browser, privacy first.
- 📝 Markdown response support: math, code highlight, etc.
- 🎨 Responsive and well designed ui, also darkmode.

## Instructions

- 🥦 Using browser supports WebGPU, you can try out Chrome 113 or
  Chrome Canary. Chrome version ≤ 112 is not supported.
- 💻 You will need a gpu with about 6.4G memory. If lower than that,it's ok to run, but slow to wait for response.
- 📥 First init requires download model, for vicuna-7b-v1.1 we now using, it abouts 4GB. After downloading once, we can load modol from browser cache for next time usage, it's faster.
- ℹ️ more details in [mlc.ai/web-llm](https://mlc.ai/web-llm/)

## Roadmap

- Load LLM: using web worker create llm instance and generate answer 🚀

## Deploy to Vercel

1. Click
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRyan-yang125%2FChatLLM-Web&project-name=chat-llm-web&repository-name=ChatLLM-Web), follow the instructions and finish just in 1 minute.
2. Enjoy it 😊

## Development

```shell
npm i
npm run  dev
```

## Screenshots

![Home](./docs/images/home.png)

<!-- ![More](./docs/images/more.png) -->

## LICENSE

[Anti 996 License](https://github.com/kattgu7/Anti-996-License/blob/master/LICENSE_CN_EN)
