import type {
  ChatCompletionMessageParam,
  WebWorkerMLCEngine,
} from "@mlc-ai/web-llm";
import {
  CreateWebWorkerMLCEngine,
  deleteModelAllInfoInCache,
  hasModelInCache,
} from "@mlc-ai/web-llm";
import { buildAppConfig, getModel, MODEL_CONTEXT_WINDOW } from "@/features/models/catalog";
import type { CustomModelManifest, GenerationSettings, Message } from "@/types/chat";

export type EngineProgress = { progress: number | null; text: string; phase: "downloading" | "loading" };
export type GenerationResult = { content: string; statsText: string; elapsedMs: number };

function friendlyError(reason: unknown) {
  const message = reason instanceof Error ? reason.message : String(reason);
  if (/device.*lost|out of memory|memory|OOM/i.test(message)) return "The model exceeded the available GPU memory.";
  if (/WebGPU|GPUAdapter|navigator\.gpu/i.test(message)) return "WebGPU is unavailable in this browser.";
  if (/fetch|network|download/i.test(message)) return "The model download could not finish. Check the connection and retry.";
  return message || "The local model could not start.";
}

class EngineManager {
  private worker?: Worker;
  private engine?: WebWorkerMLCEngine;
  private activeModelId?: string;
  private operationId = 0;
  private customModels: CustomModelManifest[] = [];

  setCustomModels(models: CustomModelManifest[]) {
    this.customModels = models;
  }

  getActiveModelId() {
    return this.activeModelId;
  }

  isReady(modelId?: string) {
    return Boolean(this.engine && (!modelId || this.activeModelId === modelId));
  }

  async isCached(modelId: string) {
    return hasModelInCache(modelId, buildAppConfig(this.customModels));
  }

  async prepare(modelId: string, onProgress: (progress: EngineProgress) => void) {
    const currentOperation = ++this.operationId;
    const appConfig = buildAppConfig(this.customModels);
    const model = getModel(modelId, this.customModels);
    if (!model) throw new Error(`Unknown model: ${modelId}`);
    if (!("gpu" in navigator)) throw new Error("WebGPU is unavailable in this browser.");

    try {
      if (!this.worker || !this.engine) {
        this.worker = new Worker(new URL("../../workers/web-llm.worker.ts", import.meta.url), {
          type: "module",
          name: "ChatLLM WebGPU",
        });
        this.engine = await CreateWebWorkerMLCEngine(this.worker, modelId, {
          appConfig,
          initProgressCallback: (report) => {
            if (currentOperation !== this.operationId) return;
            const text = report.text.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
            onProgress({
              progress: Number.isFinite(report.progress) ? Math.round(report.progress * 100) : null,
              text,
              phase: report.progress < 0.92 ? "downloading" : "loading",
            });
          },
        });
      } else if (this.activeModelId !== modelId) {
        onProgress({ progress: null, text: `Loading ${model.label}`, phase: "loading" });
        await this.engine.reload(modelId, { context_window_size: MODEL_CONTEXT_WINDOW });
      }
      if (currentOperation !== this.operationId) throw new Error("Model load was cancelled.");
      this.activeModelId = modelId;
    } catch (error) {
      if (currentOperation === this.operationId) {
        this.worker?.terminate();
        this.worker = undefined;
        this.engine = undefined;
        this.activeModelId = undefined;
      }
      throw new Error(friendlyError(error), { cause: error });
    }
  }

  async generate(
    messages: Message[],
    settings: GenerationSettings,
    onChunk: (content: string) => void,
    signal: AbortSignal,
  ): Promise<GenerationResult> {
    if (!this.engine || !this.activeModelId) throw new Error("Load a model before sending a message.");
    const currentOperation = ++this.operationId;
    const startedAt = performance.now();
    const history: ChatCompletionMessageParam[] = [
      { role: "system", content: settings.systemPrompt },
      ...messages
        .filter((message) => message.role !== "system" && !message.isError && message.content.trim())
        .map((message) => ({ role: message.role as "assistant" | "user", content: message.runtimeContent ?? message.content })),
    ];

    try {
      const chunks = await this.engine.chat.completions.create({
        messages: history,
        stream: true,
        stream_options: { include_usage: true },
        temperature: settings.temperature,
        top_p: settings.topP,
        max_tokens: settings.maxTokens,
      });
      let content = "";
      for await (const chunk of chunks) {
        if (signal.aborted || currentOperation !== this.operationId) break;
        content += chunk.choices[0]?.delta.content || "";
        onChunk(content);
      }
      const statsText = await this.engine.runtimeStatsText().catch(() => "");
      return { content, statsText, elapsedMs: Math.round(performance.now() - startedAt) };
    } catch (error) {
      throw new Error(friendlyError(error), { cause: error });
    }
  }

  interrupt() {
    this.operationId += 1;
    this.engine?.interruptGenerate();
  }

  async unload() {
    this.operationId += 1;
    await this.engine?.unload().catch(() => undefined);
    this.worker?.terminate();
    this.worker = undefined;
    this.engine = undefined;
    this.activeModelId = undefined;
  }

  async clearModelCache(modelId: string) {
    if (this.activeModelId === modelId) await this.unload();
    await deleteModelAllInfoInCache(modelId, buildAppConfig(this.customModels));
  }
}

export const engineManager = new EngineManager();
