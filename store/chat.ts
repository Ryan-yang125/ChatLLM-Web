import { WebLLMInstance } from '@/hooks/web-llm';

import { testMdStr } from '@/utils/codeblock';

import { ChatConversation, InitInfo, Message } from '@/types/chat';
import { ResFromWorkerMessageEventData } from '@/types/web-llm';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const CHATSTORE_KEY = 'chat-web-llm-store';

export const newMessage = (p: Partial<Message>): Message => ({
  id: Date.now(),
  createTime: new Date().toLocaleString(),
  updateTime: new Date().toLocaleString(),
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
  initInfoTmp: InitInfo;
  debugMode: boolean;
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
  toggleInstuctionModal: (toggle: boolean) => void;
  toggleInitModal: (toggle: boolean) => void;
  workerMessageCb: (data: ResFromWorkerMessageEventData) => void;
  setWorkerConversationHistroy: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      curConversationIndex: 0,
      conversations: [createEmptyConversation()],
      instructionModalStatus: true,
      debugMode: process.env.NODE_ENV === 'development',
      initInfoTmp: {
        showModal: false,
        initMsg: [],
      },
      newConversation() {
        set((state) => {
          return {
            curConversationIndex: 0,
            conversations: [createEmptyConversation()].concat(
              state.conversations,
            ),
          };
        });
        get().setWorkerConversationHistroy();
      },

      delAllConversations() {
        set({
          curConversationIndex: 0,
          conversations: [createEmptyConversation()],
        });
        WebLLMInstance.destroy();
      },

      chooseConversation(index) {
        set({
          curConversationIndex: index,
        });
        get().setWorkerConversationHistroy();
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
        get().setWorkerConversationHistroy();
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

      setWorkerConversationHistroy() {
        WebLLMInstance.setConversationHistroy({
          ifNewConverstaion: true,
          workerHistoryMsg: get()
            .curConversation()
            .messages.map((msg) => [msg.type, msg.content]),
          curConversationIndex: get().curConversationIndex,
          msg: '',
        });
      },

      async onUserInputContent(content) {
        const userMessage: Message = newMessage({
          type: 'user',
          content,
        });

        const botMessage: Message = newMessage({
          type: 'assistant',
          content: '',
          isLoading: true,
        });
        // const recentMsgs = get().getMemoryMsgs();
        // const toSendMsgs = recentMsgs.concat(userMessage);

        console.log('[User Input] ', userMessage);
        // update
        get().updateCurConversation((conversation) => {
          conversation.messages.push(userMessage, botMessage);
        });
        // if (get().debugMode) {
        //   setTimeout(() => {
        //     get().updateCurConversation((conversation) => {
        //       const msgs = conversation.messages;
        //       msgs[msgs.length - 1].content = testMdStr;
        //       msgs[msgs.length - 1].isError = false;
        //       msgs[msgs.length - 1].isLoading = false;
        //       msgs[msgs.length - 1].isStreaming = true;
        //     });
        //   }, 3000);
        //   return;
        // }

        WebLLMInstance.chat(
          {
            msg: content,
            curConversationIndex: get().curConversationIndex,
          },
          get().workerMessageCb,
        );
      },
      workerMessageCb(data) {
        if (data.type === 'initing') {
          const initMsg = get().initInfoTmp.initMsg;
          if (data.action === 'append') {
            const appendMsg = newMessage({
              type: 'init',
              content: data.msg,
              isError: !!data.ifError,
            });
            initMsg.push(appendMsg);
          } else if (data.action === 'updateLast') {
            initMsg[initMsg.length - 1].content = data.msg;
            initMsg[initMsg.length - 1].isError = !!data.ifError;
          }
          set({
            initInfoTmp: {
              initMsg,
              showModal: true,
            },
          });
          if (data.ifFinish) {
            set({
              initInfoTmp: {
                showModal: false,
                initMsg: get().initInfoTmp.initMsg,
              },
            });
          }
        } else if (data.type === 'chatting') {
          const msgs = get().curConversation().messages;
          if (msgs[msgs.length - 1].type !== 'assistant') {
            const aiBotMessage: Message = newMessage({
              type: 'assistant',
              content: '',
              isStreaming: true,
            });
            get().updateCurConversation((conversation) => {
              conversation.messages.push(aiBotMessage);
            });
          }

          get().updateCurConversation((conversation) => {
            const msgs = conversation.messages;
            msgs[msgs.length - 1].content = data.msg;
            msgs[msgs.length - 1].isError = !!data.ifError;
            msgs[msgs.length - 1].isLoading = false;
            if (data.ifFinish) {
              msgs[msgs.length - 1].isStreaming = false;
              msgs[msgs.length - 1].updateTime = new Date().toLocaleString();
            }
          });
        } else if (data.type === 'stats') {
          get().updateCurConversation((conversation) => {
            const msgs = conversation.messages;
            msgs[msgs.length - 1].statsText = data.msg;
          });
        }
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
      toggleInstuctionModal(toggle) {
        set({
          instructionModalStatus: toggle,
        });
      },
      toggleInitModal(toggle) {
        set({
          initInfoTmp: {
            showModal: toggle,
            initMsg: [],
          },
        });
      },
    }),
    {
      name: CHATSTORE_KEY,
      version: 1.0,
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([key]) => !['initInfoTmp'].includes(key),
          ),
        ),
    },
  ),
);
