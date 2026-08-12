import { create } from "zustand";
import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { i18n } from "@/features/i18n";
import { contextBlock, PROMPT_PRESETS, type PromptPreset } from "@/features/context/files";
import {
  AGENT_SYSTEM_PROMPT,
  AGENT_TOOLS,
  commitArtifactProposal,
  executeAgentTool,
  parseToolArguments,
} from "@/features/agent/tools";
import {
  allModels,
  AGENT_MODEL_ID,
  DEFAULT_MODEL_ID,
  FALLBACK_MODEL_ID,
  getModel,
} from "@/features/models/catalog";
import { loadActiveConversationId, loadSnapshot, saveSnapshot } from "@/features/persistence/db";
import { inspectDevice, recommendModelId } from "@/features/runtime/device";
import { engineManager } from "@/features/runtime/engine-manager";
import { titleFromPrompt } from "@/lib/chat-utils";
import type {
  Artifact,
  AgentRun,
  ApprovalRequest,
  Conversation,
  ConversationMode,
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
    mode: "chat",
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

let activeAbortController: AbortController | null = null;
let resolveAgentApproval: ((approved: boolean) => void) | null = null;

function waitForAgentApproval() {
  return new Promise<boolean>((resolve) => { resolveAgentApproval = resolve; });
}

function settleAgentApproval(approved: boolean) {
  resolveAgentApproval?.(approved);
  resolveAgentApproval = null;
}

export type ChatState = {
  hydrated: boolean;
  conversations: Conversation[];
  activeConversationId: string;
  attachments: LocalAttachment[];
  artifacts: Artifact[];
  activeArtifactId: string | null;
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
  refreshCacheStatus: (modelIds?: string[]) => Promise<void>;
  createConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  clearConversation: (id: string) => void;
  clearAllConversations: () => void;
  addAttachments: (attachments: LocalAttachment[]) => void;
  removeAttachment: (id: string) => void;
  requestMode: (mode: ConversationMode) => void;
  sendMessage: (content: string, attachmentIds?: string[], preset?: PromptPreset) => void;
  retryAgent: (messageId: string) => void;
  openArtifact: (id: string) => void;
  closeArtifact: () => void;
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
      artifacts: state.artifacts,
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

function patchMessage(
  conversations: Conversation[],
  conversationId: string,
  messageId: string,
  updater: (message: Message) => Message,
) {
  return conversations.map((conversation) => conversation.id === conversationId ? {
    ...conversation,
    messages: conversation.messages.map((message) => message.id === messageId ? updater(message) : message),
    updatedAt: Date.now(),
  } : conversation);
}

export const useChatStore = create<ChatState>((set, get) => ({
  hydrated: false,
  conversations: [initialConversation],
  activeConversationId: initialConversation.id,
  attachments: [],
  artifacts: [],
  activeArtifactId: null,
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
      artifacts: snapshot.artifacts ?? [],
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

  async refreshCacheStatus(modelIds) {
    const models = modelIds?.length
      ? modelIds.map((modelId) => getModel(modelId, get().customModels, get().deviceProfile)).filter((model) => model !== undefined)
      : allModels(get().customModels, { profile: get().deviceProfile });
    const entries = await Promise.all(models.map(async (model) => [
      model.id,
      await engineManager.isCached(model.id).catch(() => false) ? "cached" : "available",
    ] as const));
    set((state) => ({ cacheByModel: { ...state.cacheByModel, ...Object.fromEntries(entries) } }));
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
        artifacts: state.artifacts.filter((artifact) => artifact.conversationId !== id),
        activeArtifactId: state.artifacts.some((artifact) => artifact.id === state.activeArtifactId && artifact.conversationId === id) ? null : state.activeArtifactId,
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
      artifacts: state.artifacts.filter((artifact) => artifact.conversationId !== id),
      activeArtifactId: state.artifacts.some((artifact) => artifact.id === state.activeArtifactId && artifact.conversationId === id) ? null : state.activeArtifactId,
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
      artifacts: [],
      activeArtifactId: null,
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

  requestMode(mode) {
    const conversation = getActiveConversation(get());
    if (!conversation || conversation.mode === mode || get().isGenerating) return;
    if (mode === "chat") {
      set((state) => ({ conversations: state.conversations.map((item) => item.id === conversation.id
        ? { ...item, mode: "chat", updatedAt: Date.now() }
        : item) }));
      persistSoon();
      return;
    }
    const model = getModel(conversation.modelId, get().customModels, get().deviceProfile);
    if (model?.capabilities.includes("tools")) {
      set((state) => ({ conversations: state.conversations.map((item) => item.id === conversation.id
        ? { ...item, mode: "agent", updatedAt: Date.now() }
        : item) }));
      persistSoon();
      return;
    }
    set({ approval: { kind: "agent-mode", modelId: AGENT_MODEL_ID }, runtimePhase: "awaiting-approval", modelPhase: "awaiting-approval" });
  },

  sendMessage(content, attachmentIds = [], preset) {
    const prompt = content.trim();
    if (!prompt || get().isGenerating) return;
    const conversation = getActiveConversation(get());
    if (!conversation) return;
    const pending: PendingSend = { conversationId: conversation.id, content: prompt, attachmentIds, preset };
    const model = getModel(conversation.modelId, get().customModels, get().deviceProfile);
    if (conversation.mode === "agent" && !model?.capabilities.includes("tools")) {
      set({
        approval: { kind: "agent-mode", modelId: AGENT_MODEL_ID },
        pendingSend: pending,
        runtimePhase: "awaiting-approval",
        modelPhase: "awaiting-approval",
      });
      return;
    }
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

  retryAgent(messageId) {
    const conversation = getActiveConversation(get());
    const message = conversation?.messages.find((item) => item.id === messageId);
    if (!message?.agentRun || get().isGenerating) return;
    get().sendMessage(message.agentRun.input, message.attachmentIds);
  },

  openArtifact(id) {
    if (get().artifacts.some((artifact) => artifact.id === id)) set({ activeArtifactId: id });
  },

  closeArtifact() {
    set({ activeArtifactId: null });
  },

  cancelGeneration() {
    const conversationId = get().generationConversationId;
    if (!conversationId) return;
    activeAbortController?.abort();
    activeAbortController = null;
    if (get().approval?.kind === "agent-tool") settleAgentApproval(false);
    engineManager.interrupt();
    set((state) => ({
      conversations: patchAssistant(state.conversations, conversationId, (message) => ({
        ...message,
        content: message.content || (message.agentRun ? "Agent run stopped." : "Generation stopped."),
        status: "stopped",
        isStreaming: false,
        agentRun: message.agentRun ? {
          ...message.agentRun,
          status: "stopped",
          completedAt: Date.now(),
          steps: message.agentRun.steps.map((step) => step.status === "awaiting-approval"
            ? { ...step, status: "declined", result: "Run stopped", completedAt: Date.now() }
            : step),
        } : undefined,
        updatedAt: Date.now(),
      })),
      isGenerating: false,
      generationConversationId: null,
      runtimePhase: "interrupted",
      modelPhase: "interrupted",
      modelMessage: "Generation stopped",
      approval: null,
    }));
    persistSoon();
  },

  async requestModel(modelId) {
    const conversation = getActiveConversation(get());
    if (!conversation || !getModel(modelId, get().customModels, get().deviceProfile)) return;
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
    const targetModel = getModel(target, get().customModels, get().deviceProfile);
    if (!targetModel) return;
    if (get().isGenerating) get().cancelGeneration();
    set((state) => ({
      conversations: state.conversations.map((item) => item.id === state.activeConversationId
        ? { ...item, modelId: target, mode: item.mode === "agent" && !targetModel.capabilities.includes("tools") ? "chat" : item.mode, updatedAt: Date.now() }
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
    if (approval.kind === "agent-tool") {
      set({ approval: null, runtimePhase: "generating", modelPhase: "generating", modelMessage: "Applying approved artifact" });
      settleAgentApproval(true);
      return;
    }
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
    if (approval.kind === "agent-mode") {
      set((state) => ({ conversations: state.conversations.map((item) => item.id === state.activeConversationId
        ? { ...item, mode: "agent", updatedAt: Date.now() }
        : item) }));
      persistSoon();
      await get().prepareModel(approval.modelId, get().pendingSend);
      return;
    }
    if (get().isGenerating) get().cancelGeneration();
    await get().prepareModel(approval.modelId, get().pendingSend);
  },

  cancelApproval() {
    if (get().approval?.kind === "agent-tool") {
      set({ approval: null, runtimePhase: "generating", modelPhase: "generating", modelMessage: "Artifact change declined" });
      settleAgentApproval(false);
      return;
    }
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
  if (conversation.mode === "agent") {
    await runAgentNow(pending);
    return;
  }
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
  activeAbortController = abortController;

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
    activeAbortController = null;
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
    activeAbortController = null;
    persistSoon();
  }
}

async function runAgentNow(pending: PendingSend) {
  const initial = useChatStore.getState();
  const conversation = initial.conversations.find((item) => item.id === pending.conversationId);
  if (!conversation || initial.isGenerating || !engineManager.isReady(conversation.modelId)) return;
  const model = getModel(conversation.modelId, initial.customModels, initial.deviceProfile);
  if (!model?.capabilities.includes("tools")) throw new Error("The selected model does not support Agent mode.");

  const selectedAttachments = initial.attachments.filter((attachment) => pending.attachmentIds.includes(attachment.id));
  let runArtifacts = initial.artifacts.filter((artifact) => artifact.conversationId === conversation.id);
  const presetText = pending.preset ? PROMPT_PRESETS[pending.preset] : "";
  const user = createMessage("user", pending.content, {
    runtimeContent: [presetText, pending.content].filter(Boolean).join("\n\n"),
    attachmentIds: pending.attachmentIds,
    modelId: conversation.modelId,
    status: "complete",
  });
  const run: AgentRun = {
    id: createId(),
    input: pending.content,
    status: "planning",
    steps: [],
    maxSteps: 8,
    startedAt: Date.now(),
  };
  const assistant = createMessage("assistant", "", {
    attachmentIds: pending.attachmentIds,
    modelId: conversation.modelId,
    status: "streaming",
    isStreaming: true,
    agentRun: run,
  });
  const compacted = compactHistory([...conversation.messages, user]);
  const artifactSummary = runArtifacts.length
    ? `Saved artifacts: ${runArtifacts.map((artifact) => `${artifact.title} (${artifact.id}, ${artifact.kind})`).join(", ")}`
    : "Saved artifacts: none.";
  const protocol: ChatCompletionMessageParam[] = [
    { role: "system", content: `${AGENT_SYSTEM_PROMPT}\n\n${conversation.settings.systemPrompt}\n\n${artifactSummary}` },
    ...compacted.messages
      .filter((message) => message.role !== "system" && !message.isError && (message.runtimeContent ?? message.content).trim())
      .map((message) => ({ role: message.role as "assistant" | "user", content: message.runtimeContent ?? message.content })),
  ];
  const abortController = new AbortController();
  activeAbortController = abortController;

  const patchRun = (updater: (current: AgentRun) => AgentRun) => useChatStore.setState((state) => ({
    conversations: patchMessage(state.conversations, conversation.id, assistant.id, (message) => ({
      ...message,
      agentRun: message.agentRun ? updater(message.agentRun) : message.agentRun,
      updatedAt: Date.now(),
    })),
  }));

  const patchStep = (stepId: string, fields: Partial<AgentRun["steps"][number]>) => patchRun((current) => ({
    ...current,
    steps: current.steps.map((step) => step.id === stepId ? { ...step, ...fields } : step),
  }));

  useChatStore.setState((state) => ({
    conversations: state.conversations.map((item) => item.id === conversation.id ? {
      ...item,
      title: item.messages.length === 0 ? titleFromPrompt(pending.content) : item.title,
      messages: [...item.messages, user, assistant],
      updatedAt: Date.now(),
    } : item),
    isGenerating: true,
    generationConversationId: conversation.id,
    runtimePhase: "generating",
    modelPhase: "generating",
    modelMessage: "Planning local agent run",
    contextNotice: compacted.omitted ? "Earlier messages omitted to fit the 4K context." : null,
  }));

  let completedSteps = 0;
  let totalElapsedMs = 0;
  let lastStats = "";

  try {
    for (let round = 0; round < run.maxSteps; round += 1) {
      if (abortController.signal.aborted || useChatStore.getState().generationConversationId !== conversation.id) return;
      patchRun((current) => ({ ...current, status: current.steps.length ? "running" : "planning" }));
      const completion = await engineManager.agentStep(
        protocol,
        conversation.settings,
        AGENT_TOOLS,
        () => undefined,
        abortController.signal,
      );
      totalElapsedMs += completion.elapsedMs;
      lastStats = completion.statsText;
      if (abortController.signal.aborted || useChatStore.getState().generationConversationId !== conversation.id) return;

      if (!completion.toolCalls.length) {
        const content = completion.content.trim() || "Agent run completed.";
        useChatStore.setState((state) => ({
          conversations: patchMessage(state.conversations, conversation.id, assistant.id, (message) => ({
            ...message,
            content,
            status: "complete",
            isStreaming: false,
            stats: { text: lastStats, elapsedMs: totalElapsedMs },
            agentRun: message.agentRun ? { ...message.agentRun, status: "complete", completedAt: Date.now() } : message.agentRun,
            updatedAt: Date.now(),
          })),
          isGenerating: false,
          generationConversationId: null,
          runtimePhase: "ready",
          modelPhase: "ready",
          modelMessage: `${model.label} is ready`,
        }));
        activeAbortController = null;
        persistSoon();
        return;
      }

      protocol.push({ role: "assistant", content: completion.content || null, tool_calls: completion.toolCalls });
      for (const toolCall of completion.toolCalls) {
        if (completedSteps >= run.maxSteps) break;
        completedSteps += 1;
        const stepId = createId();
        let args: Record<string, unknown> = {};
        try {
          args = parseToolArguments(toolCall.function.arguments);
        } catch (error) {
          const result = `Tool arguments failed validation: ${error instanceof Error ? error.message : String(error)}`;
          patchRun((current) => ({ ...current, status: "running", steps: [...current.steps, {
            id: stepId,
            sequence: completedSteps,
            toolCallId: toolCall.id,
            toolName: toolCall.function.name,
            arguments: {},
            status: "error",
            result,
            startedAt: Date.now(),
            completedAt: Date.now(),
          }] }));
          protocol.push({ role: "tool", tool_call_id: toolCall.id, content: result });
          continue;
        }

        patchRun((current) => ({ ...current, status: "running", steps: [...current.steps, {
          id: stepId,
          sequence: completedSteps,
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          arguments: args,
          status: "running",
          startedAt: Date.now(),
        }] }));
        useChatStore.setState({ modelMessage: `Running ${toolCall.function.name}` });

        let toolOutput = "";
        try {
          const execution = executeAgentTool(toolCall.function.name, args, {
            conversationId: conversation.id,
            attachments: selectedAttachments,
            artifacts: runArtifacts,
            createId,
            now: Date.now,
          });
          if (execution.proposal) {
            patchStep(stepId, { status: "awaiting-approval" });
            patchRun((current) => ({ ...current, status: "awaiting-approval" }));
            useChatStore.setState({
              approval: { kind: "agent-tool", conversationId: conversation.id, messageId: assistant.id, stepId, proposal: execution.proposal },
              runtimePhase: "awaiting-approval",
              modelPhase: "awaiting-approval",
              modelMessage: "Artifact change needs approval",
            });
            const approved = await waitForAgentApproval();
            if (abortController.signal.aborted || useChatStore.getState().generationConversationId !== conversation.id) return;
            if (approved) {
              const committed = commitArtifactProposal(execution.proposal);
              runArtifacts = execution.proposal.operation === "create"
                ? [...runArtifacts, committed.artifact]
                : runArtifacts.map((artifact) => artifact.id === committed.artifact.id ? committed.artifact : artifact);
              useChatStore.setState((state) => ({
                artifacts: execution.proposal!.operation === "create"
                  ? [...state.artifacts, committed.artifact]
                  : state.artifacts.map((artifact) => artifact.id === committed.artifact.id ? committed.artifact : artifact),
                runtimePhase: "generating",
                modelPhase: "generating",
                modelMessage: "Continuing agent run",
              }));
              persistSoon();
              toolOutput = committed.output;
              patchStep(stepId, { status: "complete", result: toolOutput, artifactId: committed.artifact.id, completedAt: Date.now() });
            } else {
              toolOutput = "User declined the artifact change.";
              patchStep(stepId, { status: "declined", result: toolOutput, completedAt: Date.now() });
            }
          } else {
            toolOutput = execution.output ?? "Tool completed.";
            patchStep(stepId, { status: "complete", result: toolOutput, completedAt: Date.now() });
          }
        } catch (error) {
          toolOutput = `Tool error: ${error instanceof Error ? error.message : String(error)}`;
          patchStep(stepId, { status: "error", result: toolOutput, completedAt: Date.now() });
        }
        protocol.push({ role: "tool", tool_call_id: toolCall.id, content: toolOutput });
      }

      if (completedSteps >= run.maxSteps) {
        const content = "Agent stopped after reaching the 8-step safety limit.";
        useChatStore.setState((state) => ({
          conversations: patchMessage(state.conversations, conversation.id, assistant.id, (message) => ({
            ...message,
            content,
            status: "error",
            isStreaming: false,
            isError: true,
            agentRun: message.agentRun ? { ...message.agentRun, status: "error", completedAt: Date.now() } : message.agentRun,
            updatedAt: Date.now(),
          })),
          isGenerating: false,
          generationConversationId: null,
          runtimePhase: "error",
          modelPhase: "error",
          modelMessage: content,
        }));
        activeAbortController = null;
        persistSoon();
        return;
      }
    }
  } catch (error) {
    if (useChatStore.getState().generationConversationId !== conversation.id) return;
    const errorMessage = error instanceof Error ? error.message : String(error);
    useChatStore.setState((state) => ({
      conversations: patchMessage(state.conversations, conversation.id, assistant.id, (message) => ({
        ...message,
        content: errorMessage,
        status: "error",
        isStreaming: false,
        isError: true,
        agentRun: message.agentRun ? { ...message.agentRun, status: "error", completedAt: Date.now() } : message.agentRun,
        updatedAt: Date.now(),
      })),
      isGenerating: false,
      generationConversationId: null,
      runtimePhase: "error",
      modelPhase: "error",
      modelMessage: errorMessage,
    }));
    activeAbortController = null;
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
