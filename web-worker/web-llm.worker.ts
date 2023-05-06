import { SendToWorkerMessageEventData } from '@/types/web-llm';

const libs = [
  '/lib/WebLLM/tvmjs_runtime.wasi.js',
  '/lib/WebLLM/tvmjs.bundle.js',
  '/lib/WebLLM/llm_chat.js',
  '/lib/WebLLM/sentencepiece.js',
];
let initalized = false;

globalThis.addEventListener(
  'message',
  ({ data }: { data: SendToWorkerMessageEventData }) => {
    // load script
    if (!globalThis.tvmjsGlobalEnv) {
      globalThis.postMessage({});
      initalized = true;

      globalThis.tvmjsGlobalEnv = globalThis.tvmjsGlobalEnv || {};

      globalThis.tvmjsGlobalEnv.initialized = true;

      globalThis.importScripts(...libs);

      globalThis.tvmjsGlobalEnv.sentencePieceProcessor = (url: string) =>
        globalThis.sentencepiece.sentencePieceProcessor(url);
    }
    globalThis.tvmjsGlobalEnv.message = data.msg || '';
    globalThis.tvmjsGlobalEnv.curConversationIndex =
      data.curConversationIndex || 0;

    if (data.ifNewConverstaion) {
      globalThis.tvmjsGlobalEnv.workerHistoryMsg = data.workerHistoryMsg || [];
      globalThis.tvmjsGlobalEnv.curConversationIndex =
        data.curConversationIndex || 0;
      console.log('switch to new conversation: ', data.curConversationIndex);
      console.log('set new history msgs: ', data.workerHistoryMsg);
      return;
    }

    globalThis.tvmjsGlobalEnv.asyncOnGenerate();
  },
  { passive: true },
);
