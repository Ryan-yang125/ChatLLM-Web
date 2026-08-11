import { create } from "zustand";
import { i18n } from "@/features/i18n";
import { contextBlock, PROMPT_PRESETS, type PromptPreset } from "@/features/context/files";
import {
  allModels,
  DEFAULT_MODEL_ID,
  FALLBACK_MODEL_ID,
  getModel,
} from "@/features/models/catalog";
import { loadActiveConversationId, loadSnapshot, saveSnapshot } from "@/features/persistence/db";
import { inspectDevice, recommendModelId } from "@/features/runtime/device";
import { engineManager } from "@/features/runtime/engine-manager";
import { titleFromPrompt } from "@/lib/chat-utils";
import type {
  ApprovalRequest,
  Conversation,
  CustomModelManifest,
  DeviceProfile,
  GenerationSettings,
  LocalAttachment,
  Message,
  ModelCacheState,
  Preferences,
  RuntimePhase,
} from "@/types/chat";

const DEFAULT_SETTINGS: GenerationSettings = {
  temperature: 0.7,
  topP: 0.95,
  maxTokens: 512,
  systemPrompt: "You are a helpful, concise AI assistant. Respond with clear Markdown when useful.",
};

function createId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function createConversation(modelId = DEFAULT_MODEL_ID, now = Date.now()): Conversation {
  return {
    id: createId(),
    title: "New conversation",
    modelId,
    settings: { ...DEFAULT_SETTINGS },
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function createMessage(role: Message["role"], content: string, extra: Partial<Message> = {}): Message {
  const now = Date.now();
  return {
    id: createId(),
    role,
    content,
    attachmentIds: [],
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

function compactHistory(messages: Message[], maxCharacters = 14_336) {
  const copy = [...messages];
  let total = copy.reduce((sum, message) => sum + (message.runtimeContent ?? message.content).length, 0);
  let omitted = false;
  while (copy.length > 2 && total > maxCharacters) {
    const first = copy.shift();
    if (first) total -= (first.runtimeContent ?? first.content).length;
    if (copy[0]?.role === "assistant") {
      const paired = copy.shift();
      if (paired) total -= (paired.runtimeContent ?? paired.content).length;
    }
    omitted = true;
  }
  return { messages: copy, omitted };
}

type PendingSend = { conversationId: string; content: string; attachmentIds: string[]; preset?: PromptPreset };

export type ChatState = {
  hydrated: boolean;
  conversations: Conversation[];
  activeConversationId: string;
  attachments: LocalAttachment[];
  customModels: CustomModelManifest[];
  preferences: Preferences;
  deviceProfile: DeviceProfile | null;
  recommendedModelId: string;
  cacheByModel: Record<string, ModelCacheState>;
  runtimePhase: RuntimePhase;
  modelPhase: RuntimePhase;
  modelMessage: string;
  modelProgress: number | null;
  activeModelId: string | null;
  isGenerating: boolean;
  generationConversationId: string | null;
  contextNotice: string | null;
  approval: ApprovalRequest | null;
  pendingSend: PendingSend | null;
  hydrate: () => Promise<void>;
  inspectDevice: () => Promise<void>;
  refreshCacheStatus: () => Promise<void>;
  createConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  clearConversation: (id: string) => void;
  clearAllConversations: () => void;
  addAttachments: (attachments: LocalAttachment[]) => void;
  removeAttachment: (id: string) => void;
  sendMessage: (content: string, attachmentIds?: string[], preset?: PromptPreset) => void;
  cancelGeneration: () => void;
  requestModel: (modelId: string) => Promise<void>;
  prepareModel: (modelId?: string, pending?: PendingSend | null) => Promise<void>;
  unloadModel: () => Promise<void>;
  requestDeleteCache: (modelId: string) => void;
  requestCustomModel: (manifest: CustomModelManifest) => void;
  confirmApproval: () => Promise<void>;
  cancelApproval: () => void;
  removeCustomModel: (modelId: string) => void;
  updateSettings: (settings: Partial<GenerationSettings>) => void;
  setLanguage: (language: Preferences["language"]) => void;
  setThemePreference: (theme: Preferences["theme"]) => void;
};

const initialConversation = createConversation();
let persistHandle: number | null = null;

function persistSoon() {
  if (typeof window === "undefined") return;
  if (persistHandle !== null) window.clearTimeout(persistHandle);
  persistHandle = window.setTimeout(() => {
    const state = useChatStore.getState();
    void saveSnapshot({
      conversations: state.conversations,
      activeConversationId: state.activeConversationId,
      attachments: state.attachments,
      customModels: state.customModels,
      preferences: state.preferences,
    });
  }, 80);
}

function patchAssistant(
  conversations: Conversation[],
  conversationId: string,
  updater: (message: Message) => Message,
) {
  return conversations.map((conversation) => {
    if (conversation.id !== conversationId) return conversation;
    const messages = [...conversation.messages];
    const index = messages.findLastIndex((message) => message.role === "assistant");
    if (index < 0) return conversation;
    messages[index] = updater(messages[index]);
    return { ...conversation, messages, updatedAt: Date.now() };
  });
}

export const useChatStore = create<ChatState>((set, get) => ({
  hydrated: false,
  conversations: [initialConversation],
  activeConversationId: initialConversation.id,
  attachments: [],
  customModels: [],
  preferences: {
    language: navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en",
    theme: "system",
  },
  deviceProfile: null,
  recommendedModelId: DEFAULT_MODEL_ID,
  cacheByModel: {},
  runtimePhase: "idle",
  modelPhase: "idle",
  modelMessage: "Ready to check this device",
  modelProgress: null,
  activeModelId: null,
  isGenerating: false,
  generationConversationId: null,
  contextNotice: null,
  approval: null,
  pendingSend: null,

  async hydrate() {
    if (get().hydrated) return;
    const snapshot: Awaited<ReturnType<typeof loadSnapshot>> = await loadSnapshot().catch(() => ({}));
    const conversations = snapshot.conversations?.length ? snapshot.conversations : get().conversations;
    const preferredActive = loadActiveConversationId();
    const activeConversationId = conversations.some((item) => item.id === preferredActive)
      ? preferredActive!
      : conversations[0].id;
    const preferences = snapshot.preferences ?? get().preferences;
    const customModels = snapshot.customModels ?? [];
    engineManager.setCustomModels(customModels);
    await i18n.changeLanguage(preferences.language);
    document.documentElement.lang = preferences.language === "zh" ? "zh-CN" : "en";
    set({
      conversations,
      activeConversationId,
      attachments: snapshot.attachments ?? [],
      customModels,
      preferences,
      hydrated: true,
    });
    await get().inspectDevice();
    await get().refreshCacheStatus();
  },

  async inspectDevice() {
    set({ runtimePhase: "checking", modelPhase: "checking", modelMessage: "Checking WebGPU and storage" });
    const deviceProfile = await inspectDevice();
    const recommendedModelId = recommendModelId(deviceProfile);
    set({
      deviceProfile,
      recommendedModelId,
      runtimePhase: deviceProfile.webGPU ? "idle" : "unsupported",
      modelPhase: deviceProfile.webGPU ? "idle" : "unsupported",
      modelMessage: deviceProfile.webGPU ? "Device check complete" : "WebGPU is unavailable",
    });
  },

  async refreshCacheStatus() {
    const models = allModels(get().customModels);
    const entries = await Promise.all(models.map(async (model) => [
      model.id,
      await engineManager.isCached(model.id).catch(() => false) ? "cached" : "available",
    ] as const));
    set({ cacheByModel: Object.fromEntries(entries) });
  },

  createConversation() {
    const conversation = createConversation(get().recommendedModelId);
    set((state) => ({ conversations: [conversation, ...state.conversations], activeConversationId: conversation.id }));
    persistSoon();
  },

  selectConversation(id) {
    if (!get().conversations.some((item) => item.id === id)) return;
    set({ activeConversationId: id });
    persistSoon();
  },

  deleteConversation(id) {
    if (get().isGenerating && get().generationConversationId === id) return;
    set((state) => {
      const remaining = state.conversations.filter((conversation) => conversation.id !== id);
      const conversations = remaining.length ? remaining : [createConversation(state.recommendedModelId)];
      return {
        conversations,
        attachments: state.attachments.filter((attachment) => attachment.conversationId !== id),
        activeConversationId: state.activeConversationId === id ? conversations[0].id : state.activeConversationId,
      };
    });
    persistSoon();
  },

  renameConversation(id, title) {
    const clean = title.trim().slice(0, 64);
    if (!clean) return;
    set((state) => ({ conversations: state.conversations.map((conversation) =>
      conversation.id === id ? { ...conversation, title: clean, updatedAt: Date.now() } : conversation,
    ) }));
    persistSoon();
  },

  clearConversation(id) {
    if (get().isGenerating && get().generationConversationId === id) return;
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === id ? { ...conversation, messages: [], updatedAt: Date.now() } : conversation,
      ),
      attachments: state.attachments.filter((attachment) => attachment.conversationId !== id),
    }));
    persistSoon();
  },

  clearAllConversations() {
    const conversation = createConversation(get().recommendedModelId);
    void engineManager.unload();
    set({
      conversations: [conversation],
      activeConversationId: conversation.id,
      attachments: [],
      runtimePhase: "idle",
      modelPhase: "idle",
      activeModelId: null,
      isGenerating: false,
    });
    persistSoon();
  },

  addAttachments(attachments) {
    set((state) => ({ attachments: [...state.attachments, ...attachments] }));
    persistSoon();
  },

  removeAttachment(id) {
    set((state) => ({ attachments: state.attachments.filter((attachment) => attachment.id !== id) }));
    persistSoon();
  },

  sendMessage(content, attachmentIds = [], preset) {
    const prompt = content.trim();
    if (!prompt || get().isGenerating) return;
    const conversation = getActiveConversation(get());
    if (!conversation) return;
    const pending: PendingSend = { conversationId: conversation.id, content: prompt, attachmentIds, preset };
    if (!engineManager.isReady(conversation.modelId)) {
      set({
        approval: { kind: "load-model", modelId: conversation.modelId, prompt, attachmentIds },
        pendingSend: pending,
        runtimePhase: "awaiting-approval",
        modelPhase: "awaiting-approval",
      });
      return;
    }
    void sendNow(pending);
  },

  cancelGeneration() {
    const conversationId = get().generationConversationId;
    if (!conversationId) return;
    engineManager.interrupt();
    set((state) => ({
      conversations: patchAssistant(state.conversations, conversationId, (message) => ({
        ...message,
        content: message.content || "Generation stopped.",
        status: "stopped",
        isStreaming: false,
        updatedAt: Date.now(),
      })),
      isGenerating: false,
      generationConversationId: null,
      runtimePhase: "interrupted",
      modelPhase: "interrupted",
      modelMessage: "Generation stopped",
    }));
    persistSoon();
  },

  async requestModel(modelId) {
    const conversation = getActiveConversation(get());
    if (!conversation || !getModel(modelId, get().customModels)) return;
    if (get().isGenerating) {
      set({ approval: { kind: "load-model", modelId }, runtimePhase: "awaiting-approval", modelPhase: "awaiting-approval" });
      return;
    }
    const cached = get().cacheByModel[modelId] === "cached";
    if (!cached && !engineManager.isReady(modelId)) {
      set({ approval: { kind: "load-model", modelId }, runtimePhase: "awaiting-approval", modelPhase: "awaiting-approval" });
      return;
    }
    await get().prepareModel(modelId);
  },

  async prepareModel(modelId, pending = null) {
    const conversation = getActiveConversation(get());
    const target = modelId ?? conversation?.modelId ?? get().recommendedModelId;
    if (!getModel(target, get().customModels)) return;
    if (get().isGenerating) get().cancelGeneration();
    set((state) => ({
      conversations: state.conversations.map((item) => item.id === state.activeConversationId
        ? { ...item, modelId: target, updatedAt: Date.now() }
        : item),
      runtimePhase: "loading",
      modelPhase: "loading",
      modelProgress: null,
      modelMessage: `Loading ${getModel(target, state.customModels)?.label ?? target}`,
      approval: null,
    }));
    try {
      await engineManager.prepare(target, (progress) => set({
        runtimePhase: progress.phase,
        modelPhase: progress.phase,
        modelProgress: progress.progress,
        modelMessage: progress.text,
      }));
      set((state) => ({
        runtimePhase: "ready",
        modelPhase: "ready",
        modelProgress: 100,
        modelMessage: `${getModel(target, state.customModels)?.label ?? target} is ready`,
        activeModelId: target,
        cacheByModel: { ...state.cacheByModel, [target]: "cached" },
      }));
      persistSoon();
      const queued = pending ?? get().pendingSend;
      set({ pendingSend: null });
      if (queued) await sendNow(queued);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const memoryError = /memory|GPU/i.test(message);
      set({
        runtimePhase: "error",
        modelPhase: "error",
        modelMessage: message,
        modelProgress: null,
        activeModelId: null,
        pendingSend: null,
        approval: memoryError && target !== FALLBACK_MODEL_ID ? { kind: "fallback", modelId: FALLBACK_MODEL_ID } : null,
      });
    }
  },

  async unloadModel() {
    await engineManager.unload();
    set({ runtimePhase: "idle", modelPhase: "idle", activeModelId: null, modelProgress: null, modelMessage: "Model unloaded" });
  },

  requestDeleteCache(modelId) {
    set({ approval: { kind: "delete-cache", modelId }, runtimePhase: "awaiting-approval", modelPhase: "awaiting-approval" });
  },

  requestCustomModel(manifest) {
    set({ approval: { kind: "custom-model", manifest }, runtimePhase: "awaiting-approval", modelPhase: "awaiting-approval" });
  },

  async confirmApproval() {
    const approval = get().approval;
    if (!approval) return;
    set({ approval: null });
    if (approval.kind === "custom-model") {
      const customModels = [...get().customModels, approval.manifest];
      engineManager.setCustomModels(customModels);
      set({ customModels, runtimePhase: "idle", modelPhase: "idle" });
      persistSoon();
      await get().refreshCacheStatus();
      return;
    }
    if (approval.kind === "delete-cache") {
      await engineManager.clearModelCache(approval.modelId);
      set((state) => ({
        cacheByModel: { ...state.cacheByModel, [approval.modelId]: "available" },
        activeModelId: state.activeModelId === approval.modelId ? null : state.activeModelId,
        runtimePhase: state.activeModelId === approval.modelId ? "idle" : state.runtimePhase,
        modelPhase: state.activeModelId === approval.modelId ? "idle" : state.modelPhase,
      }));
      return;
    }
    if (get().isGenerating) get().cancelGeneration();
    await get().prepareModel(approval.modelId, get().pendingSend);
  },

  cancelApproval() {
    set({ approval: null, pendingSend: null, runtimePhase: get().activeModelId ? "ready" : "idle", modelPhase: get().activeModelId ? "ready" : "idle" });
  },

  removeCustomModel(modelId) {
    const customModels = get().customModels.filter((manifest) => manifest.record.model_id !== modelId);
    engineManager.setCustomModels(customModels);
    set({ customModels });
    persistSoon();
  },

  updateSettings(settings) {
    set((state) => ({ conversations: state.conversations.map((conversation) =>
      conversation.id === state.activeConversationId
        ? { ...conversation, settings: { ...conversation.settings, ...settings }, updatedAt: Date.now() }
        : conversation,
    ) }));
    persistSoon();
  },

  setLanguage(language) {
    void i18n.changeLanguage(language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    set((state) => ({ preferences: { ...state.preferences, language } }));
    persistSoon();
  },

  setThemePreference(theme) {
    set((state) => ({ preferences: { ...state.preferences, theme } }));
    persistSoon();
  },
}));

async function sendNow(pending: PendingSend) {
  const state = useChatStore.getState();
  const conversation = state.conversations.find((item) => item.id === pending.conversationId);
  if (!conversation || state.isGenerating || !engineManager.isReady(conversation.modelId)) return;
  const attachments = state.attachments.filter((attachment) => pending.attachmentIds.includes(attachment.id));
  const presetText = pending.preset ? PROMPT_PRESETS[pending.preset] : "";
  const context = contextBlock(attachments);
  const runtimeContent = [presetText, context, pending.content].filter(Boolean).join("\n\n");
  const user = createMessage("user", pending.content, {
    runtimeContent,
    attachmentIds: pending.attachmentIds,
    modelId: conversation.modelId,
    status: "complete",
  });
  const assistant = createMessage("assistant", "", {
    modelId: conversation.modelId,
    status: "streaming",
    isStreaming: true,
  });
  const history = compactHistory([...conversation.messages, user]);
  const abortController = new AbortController();

  useChatStore.setState((current) => ({
    conversations: current.conversations.map((item) => item.id === conversation.id ? {
      ...item,
      title: item.messages.length === 0 ? titleFromPrompt(pending.content) : item.title,
      messages: [...item.messages, user, assistant],
      updatedAt: Date.now(),
    } : item),
    isGenerating: true,
    generationConversationId: conversation.id,
    runtimePhase: "generating",
    modelPhase: "generating",
    modelMessage: "Generating locally",
    contextNotice: history.omitted ? "Earlier messages omitted to fit the 4K context." : null,
  }));

  try {
    const result = await engineManager.generate(
      history.messages,
      conversation.settings,
      (content) => useChatStore.setState((current) => ({
        conversations: patchAssistant(current.conversations, conversation.id, (message) => ({
          ...message,
          content,
          isStreaming: true,
          status: "streaming",
          updatedAt: Date.now(),
        })),
      })),
      abortController.signal,
    );
    const current = useChatStore.getState();
    if (current.generationConversationId !== conversation.id) return;
    useChatStore.setState((latest) => ({
      conversations: patchAssistant(latest.conversations, conversation.id, (message) => ({
        ...message,
        content: result.content || message.content,
        isStreaming: false,
        status: "complete",
        stats: { text: result.statsText, elapsedMs: result.elapsedMs },
        updatedAt: Date.now(),
      })),
      isGenerating: false,
      generationConversationId: null,
      runtimePhase: "ready",
      modelPhase: "ready",
      modelMessage: `${getModel(conversation.modelId, latest.customModels)?.label ?? conversation.modelId} is ready`,
    }));
    persistSoon();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    useChatStore.setState((current) => ({
      conversations: patchAssistant(current.conversations, conversation.id, (assistantMessage) => ({
        ...assistantMessage,
        content: message,
        isStreaming: false,
        isError: true,
        status: "error",
        updatedAt: Date.now(),
      })),
      isGenerating: false,
      generationConversationId: null,
      runtimePhase: "error",
      modelPhase: "error",
      modelMessage: message,
      approval: /memory|GPU/i.test(message) && conversation.modelId !== FALLBACK_MODEL_ID
        ? { kind: "fallback", modelId: FALLBACK_MODEL_ID }
        : null,
    }));
    persistSoon();
  }
}

export function getActiveConversation(state: Pick<ChatState, "conversations" | "activeConversationId">) {
  return state.conversations.find((conversation) => conversation.id === state.activeConversationId)
    ?? state.conversations[0];
}

export function getConversationAttachments(state: Pick<ChatState, "attachments" | "activeConversationId">) {
  return state.attachments.filter((attachment) => attachment.conversationId === state.activeConversationId);
}
