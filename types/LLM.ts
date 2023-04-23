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
}

export type Engine = {
  chat: (
    message: string,
    userMessages: string[],
    generatedMessages: string[],
    allMessages: Message[],
  ) => Promise<string>;
  classify: (text: string, categories: string[]) => Promise<string>;
  destroy?: () => void;
  draw: (text: string) => Promise<Buffer | void>;
  greeting: Message;
  imageToText: (name: string, type: string, image: Buffer) => Promise<string>;
  init: () => Promise<void>;
  summarization: (text: string) => Promise<string>;
  translation: (text: string) => Promise<string>;
};
export type Message = {
  command?: string;
  image?: string;
  text: string;
  type: 'assistant' | 'system' | 'user';
  writing?: boolean;
};
