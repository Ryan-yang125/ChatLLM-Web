import { describe, expect, it } from "vitest";
import {
  allModels,
  AGENT_MODEL_ID,
  buildAppConfig,
  CURATED_MODEL_COUNT,
  DEFAULT_MODEL_ID,
  FALLBACK_MODEL_ID,
  logicalModelKey,
  modelPickerModels,
  OFFICIAL_LOGICAL_MODEL_COUNT,
  OFFICIAL_MODEL_RECORD_COUNT,
  parseCustomManifest,
} from "../src/features/models/catalog";
import { modelFit, recommendModelId } from "../src/features/runtime/device";
import type { DeviceProfile } from "../src/types/chat";

const profile = (memory: number | null, webGPU = true): DeviceProfile => ({
  webGPU,
  adapterName: "Test GPU",
  deviceMemoryGB: memory,
  storageUsage: 0,
  storageQuota: 1,
  maxBufferSize: 4_294_967_296,
  maxStorageBufferBindingSize: 4_294_967_296,
  features: ["shader-f16"],
  checkedAt: 1,
});

describe("model catalog", () => {
  it("ships 20 curated models", () => {
    expect(CURATED_MODEL_COUNT).toBe(20);
    expect(allModels()).toHaveLength(20);
  });

  it("ships three native tool-calling models", () => {
    const toolModels = allModels().filter((model) => model.capabilities.includes("tools"));
    expect(toolModels).toHaveLength(3);
    expect(toolModels.map((model) => model.id)).toContain(AGENT_MODEL_ID);
  });

  it("groups the full official catalog into logical models", () => {
    const models = allModels([], { includeAdvanced: true });
    expect(OFFICIAL_MODEL_RECORD_COUNT).toBe(163);
    expect(OFFICIAL_LOGICAL_MODEL_COUNT).toBe(65);
    expect(models).toHaveLength(65);
    expect(new Set(models.map((model) => logicalModelKey(model.id))).size).toBe(65);
  });

  it("keeps an active advanced model in the prompt picker", () => {
    const advancedId = "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC";
    const models = modelPickerModels([], advancedId);
    expect(models[0].id).toBe(advancedId);
    expect(models).toHaveLength(21);
  });

  it("keeps one picker row when the active curated quantization differs", () => {
    const activeId = "SmolLM2-360M-Instruct-q4f16_1-MLC";
    const models = modelPickerModels([], activeId, { ...profile(8), features: [] });
    expect(models).toHaveLength(20);
    expect(models.find((model) => model.label === "SmolLM2 360M")?.id).toBe(activeId);
  });

  it("selects a non-f16 variant when shader-f16 is unavailable", () => {
    const models = allModels([], { profile: { ...profile(8), features: [] } });
    expect(models.find((model) => model.label === "SmolLM2 360M")?.id).toBe("SmolLM2-360M-Instruct-q4f32_1-MLC");
  });

  it("marks models above the device memory budget", () => {
    const model = allModels([], { profile: profile(4) }).find((item) => item.label === "Qwen 3.5 9B");
    expect(model).toBeDefined();
    expect(modelFit(model!, profile(4))).toBe("high-memory");
  });

  it("passes every official runtime record to WebLLM", () => {
    expect(buildAppConfig().model_list).toHaveLength(163);
  });

  it("recommends Qwen 2B for known 8GB devices", () => {
    expect(recommendModelId(profile(8))).toBe(DEFAULT_MODEL_ID);
  });

  it("uses Llama 1B for unknown or lower memory", () => {
    expect(recommendModelId(profile(null))).toBe(FALLBACK_MODEL_ID);
    expect(recommendModelId(profile(4))).toBe(FALLBACK_MODEL_ID);
  });

  it("validates a custom MLC manifest", () => {
    const manifest = parseCustomManifest(JSON.stringify({
      schemaVersion: 1,
      label: "Custom",
      record: {
        model: "https://huggingface.co/example/model",
        model_id: "example-model",
        model_lib: "https://raw.githubusercontent.com/example/models/main/model.wasm",
        overrides: { context_window_size: 4096 },
      },
    }), []);
    expect(manifest.record.model_id).toBe("example-model");
  });

  it("rejects unapproved model hosts", () => {
    expect(() => parseCustomManifest(JSON.stringify({
      schemaVersion: 1,
      label: "Custom",
      record: {
        model: "https://example.com/model",
        model_id: "example-model",
        model_lib: "https://example.com/model.wasm",
      },
    }), [])).toThrow("approved HTTPS host");
  });

  it("rejects custom IDs that collide with the official catalog", () => {
    expect(() => parseCustomManifest(JSON.stringify({
      schemaVersion: 1,
      label: "Duplicate",
      record: {
        model: "https://huggingface.co/example/model",
        model_id: FALLBACK_MODEL_ID,
        model_lib: "https://raw.githubusercontent.com/example/models/main/model.wasm",
      },
    }), [])).toThrow("already exists");
  });
});
