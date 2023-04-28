import { Message } from './chat';

type Prompts = [string, string][];

declare global {
  var Tokenizer: {
    TokenizerWasm: new (config: string) => (name: string) => Promise<unknown>;
    init: () => Promise<void>;
  };
  var sentencepiece: {
    sentencePieceProcessor: (url: string) => void;
  };
  var tvmjsGlobalEnv: {
    asyncOnGenerate: () => Promise<void>;
    asyncOnReset: () => Promise<void>;
    canvas: HTMLCanvasElement;
    getTokenizer: (name: string) => Promise<unknown>;
    initialized: boolean;
    message: string;
    prompts: Prompts;
    response: string;
    sentencePieceProcessor: (url: string) => void;
  };
  var importScripts: (...url: string[]) => void;
}

export type LLMEngine = {
  chat: (
    message: string,
    userMessages: string[],
    generatedMessages: string[],
    allMessages: Message[],
  ) => Promise<void>;
  destroy?: () => void;
  greeting?: Message;
  init: any;
};
