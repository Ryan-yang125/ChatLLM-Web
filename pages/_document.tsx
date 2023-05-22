import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>ChatLLM Web - Chat with LLM like Vicuna in Your Browser | Powered By web-llm</title>
        <meta name="description" content="ChatLLM Web allows you to chat with LLM like Vicuna directly in your browser using WebGPU. Enjoy a safe, private, and serverless experience. Deploy it easily on Vercel and experience seamless conversations with multi-model support. Powered By web-llm. Try it now!"></meta>
        <meta name="application-name" content="ChatLLM-Web" />
        <meta name="theme-color" content="#fff" />
        <link rel="apple-touch-icon" href="/assets/icon-48x48.png"></link>
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
