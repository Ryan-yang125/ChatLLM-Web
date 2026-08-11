import { describe, expect, it } from "vitest";
import {
  allModels,
  DEFAULT_MODEL_ID,
  FALLBACK_MODEL_ID,
  parseCustomManifest,
} from "../src/features/models/catalog";
import { recommendModelId } from "../src/features/runtime/device";
import type { DeviceProfile } from "../src/types/chat";

const profile = (memory: number | null, webGPU = true): DeviceProfile => ({
  webGPU,
  adapterName: "Test GPU",
  deviceMemoryGB: memory,
  storageUsage: 0,
  storageQuota: 1,
  maxBufferSize: 1,
  maxStorageBufferBindingSize: 1,
  features: [],
  checkedAt: 1,
});

describe("model catalog", () => {
  it("ships the curated five-model catalog", () => {
    expect(allModels()).toHaveLength(5);
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
});
