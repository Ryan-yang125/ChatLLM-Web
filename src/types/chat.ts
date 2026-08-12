import type { ModelRecord } from "@mlc-ai/web-llm";

export type MessageRole = "system" | "assistant" | "user";
export type MessageStatus = "streaming" | "complete" | "stopped" | "error";

export type GenerationSettings = {
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
};

export type GenerationStats = {
  text: string;
  elapsedMs: number;
};

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  runtimeContent?: string;
  attachmentIds: string[];
  modelId?: string;
  status?: MessageStatus;
  stats?: GenerationStats;
  createdAt: number;
  updatedAt: number;
  isStreaming?: boolean;
  isError?: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  modelId: string;
  settings: GenerationSettings;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

export type LocalAttachment = {
  id: string;
  conversationId: string;
  name: string;
  mimeType: string;
  size: number;
  text: string;
  estimatedTokens: number;
  createdAt: number;
};

export type RuntimePhase =
  | "idle"
  | "checking"
  | "awaiting-approval"
  | "downloading"
  | "loading"
  | "ready"
  | "generating"
  | "interrupted"
  | "error"
  | "unsupported";

export type ModelPhase = RuntimePhase;
export type ModelCacheState = "unknown" | "available" | "cached";
export type ModelTier = "stable" | "experimental" | "advanced" | "custom";
export type ModelCapability = "chat" | "coding" | "reasoning" | "vision" | "tools" | "base";

export type DeviceProfile = {
  webGPU: boolean;
  adapterName: string;
  deviceMemoryGB: number | null;
  storageUsage: number | null;
  storageQuota: number | null;
  maxBufferSize: number | null;
  maxStorageBufferBindingSize: number | null;
  features: string[];
  checkedAt: number;
};

export type ModelDefinition = {
  id: string;
  label: string;
  family: string;
  bestFor: string;
  bestForZh: string;
  vramRequiredMB: number;
  contextWindow: number;
  source: "built-in" | "custom";
  tier: ModelTier;
  capabilities: ModelCapability[];
  variants: ModelRecord[];
  record?: ModelRecord;
};

export type CustomModelManifest = {
  schemaVersion: 1;
  label: string;
  record: ModelRecord;
};

export type Preferences = {
  language: "en" | "zh";
  theme: "light" | "dark" | "system";
};

export type ApprovalRequest =
  | { kind: "load-model"; modelId: string; prompt?: string; attachmentIds?: string[] }
  | { kind: "delete-cache"; modelId: string }
  | { kind: "custom-model"; manifest: CustomModelManifest }
  | { kind: "fallback"; modelId: string };
