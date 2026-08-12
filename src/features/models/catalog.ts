import type { AppConfig, ModelRecord } from "@mlc-ai/web-llm";
import { functionCallingModelIds, ModelType, prebuiltAppConfig } from "@mlc-ai/web-llm";
import type {
  CustomModelManifest,
  DeviceProfile,
  ModelCapability,
  ModelDefinition,
  ModelTier,
} from "@/types/chat";

export const DEFAULT_MODEL_ID = "Qwen3.5-2B-q4f16_1-MLC";
export const FALLBACK_MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
export const AGENT_MODEL_ID = "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC";
export const MODEL_CONTEXT_WINDOW = 4096;

type CuratedModelSpec = {
  id: string;
  label: string;
  family: string;
  bestFor: string;
  bestForZh: string;
  tier: Exclude<ModelTier, "advanced" | "custom">;
  capabilities?: ModelCapability[];
};

const CURATED_MODEL_SPECS: CuratedModelSpec[] = [
  { id: "SmolLM2-360M-Instruct-q4f16_1-MLC", label: "SmolLM2 360M", family: "SmolLM", bestFor: "Instant chat on smaller devices", bestForZh: "小型设备上的快速对话", tier: "stable" },
  { id: "gemma3-1b-it-q4f16_1-MLC", label: "Gemma 3 1B", family: "Gemma", bestFor: "Compact everyday assistance", bestForZh: "轻量日常辅助", tier: "stable" },
  { id: FALLBACK_MODEL_ID, label: "Llama 3.2 1B", family: "Llama", bestFor: "Fast local chat", bestForZh: "低资源设备与快速对话", tier: "stable" },
  { id: "Qwen3.5-0.8B-q4f16_1-MLC", label: "Qwen 3.5 0.8B", family: "Qwen", bestFor: "Light bilingual work", bestForZh: "中英文轻量任务", tier: "stable" },
  { id: DEFAULT_MODEL_ID, label: "Qwen 3.5 2B", family: "Qwen", bestFor: "Everyday local assistant", bestForZh: "默认推荐与通用对话", tier: "stable" },
  { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Llama 3.2 3B", family: "Llama", bestFor: "Balanced general chat", bestForZh: "均衡通用对话", tier: "stable" },
  { id: "Qwen3.5-4B-q4f16_1-MLC", label: "Qwen 3.5 4B", family: "Qwen", bestFor: "Higher-quality answers", bestForZh: "更高质量的通用任务", tier: "stable" },
  { id: "Phi-4-mini-instruct-q4f16_1-MLC", label: "Phi-4 Mini", family: "Phi", bestFor: "Compact instruction following", bestForZh: "紧凑指令执行", tier: "stable" },
  { id: "Qwen3-8B-q4f16_1-MLC", label: "Qwen 3 8B", family: "Qwen", bestFor: "High-quality multilingual chat", bestForZh: "高质量多语言对话", tier: "stable" },
  { id: "Qwen3.5-9B-q4f16_1-MLC", label: "Qwen 3.5 9B", family: "Qwen", bestFor: "Best general quality on capable devices", bestForZh: "高性能设备上的通用高质量回答", tier: "stable" },
  { id: "Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 Coder 0.5B", family: "Qwen Coder", bestFor: "Fast code completion", bestForZh: "快速代码补全", tier: "stable", capabilities: ["chat", "coding"] },
  { id: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 Coder 1.5B", family: "Qwen Coder", bestFor: "Light code explanation", bestForZh: "轻量代码解释", tier: "stable", capabilities: ["chat", "coding"] },
  { id: "Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 Coder 3B", family: "Qwen Coder", bestFor: "Code review and technical work", bestForZh: "编程、审查与代码解释", tier: "stable", capabilities: ["chat", "coding"] },
  { id: "Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 Coder 7B", family: "Qwen Coder", bestFor: "Complex coding tasks", bestForZh: "复杂编程任务", tier: "stable", capabilities: ["chat", "coding"] },
  { id: "Ministral-3-3B-Reasoning-2512-q4f16_1-MLC", label: "Ministral 3 3B Reasoning", family: "Mistral", bestFor: "Compact reasoning experiments", bestForZh: "轻量推理实验", tier: "experimental", capabilities: ["chat", "reasoning"] },
  { id: "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC", label: "DeepSeek R1 Distill Qwen 7B", family: "DeepSeek", bestFor: "Long-form reasoning", bestForZh: "长链路推理任务", tier: "experimental", capabilities: ["chat", "reasoning"] },
  { id: "Phi-3.5-vision-instruct-q4f16_1-MLC", label: "Phi 3.5 Vision", family: "Phi", bestFor: "Vision model preview", bestForZh: "视觉模型预览", tier: "experimental", capabilities: ["chat", "vision"] },
  { id: AGENT_MODEL_ID, label: "Hermes 2 Pro Mistral 7B", family: "Hermes", bestFor: "Local agent workflows", bestForZh: "本地 Agent 工作流", tier: "experimental", capabilities: ["chat", "tools"] },
  { id: "Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC", label: "Hermes 2 Pro Llama 3 8B", family: "Hermes", bestFor: "Reliable multi-step tool use", bestForZh: "可靠的多步工具调用", tier: "experimental", capabilities: ["chat", "tools"] },
  { id: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC", label: "Hermes 3 Llama 3.1 8B", family: "Hermes", bestFor: "Higher-quality local agents", bestForZh: "更高质量的本地 Agent", tier: "experimental", capabilities: ["chat", "tools"] },
];

const OFFICIAL_RECORDS = prebuiltAppConfig.model_list;
const OFFICIAL_BY_ID = new Map(OFFICIAL_RECORDS.map((record) => [record.model_id, record]));
const TOOL_MODEL_IDS = new Set(functionCallingModelIds);

export const OFFICIAL_MODEL_RECORD_COUNT = OFFICIAL_RECORDS.length;
export const CURATED_MODEL_COUNT = CURATED_MODEL_SPECS.length;
export const OFFICIAL_MODEL_IDS = new Set(OFFICIAL_RECORDS.map((record) => record.model_id));

export function logicalModelKey(modelId: string) {
  return modelId
    .replace(/-(q[034]f(?:16|32)(?:_1)?)-MLC(?:-1k)?$/i, "")
    .replace(/-MLC(?:-1k)?$/i, "");
}

function isChatRecord(record: ModelRecord) {
  return record.model_type === undefined || record.model_type === ModelType.LLM || record.model_type === ModelType.VLM;
}

const OFFICIAL_GROUPS = (() => {
  const groups = new Map<string, ModelRecord[]>();
  for (const record of OFFICIAL_RECORDS.filter(isChatRecord)) {
    const key = logicalModelKey(record.model_id);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return groups;
})();

export const OFFICIAL_LOGICAL_MODEL_COUNT = OFFICIAL_GROUPS.size;
const CURATED_BY_KEY = new Map(CURATED_MODEL_SPECS.map((spec) => [logicalModelKey(spec.id), spec]));

function recordCompatible(record: ModelRecord, profile?: DeviceProfile | null) {
  if (!profile?.webGPU) return profile == null;
  if (record.buffer_size_required_bytes && profile.maxStorageBufferBindingSize) {
    if (profile.maxStorageBufferBindingSize < record.buffer_size_required_bytes) return false;
  }
  return !record.required_features?.some((feature) => !profile.features.includes(feature));
}

function variantScore(record: ModelRecord, profile?: DeviceProfile | null) {
  let score = recordCompatible(record, profile) ? 1000 : 0;
  if (!record.model_id.endsWith("-1k")) score += 100;
  if (record.model_id.includes("q4f16_1")) score += 40;
  else if (record.model_id.includes("q4f32_1")) score += 30;
  else if (record.model_id.includes("q0f16")) score += 20;
  else if (record.model_id.includes("q0f32")) score += 10;
  score -= (record.vram_required_MB ?? 0) / 100_000;
  return score;
}

function selectVariant(variants: ModelRecord[], profile?: DeviceProfile | null) {
  return [...variants].sort((a, b) => variantScore(b, profile) - variantScore(a, profile))[0];
}

function inferCapabilities(record: ModelRecord): ModelCapability[] {
  const id = record.model_id.toLowerCase();
  const capabilities = new Set<ModelCapability>(["chat"]);
  if (id.includes("coder")) capabilities.add("coding");
  if (id.includes("reasoning") || id.includes("r1-") || id.includes("math") || id.includes("wizardmath")) capabilities.add("reasoning");
  if (record.model_type === ModelType.VLM || id.includes("vision")) capabilities.add("vision");
  if (TOOL_MODEL_IDS.has(record.model_id)) capabilities.add("tools");
  if (id.includes("-base-")) capabilities.add("base");
  return [...capabilities];
}

function familyFromId(modelId: string) {
  const id = modelId.toLowerCase();
  if (id.includes("qwen2.5-coder")) return "Qwen Coder";
  if (id.startsWith("qwen")) return "Qwen";
  if (id.startsWith("llama")) return "Llama";
  if (id.startsWith("deepseek")) return "DeepSeek";
  if (id.includes("hermes")) return "Hermes";
  if (id.startsWith("phi")) return "Phi";
  if (id.startsWith("gemma")) return "Gemma";
  if (id.startsWith("ministral") || id.startsWith("mistral")) return "Mistral";
  if (id.startsWith("smollm")) return "SmolLM";
  if (id.startsWith("olmo")) return "OLMo";
  if (id.startsWith("tinyllama")) return "TinyLlama";
  if (id.startsWith("stablelm")) return "StableLM";
  if (id.startsWith("redpajama")) return "RedPajama";
  return modelId.split("-")[0];
}

function labelFromId(modelId: string) {
  return logicalModelKey(modelId).replaceAll("-", " ").replaceAll("_", ".");
}

function definitionFromGroup(
  variants: ModelRecord[],
  tier: ModelTier,
  profile?: DeviceProfile | null,
  spec?: CuratedModelSpec,
): ModelDefinition {
  const record = selectVariant(variants, profile);
  const capabilities = spec?.capabilities ?? inferCapabilities(record);
  const contextWindow = Math.min(Number(record.overrides?.context_window_size ?? MODEL_CONTEXT_WINDOW), MODEL_CONTEXT_WINDOW);
  return {
    id: record.model_id,
    label: spec?.label ?? labelFromId(record.model_id),
    family: spec?.family ?? familyFromId(record.model_id),
    bestFor: spec?.bestFor ?? (capabilities.includes("base") ? "Advanced base model" : "Official WebLLM model"),
    bestForZh: spec?.bestForZh ?? (capabilities.includes("base") ? "高级基础模型" : "WebLLM 官方模型"),
    vramRequiredMB: record.vram_required_MB ?? 0,
    contextWindow,
    source: "built-in",
    tier,
    capabilities,
    variants,
    record,
  };
}

export function curatedModels(profile?: DeviceProfile | null) {
  return CURATED_MODEL_SPECS.map((spec) => {
    const variants = OFFICIAL_GROUPS.get(logicalModelKey(spec.id));
    if (!variants?.length) throw new Error(`WebLLM record is missing for ${spec.id}`);
    return definitionFromGroup(variants, spec.tier, profile, spec);
  });
}

export function advancedModels(profile?: DeviceProfile | null) {
  return [...OFFICIAL_GROUPS.entries()]
    .filter(([key]) => !CURATED_BY_KEY.has(key))
    .map(([, variants]) => definitionFromGroup(variants, "advanced", profile))
    .sort((a, b) => a.vramRequiredMB - b.vramRequiredMB || a.label.localeCompare(b.label));
}

function customDefinitions(customModels: CustomModelManifest[]): ModelDefinition[] {
  return customModels.map((manifest) => ({
    id: manifest.record.model_id,
    label: manifest.label,
    family: "Custom MLC",
    bestFor: "Advanced local model",
    bestForZh: "高级自定义本地模型",
    vramRequiredMB: manifest.record.vram_required_MB ?? 0,
    contextWindow: Math.min(Number(manifest.record.overrides?.context_window_size ?? MODEL_CONTEXT_WINDOW), MODEL_CONTEXT_WINDOW),
    source: "custom",
    tier: "custom",
    capabilities: inferCapabilities(manifest.record),
    variants: [manifest.record],
    record: manifest.record,
  }));
}

export function allModels(
  customModels: CustomModelManifest[] = [],
  options: { includeAdvanced?: boolean; profile?: DeviceProfile | null } = {},
): ModelDefinition[] {
  return [
    ...curatedModels(options.profile),
    ...(options.includeAdvanced ? advancedModels(options.profile) : []),
    ...customDefinitions(customModels),
  ];
}

export function modelPickerModels(customModels: CustomModelManifest[], activeModelId?: string, profile?: DeviceProfile | null) {
  const models = allModels(customModels, { profile });
  const active = activeModelId ? getModel(activeModelId, customModels, profile) : undefined;
  if (!active) return models;
  const activeIndex = models.findIndex((model) => logicalModelKey(model.id) === logicalModelKey(active.id));
  if (activeIndex === -1) return [active, ...models];
  return models.map((model, index) => index === activeIndex ? active : model);
}

export function getModel(modelId: string, customModels: CustomModelManifest[] = [], profile?: DeviceProfile | null) {
  const custom = customDefinitions(customModels).find((model) => model.id === modelId);
  if (custom) return custom;
  const record = OFFICIAL_BY_ID.get(modelId);
  if (!record || !isChatRecord(record)) return undefined;
  const key = logicalModelKey(modelId);
  const variants = OFFICIAL_GROUPS.get(key) ?? [record];
  const spec = CURATED_BY_KEY.get(key);
  const definition = definitionFromGroup(variants, spec?.tier ?? "advanced", profile, spec);
  return definition.id === modelId ? definition : {
    ...definition,
    id: record.model_id,
    vramRequiredMB: record.vram_required_MB ?? definition.vramRequiredMB,
    contextWindow: Math.min(Number(record.overrides?.context_window_size ?? MODEL_CONTEXT_WINDOW), MODEL_CONTEXT_WINDOW),
    capabilities: spec?.capabilities ?? inferCapabilities(record),
    record,
  };
}

export function buildAppConfig(customModels: CustomModelManifest[] = []): AppConfig {
  const records = OFFICIAL_RECORDS.map((record) => ({
    ...record,
    overrides: record.model_type === ModelType.embedding ? record.overrides : {
      ...record.overrides,
      context_window_size: Math.min(Number(record.overrides?.context_window_size ?? MODEL_CONTEXT_WINDOW), MODEL_CONTEXT_WINDOW),
    },
  }));
  const customRecords: ModelRecord[] = customModels.map(({ record }) => ({
    ...record,
    overrides: {
      ...record.overrides,
      context_window_size: Math.min(Number(record.overrides?.context_window_size ?? MODEL_CONTEXT_WINDOW), MODEL_CONTEXT_WINDOW),
    },
  }));
  return { model_list: [...records, ...customRecords], cacheBackend: "cache" };
}

export function modelSizeLabel(model: Pick<ModelDefinition, "vramRequiredMB">) {
  if (model.vramRequiredMB >= 1024) return `${(model.vramRequiredMB / 1024).toFixed(1)} GB`;
  return `${Math.round(model.vramRequiredMB)} MB`;
}

const allowedModelHosts = ["huggingface.co", "hf.co", "xethub.hf.co", "raw.githubusercontent.com"];

function allowedUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && allowedModelHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export function parseCustomManifest(raw: string, existingIds: string[]): CustomModelManifest {
  const parsed = JSON.parse(raw) as Partial<CustomModelManifest>;
  if (parsed.schemaVersion !== 1 || !parsed.label?.trim() || !parsed.record) {
    throw new Error("Manifest requires schemaVersion 1, label, and record.");
  }
  const record = parsed.record;
  if (!record.model_id?.trim() || !record.model || !record.model_lib) {
    throw new Error("Model record requires model_id, model, and model_lib.");
  }
  if (existingIds.includes(record.model_id) || OFFICIAL_MODEL_IDS.has(record.model_id)) throw new Error("Model ID already exists.");
  if (!allowedUrl(record.model) || !allowedUrl(record.model_lib)) {
    throw new Error("Model URLs must use an approved HTTPS host.");
  }
  const contextWindow = Number(record.overrides?.context_window_size ?? MODEL_CONTEXT_WINDOW);
  if (!Number.isFinite(contextWindow) || contextWindow < 256 || contextWindow > MODEL_CONTEXT_WINDOW) {
    throw new Error("Context window must be between 256 and 4096.");
  }
  return {
    schemaVersion: 1,
    label: parsed.label.trim().slice(0, 80),
    record: { ...record, overrides: { ...record.overrides, context_window_size: contextWindow } },
  };
}
