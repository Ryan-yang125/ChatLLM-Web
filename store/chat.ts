import { ChatConversation, Message } from '@/types/chat';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const CHATSTORE_KEY = 'chat-web-llm-store';

export const newMessage = (p: Partial<Message>): Message => ({
  id: Date.now(),
  createTime: new Date().toLocaleString(),
  type: 'user',
  content: '',
  ...p,
});

export const DEFAULT_BOT_GREETING = newMessage({
  type: 'assistant',
  content: 'Hello, I am an AI assistant. How can I help you today?',
});

function createEmptyConversation(): ChatConversation {
  const curTime = new Date().toLocaleString();

  return {
    id: Date.now(),
    messages: [],
    createTime: curTime,
    updateTime: curTime,
  };
}

export interface ChatStore {
  conversations: ChatConversation[];
  currentConversationIndex: number;
  newConversation: () => void;
  delConversation: (index: number) => void;
  chooseConversation: (index: number) => void;
  delAllConversations: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      currentConversationIndex: 0,
      conversations: [createEmptyConversation()],
      newConversation() {},
      delAllConversations() {},
      chooseConversation(index) {},
      delConversation(index) {},
    }),
    {
      name: CHATSTORE_KEY,
      version: 1,
    },
  ),
);
