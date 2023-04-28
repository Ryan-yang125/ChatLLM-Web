import { Message, UpdateBotMsg } from '@/types/chat';
import { LLMEngine } from '@/types/web-llm';

import { newMessage } from '@/store/chat';
import { DEFAULT_BOT_GREETING } from '@/store/chat';

class WebLLM implements LLMEngine {
  private worker?: Worker = undefined;
  // public greeting = DEFAULT_BOT_GREETING;

  public destroy(): void {
    globalThis.tvmjsGlobalEnv?.asyncOnReset();
    this.worker?.terminate();
  }

  public async init(updateBotMsg: UpdateBotMsg): Promise<void> {
    this.worker = new Worker(
      new URL('web-worker/web-llm.worker.ts', import.meta.url),
      { name: 'WebLLM' },
    );

    this.worker.postMessage('init');
    this.worker.onmessage = function (e) {
      // console.log(e.data);
      updateBotMsg(e.data);
    };
    return Promise.resolve();
  }

  public async chat(
    message: string,
    _userMessages?: string[],
    _generatedMessages?: string[],
    _allMessages?: Message[],
  ): Promise<void> {
    requestAnimationFrame(() => this.worker?.postMessage(message));

    // return new Promise((resolve) => {
    //   this.worker?.addEventListener('message', ({ data }: { data: string }) =>
    //     resolve(data),
    //   );
    // });
  }
}

const WebLLMInstance = new WebLLM();
export { WebLLMInstance };
