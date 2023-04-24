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
    title: 'New Conversation',
  };
}

export interface ChatStore {
  conversations: ChatConversation[];
  curConversationIndex: number;
  newConversation: () => void;
  delConversation: (index: number) => void;
  chooseConversation: (index: number) => void;
  delAllConversations: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      curConversationIndex: 0,
      conversations: [createEmptyConversation()],
      newConversation() {
        set((state) => {
          return {
            curConversationIndex: 0,
            conversations: [createEmptyConversation()].concat(
              state.conversations,
            ),
          };
        });
      },

      delAllConversations() {
        set({
          curConversationIndex: 0,
          conversations: [createEmptyConversation()],
        });
      },

      chooseConversation(index) {
        set({
          curConversationIndex: index,
        });
      },

      delConversation(index) {
        set((state) => {
          const { conversations, curConversationIndex } = state;

          if (conversations.length === 1) {
            return {
              curConversationIndex: 0,
              conversations: [createEmptyConversation()],
            };
          }
          conversations.splice(index, 1);
          return {
            conversations,
            curConversationIndex:
              curConversationIndex >= index
                ? curConversationIndex - 1
                : curConversationIndex,
          };
        });
      },
    }),
    {
      name: CHATSTORE_KEY,
      version: 1.0,
    },
  ),
);
