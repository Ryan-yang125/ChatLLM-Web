import { WebLLMInstance } from '@/hooks/web-llm';

import { UpdateInitMsg } from '@/types/chat';

import { create } from 'zustand';

export interface InitLLMStore {
  initalized: boolean;
  initMsg: string[];
  initLLM: () => void;
  updateInitMsg: UpdateInitMsg;
}

export const useInitLLMStore = create<InitLLMStore>((set, get) => ({
  initalized: false,
  initMsg: [],
  initLLM() {
    WebLLMInstance.init(get().updateInitMsg);
  },
  updateInitMsg(msg) {},
}));
