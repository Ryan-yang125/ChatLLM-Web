import { Message } from './chat';

type Prompts = [string, string][];
type WorkerHistoryMsg = [string, string][];

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
    getTokenizer: (name: string) => Promise<unknown>;
    initialized: boolean;
    sentencePieceProcessor: (url: string) => void;
    message: string;
    curConversationIndex: number;
    workerHistoryMsg: WorkerHistoryMsg;
  };
  var importScripts: (...url: string[]) => void;
}

export type LLMEngine = {
  chat: (message: string, updateBotMsg?: any) => Promise<void>;
  destroy?: () => void;
  greeting?: Message;
  init: any;
};

export type PostToWorker = {
  type: 'init' | 'chat';
  msg: string;
};

export type ListenFromWorker = {
  type: 'init' | 'chat';
  msg: string;
};

export type SendToWorkerMessageEventData = {
  curConversationIndex: number;
  msg: string;
  workerHistoryMsg?: WorkerHistoryMsg;
  ifNewConverstaion?: boolean;
};

export type ResFromWorkerMessageEventData = {
  type: 'initing' | 'chatting' | 'stats';
  action: 'append' | 'updateLast';
  msg: string;
  ifError?: boolean;
  ifFinish?: boolean;
};
