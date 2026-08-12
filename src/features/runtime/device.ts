import { DEFAULT_MODEL_ID, FALLBACK_MODEL_ID } from "@/features/models/catalog";
import type { DeviceProfile, ModelDefinition } from "@/types/chat";

type NavigatorWithMemory = Navigator & { deviceMemory?: number; gpu?: any };

export async function inspectDevice(): Promise<DeviceProfile> {
  const browser = navigator as NavigatorWithMemory;
  const storage: StorageEstimate = await navigator.storage?.estimate?.().catch(() => ({})) ?? {};

  if (!browser.gpu) {
    return {
      webGPU: false,
      adapterName: "Unavailable",
      deviceMemoryGB: browser.deviceMemory ?? null,
      storageUsage: storage?.usage ?? null,
      storageQuota: storage?.quota ?? null,
      maxBufferSize: null,
      maxStorageBufferBindingSize: null,
      features: [],
      checkedAt: Date.now(),
    };
  }

  const adapter = await browser.gpu.requestAdapter().catch(() => null);
  if (!adapter) {
    return {
      webGPU: false,
      adapterName: "No GPU adapter",
      deviceMemoryGB: browser.deviceMemory ?? null,
      storageUsage: storage?.usage ?? null,
      storageQuota: storage?.quota ?? null,
      maxBufferSize: null,
      maxStorageBufferBindingSize: null,
      features: [],
      checkedAt: Date.now(),
    };
  }

  const info = adapter.info ?? {};
  const adapterName = [info.vendor, info.architecture].filter(Boolean).join(" · ") || "WebGPU adapter";

  return {
    webGPU: true,
    adapterName,
    deviceMemoryGB: browser.deviceMemory ?? null,
    storageUsage: storage?.usage ?? null,
    storageQuota: storage?.quota ?? null,
    maxBufferSize: Number(adapter.limits?.maxBufferSize ?? 0) || null,
    maxStorageBufferBindingSize: Number(adapter.limits?.maxStorageBufferBindingSize ?? 0) || null,
    features: Array.from(adapter.features ?? []).map(String),
    checkedAt: Date.now(),
  };
}

export function isModelCompatible(model: ModelDefinition, profile: DeviceProfile | null) {
  if (!profile?.webGPU) return false;
  const record = model.record;
  if (record?.buffer_size_required_bytes && profile.maxStorageBufferBindingSize) {
    if (profile.maxStorageBufferBindingSize < record.buffer_size_required_bytes) return false;
  }
  if (record?.required_features?.some((feature) => !profile.features.includes(feature))) return false;
  return true;
}

export function modelFit(model: ModelDefinition, profile: DeviceProfile | null) {
  if (!isModelCompatible(model, profile)) return "incompatible" as const;
  if (profile?.deviceMemoryGB && model.vramRequiredMB > profile.deviceMemoryGB * 1024 * 0.72) {
    return "high-memory" as const;
  }
  return "compatible" as const;
}

export function recommendModelId(profile: DeviceProfile | null) {
  if (!profile?.webGPU) return FALLBACK_MODEL_ID;
  return profile.deviceMemoryGB !== null && profile.deviceMemoryGB >= 8
    ? DEFAULT_MODEL_ID
    : FALLBACK_MODEL_ID;
}

export function formatBytes(value: number | null) {
  if (value === null) return "Unknown";
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GB`;
  if (value >= 1024 ** 2) return `${Math.round(value / 1024 ** 2)} MB`;
  return `${Math.round(value / 1024)} KB`;
}
