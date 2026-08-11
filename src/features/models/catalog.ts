import type { AppConfig, ModelRecord } from "@mlc-ai/web-llm";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";
import type { CustomModelManifest, ModelDefinition } from "@/types/chat";

export const DEFAULT_MODEL_ID = "Qwen3.5-2B-q4f16_1-MLC";
export const FALLBACK_MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
export const MODEL_CONTEXT_WINDOW = 4096;

export const BUILT_IN_MODELS: ModelDefinition[] = [
  {
    id: FALLBACK_MODEL_ID,
    label: "Llama 3.2 1B",
    family: "Llama",
    bestFor: "Fast local chat",
    bestForZh: "低资源设备与快速对话",
    vramRequiredMB: 879.04,
    contextWindow: MODEL_CONTEXT_WINDOW,
    source: "built-in",
  },
  {
    id: "Qwen3.5-0.8B-q4f16_1-MLC",
    label: "Qwen 3.5 0.8B",
    family: "Qwen",
    bestFor: "Light bilingual work",
    bestForZh: "中英文轻量任务",
    vramRequiredMB: 1629.49,
    contextWindow: MODEL_CONTEXT_WINDOW,
    source: "built-in",
  },
  {
    id: DEFAULT_MODEL_ID,
    label: "Qwen 3.5 2B",
    family: "Qwen",
    bestFor: "Everyday local assistant",
    bestForZh: "默认推荐与通用对话",
    vramRequiredMB: 2245.44,
    contextWindow: MODEL_CONTEXT_WINDOW,
    source: "built-in",
  },
  {
    id: "Qwen3.5-4B-q4f16_1-MLC",
    label: "Qwen 3.5 4B",
    family: "Qwen",
    bestFor: "Higher-quality answers",
    bestForZh: "更高质量的通用任务",
    vramRequiredMB: 3867.82,
    contextWindow: MODEL_CONTEXT_WINDOW,
    source: "built-in",
  },
  {
    id: "Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 Coder 3B",
    family: "Qwen Coder",
    bestFor: "Code and technical work",
    bestForZh: "编程、审查与代码解释",
    vramRequiredMB: 2504.76,
    contextWindow: MODEL_CONTEXT_WINDOW,
    source: "built-in",
  },
];

const BUILT_IN_IDS = new Set(BUILT_IN_MODELS.map((model) => model.id));

export function getModel(modelId: string, customModels: CustomModelManifest[] = []) {
  return allModels(customModels).find((model) => model.id === modelId);
}

export function allModels(customModels: CustomModelManifest[] = []): ModelDefinition[] {
  return [
    ...BUILT_IN_MODELS.map((model) => ({
      ...model,
      record: prebuiltAppConfig.model_list.find((record) => record.model_id === model.id),
    })),
    ...customModels.map((manifest) => ({
      id: manifest.record.model_id,
      label: manifest.label,
      family: "Custom MLC",
      bestFor: "Advanced local model",
      bestForZh: "高级自定义本地模型",
      vramRequiredMB: manifest.record.vram_required_MB ?? 0,
      contextWindow: Math.min(
        Number(manifest.record.overrides?.context_window_size ?? MODEL_CONTEXT_WINDOW),
        MODEL_CONTEXT_WINDOW,
      ),
      source: "custom" as const,
      record: manifest.record,
    })),
  ];
}

export function buildAppConfig(customModels: CustomModelManifest[] = []): AppConfig {
  const records = prebuiltAppConfig.model_list
    .filter((record) => BUILT_IN_IDS.has(record.model_id))
    .map((record) => ({
      ...record,
      overrides: {
        ...record.overrides,
        context_window_size: MODEL_CONTEXT_WINDOW,
      },
    }));

  const customRecords: ModelRecord[] = customModels.map(({ record }) => ({
    ...record,
    overrides: {
      ...record.overrides,
      context_window_size: Math.min(
        Number(record.overrides?.context_window_size ?? MODEL_CONTEXT_WINDOW),
        MODEL_CONTEXT_WINDOW,
      ),
    },
  }));

  return { model_list: [...records, ...customRecords], cacheBackend: "cache" };
}

export function modelSizeLabel(model: Pick<ModelDefinition, "vramRequiredMB">) {
  if (model.vramRequiredMB >= 1024) return `${(model.vramRequiredMB / 1024).toFixed(1)} GB`;
  return `${Math.round(model.vramRequiredMB)} MB`;
}

const allowedModelHosts = [
  "huggingface.co",
  "hf.co",
  "xethub.hf.co",
  "raw.githubusercontent.com",
];

function allowedUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && allowedModelHosts.some((host) =>
      url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
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
  if (existingIds.includes(record.model_id)) throw new Error("Model ID already exists.");
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
    record: {
      ...record,
      overrides: { ...record.overrides, context_window_size: contextWindow },
    },
  };
}
