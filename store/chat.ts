import { WebLLMInstance } from '@/hooks/web-llm';

import { ChatConversation, Message, UpdateBotMsg } from '@/types/chat';

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
  instructionModalStatus: boolean;
  newConversation: () => void;
  delConversation: (index: number) => void;
  chooseConversation: (index: number) => void;
  delAllConversations: () => void;
  curConversation: () => ChatConversation;
  onUserInputContent: (content: string) => Promise<void>;
  getMemoryMsgs: () => Message[];
  updateCurConversation: (
    updater: (conversation: ChatConversation) => void,
  ) => void;
  initLLMModel: () => Promise<void>;
  updateBotMsg: UpdateBotMsg;
  toggleInstuctionModal: (toggle: boolean) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      curConversationIndex: 0,
      conversations: [createEmptyConversation()],
      instructionModalStatus: true,
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
              curConversationIndex === index
                ? curConversationIndex - 1
                : curConversationIndex,
          };
        });
      },

      curConversation() {
        let index = get().curConversationIndex;
        const conversations = get().conversations;

        if (index < 0 || index >= conversations.length) {
          index = Math.min(conversations.length - 1, Math.max(0, index));
          set(() => ({ curConversationIndex: index }));
        }

        const conversation = conversations[index];

        return conversation;
      },

      async onUserInputContent(content) {
        const userMessage: Message = newMessage({
          type: 'user',
          content,
        });

        const aiBotMessage: Message = newMessage({
          type: 'assistant',
          content: 'thinking...',
          isStreaming: true,
        });

        const recentMsgs = get().getMemoryMsgs();
        const toSendMsgs = recentMsgs.concat(userMessage);
        console.log('[User Input] ', userMessage);
        // update
        get().updateCurConversation((conversation) => {
          conversation.messages.push(userMessage, aiBotMessage);
        });
        WebLLMInstance.chat(content);
      },
      getMemoryMsgs() {
        const conversation = get().curConversation();
        return conversation.messages.filter((msg) => !msg.isError);
      },
      updateCurConversation(updater) {
        const conversations = get().conversations;
        const index = get().curConversationIndex;
        updater(conversations[index]);
        set(() => ({ conversations }));
      },
      async initLLMModel() {
        WebLLMInstance.init(get().updateBotMsg);
      },
      updateBotMsg(msg) {
        const aiBotMessage: Message = newMessage({
          type: 'assistant',
          isStreaming: false,
          ...msg,
        });
        get().updateCurConversation((conversation) => {
          if (aiBotMessage.type === 'system') {
            conversation.messages[0] = aiBotMessage;
          } else if (msg.isStreaming) {
            const aiMsgs = conversation.messages.filter(
              (msg) => msg.type === 'assistant',
            );
            aiMsgs[aiMsgs.length - 1] = aiBotMessage;
          }
        });
      },
      toggleInstuctionModal(toggle) {
        set({
          instructionModalStatus: toggle,
        });
      },
    }),
    {
      name: CHATSTORE_KEY,
      version: 1.0,
    },
  ),
);
