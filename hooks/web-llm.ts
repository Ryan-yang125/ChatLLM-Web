import { Message } from '@/types/chat';
import { LLMEngine } from '@/types/web-llm';

import { DEFAULT_BOT_GREETING } from '@/store/chat';

export class WebLLM implements LLMEngine {
  private worker?: Worker = undefined;

  public greeting = DEFAULT_BOT_GREETING;

  public destroy(): void {
    globalThis.tvmjsGlobalEnv?.asyncOnReset();
    this.worker?.terminate();
  }

  public async init(): Promise<void> {
    this.worker = new Worker(
      new URL('web-worker/web-llm.worker.ts', import.meta.url),
      { name: 'WebLLM' },
    );
    this.worker.postMessage('init');
    return Promise.resolve();
  }

  public async chat(
    message: string,
    _userMessages?: string[],
    _generatedMessages?: string[],
    _allMessages?: Message[],
  ): Promise<string> {
    requestAnimationFrame(() => this.worker?.postMessage(message));

    return new Promise((resolve) => {
      this.worker?.addEventListener('message', ({ data }: { data: string }) =>
        resolve(data),
      );
    });
  }
}
