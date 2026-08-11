import { create } from "zustand";
import { persist } from "zustand/middleware";
import { parseModelProgress, titleFromPrompt } from "@/lib/chat-utils";
import {
  MODEL_LABEL,
  webLLM,
  type LocalEngineEvent,
} from "@/lib/web-llm";
import type { Conversation, Message, ModelPhase } from "@/types/chat";

const STORE_KEY = "chatllm-store:v2";

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function createConversation(now = Date.now()): Conversation {
  return {
    id: createId(),
    title: "New conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function createMessage(role: Message["role"], content: string): Message {
  const now = Date.now();
  return {
    id: createId(),
    role,
    content,
    createdAt: now,
    updatedAt: now,
  };
}

function cleanProgressText(text: string) {
  return text
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type ChatState = {
  conversations: Conversation[];
  activeConversationId: string;
  modelPhase: ModelPhase;
  modelMessage: string;
  modelProgress: number | null;
  isGenerating: boolean;
  generationConversationId: string | null;
  createConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  clearConversation: (id: string) => void;
  clearAllConversations: () => void;
  prepareModel: () => void;
  unloadModel: () => void;
  sendMessage: (content: string) => void;
  cancelGeneration: () => void;
  handleEngineEvent: (event: LocalEngineEvent) => void;
};

const firstConversation = createConversation();

function updateAssistant(
  conversations: Conversation[],
  conversationId: string | null,
  updater: (message: Message) => Message,
) {
  if (!conversationId) return conversations;
  return conversations.map((conversation) => {
    if (conversation.id !== conversationId) return conversation;
    const messages = [...conversation.messages];
    const last = messages.at(-1);
    if (last?.role !== "assistant") return conversation;
    messages[messages.length - 1] = updater(last);
    return { ...conversation, messages, updatedAt: Date.now() };
  });
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [firstConversation],
      activeConversationId: firstConversation.id,
      modelPhase: "idle",
      modelMessage: "Ready to load on this device",
      modelProgress: null,
      isGenerating: false,
      generationConversationId: null,

      createConversation() {
        const conversation = createConversation();
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: conversation.id,
        }));
      },

      selectConversation(id) {
        if (get().conversations.some((item) => item.id === id)) {
          set({ activeConversationId: id });
        }
      },

      deleteConversation(id) {
        if (get().isGenerating && get().generationConversationId === id) return;
        set((state) => {
          const remaining = state.conversations.filter((item) => item.id !== id);
          if (remaining.length === 0) {
            const conversation = createConversation();
            return { conversations: [conversation], activeConversationId: conversation.id };
          }
          return {
            conversations: remaining,
            activeConversationId: state.activeConversationId === id ? remaining[0].id : state.activeConversationId,
          };
        });
      },

      renameConversation(id, title) {
        const cleanTitle = title.trim();
        if (!cleanTitle) return;
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === id
              ? { ...conversation, title: cleanTitle.slice(0, 64), updatedAt: Date.now() }
              : conversation,
          ),
        }));
      },

      clearConversation(id) {
        if (get().isGenerating && get().generationConversationId === id) return;
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === id
              ? { ...conversation, messages: [], updatedAt: Date.now() }
              : conversation,
          ),
        }));
      },

      clearAllConversations() {
        const conversation = createConversation();
        void webLLM.unload();
        set({
          conversations: [conversation],
          activeConversationId: conversation.id,
          modelPhase: "idle",
          modelMessage: "Ready to load on this device",
          modelProgress: null,
          isGenerating: false,
          generationConversationId: null,
        });
      },

      prepareModel() {
        const state = get();
        if (state.modelPhase === "loading" || state.modelPhase === "ready") return;
        set({
          modelPhase: "loading",
          modelMessage: `Starting ${MODEL_LABEL}`,
          modelProgress: 0,
        });
        webLLM.prepare();
      },

      unloadModel() {
        if (get().isGenerating) return;
        void webLLM.unload();
        set({
          modelPhase: "idle",
          modelMessage: "Ready to load on this device",
          modelProgress: null,
        });
      },

      sendMessage(content) {
        const prompt = content.trim();
        const state = get();
        if (!prompt || state.isGenerating) return;
        const conversation = state.conversations.find((item) => item.id === state.activeConversationId);
        if (!conversation) return;

        const user = createMessage("user", prompt);
        const assistant = { ...createMessage("assistant", ""), isStreaming: true };
        const history = [...conversation.messages, user];

        set((current) => ({
          conversations: current.conversations.map((item) => item.id === conversation.id
            ? {
                ...item,
                title: item.messages.length === 0 ? titleFromPrompt(prompt) : item.title,
                messages: [...item.messages, user, assistant],
                updatedAt: Date.now(),
              }
            : item),
          isGenerating: true,
          generationConversationId: conversation.id,
          modelPhase: current.modelPhase === "ready" ? "ready" : "loading",
          modelMessage: current.modelPhase === "ready" ? current.modelMessage : `Preparing ${MODEL_LABEL}`,
          modelProgress: current.modelPhase === "ready" ? current.modelProgress : 0,
        }));

        webLLM.chat(history);
      },

      cancelGeneration() {
        const state = get();
        if (!state.isGenerating) return;
        webLLM.cancel();
        const ready = webLLM.isReady();
        set((current) => ({
          conversations: updateAssistant(
            current.conversations,
            current.generationConversationId,
            (message) => ({
              ...message,
              content: message.content || "Generation stopped.",
              isStreaming: false,
              updatedAt: Date.now(),
            }),
          ),
          isGenerating: false,
          generationConversationId: null,
          modelPhase: ready ? "ready" : "idle",
          modelMessage: ready ? `${MODEL_LABEL} is ready` : "Ready to load on this device",
          modelProgress: ready ? 100 : null,
        }));
      },

      handleEngineEvent(event) {
        if (event.type === "progress") {
          set({
            modelPhase: "loading",
            modelMessage: cleanProgressText(event.text) || `Preparing ${MODEL_LABEL}`,
            modelProgress: Number.isFinite(event.progress)
              ? event.progress
              : parseModelProgress(event.text),
          });
          return;
        }

        if (event.type === "ready") {
          set({
            modelPhase: "ready",
            modelMessage: `${MODEL_LABEL} is ready`,
            modelProgress: 100,
          });
          return;
        }

        if (event.type === "chunk") {
          set((state) => ({
            conversations: updateAssistant(
              state.conversations,
              state.generationConversationId,
              (message) => ({ ...message, content: event.content, isStreaming: true, updatedAt: Date.now() }),
            ),
          }));
          return;
        }

        if (event.type === "complete") {
          set((state) => ({
            conversations: updateAssistant(
              state.conversations,
              state.generationConversationId,
              (message) => ({
                ...message,
                content: event.content,
                stats: event.stats,
                isStreaming: false,
                updatedAt: Date.now(),
              }),
            ),
            isGenerating: false,
            generationConversationId: null,
            modelPhase: "ready",
            modelMessage: `${MODEL_LABEL} is ready`,
            modelProgress: 100,
          }));
          return;
        }

        set((state) => ({
          conversations: updateAssistant(
            state.conversations,
            state.generationConversationId,
            (message) => ({
              ...message,
              content: event.message,
              isError: true,
              isStreaming: false,
              updatedAt: Date.now(),
            }),
          ),
          modelPhase: "error",
          modelMessage: event.message,
          modelProgress: null,
          isGenerating: false,
          generationConversationId: null,
        }));
      },
    }),
    {
      name: STORE_KEY,
      version: 2,
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
    },
  ),
);

webLLM.subscribe((event) => useChatStore.getState().handleEngineEvent(event));

export function getActiveConversation(state: Pick<ChatState, "conversations" | "activeConversationId">) {
  return state.conversations.find((conversation) => conversation.id === state.activeConversationId)
    ?? state.conversations[0];
}
