import type {
  ChatCompletionMessageParam,
  WebWorkerMLCEngine,
} from "@mlc-ai/web-llm";
import type { Message } from "@/types/chat";

export const MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
export const MODEL_LABEL = "Llama 3.2 1B";
export const MODEL_SIZE_LABEL = "~880 MB";
export const MODEL_CONTEXT_LABEL = "4K";

export type LocalEngineEvent =
  | { type: "progress"; progress: number; text: string }
  | { type: "ready" }
  | { type: "chunk"; content: string }
  | { type: "complete"; content: string; stats?: string }
  | { type: "error"; message: string };

type EngineListener = (event: LocalEngineEvent) => void;

function errorMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message : String(reason);
  if (/WebGPU|GPUAdapter|navigator\.gpu/i.test(message)) {
    return "WebGPU is unavailable. Open ChatLLM in a current Chrome or Edge browser with hardware acceleration enabled.";
  }
  if (/fetch|network|download/i.test(message)) {
    return "The local model download could not finish. Check the network and try again.";
  }
  return message || "The local model could not start.";
}

class WebLLMBridge {
  private worker?: Worker;
  private engine?: WebWorkerMLCEngine;
  private enginePromise?: Promise<WebWorkerMLCEngine>;
  private listener?: EngineListener;
  private loadId = 0;
  private generationId = 0;

  subscribe(listener: EngineListener) {
    this.listener = listener;
  }

  isReady() {
    return Boolean(this.engine);
  }

  private emit(event: LocalEngineEvent) {
    this.listener?.(event);
  }

  private ensureEngine() {
    if (this.engine) return Promise.resolve(this.engine);
    if (this.enginePromise) return this.enginePromise;
    if (!("gpu" in navigator)) {
      const error = new Error("WebGPU is unavailable in this browser.");
      this.emit({ type: "error", message: errorMessage(error) });
      return Promise.reject(error);
    }

    const currentLoadId = ++this.loadId;
    this.enginePromise = import("@mlc-ai/web-llm")
      .then(({ CreateWebWorkerMLCEngine, prebuiltAppConfig }) => {
        if (currentLoadId !== this.loadId) {
          throw new Error("Model load was cancelled.");
        }
        const worker = new Worker(new URL("../workers/web-llm.worker.ts", import.meta.url), {
          type: "module",
          name: "ChatLLM WebGPU",
        });
        this.worker = worker;

        return CreateWebWorkerMLCEngine(worker, MODEL_ID, {
          appConfig: {
            ...prebuiltAppConfig,
            cacheBackend: "cache" as const,
          },
          initProgressCallback: (report) => {
            if (currentLoadId !== this.loadId) return;
            this.emit({
              type: "progress",
              progress: Math.round(Math.min(1, Math.max(0, report.progress)) * 100),
              text: report.text,
            });
          },
        });
      })
      .then(async (engine) => {
        if (currentLoadId !== this.loadId) {
          await engine.unload().catch(() => undefined);
          throw new Error("Model load was cancelled.");
        }
        this.engine = engine;
        this.emit({ type: "ready" });
        return engine;
      })
      .catch((error: unknown) => {
        if (currentLoadId === this.loadId) {
          this.worker?.terminate();
          this.worker = undefined;
          this.enginePromise = undefined;
          this.emit({ type: "error", message: errorMessage(error) });
        }
        throw error;
      });

    return this.enginePromise;
  }

  prepare() {
    void this.ensureEngine().catch(() => undefined);
  }

  chat(messages: Message[]) {
    const currentGenerationId = ++this.generationId;
    void (async () => {
      try {
        const engine = await this.ensureEngine();
        if (currentGenerationId !== this.generationId) return;

        const history: ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: "You are a helpful, concise AI assistant. Respond with clear Markdown when useful.",
          },
          ...messages
            .filter((message) => !message.isError && message.content.trim())
            .map((message) => ({ role: message.role, content: message.content }) as ChatCompletionMessageParam),
        ];

        const chunks = await engine.chat.completions.create({
          messages: history,
          stream: true,
          stream_options: { include_usage: true },
          temperature: 0.7,
          max_tokens: 512,
        });

        let content = "";
        for await (const chunk of chunks) {
          if (currentGenerationId !== this.generationId) return;
          content += chunk.choices[0]?.delta.content || "";
          this.emit({ type: "chunk", content });
        }

        const stats = await engine.runtimeStatsText().catch(() => undefined);
        if (currentGenerationId === this.generationId) {
          this.emit({ type: "complete", content, stats });
        }
      } catch (error) {
        if (currentGenerationId === this.generationId) {
          this.emit({ type: "error", message: errorMessage(error) });
        }
      }
    })();
  }

  cancel() {
    this.generationId += 1;
    if (this.engine) {
      this.engine.interruptGenerate();
      return;
    }
    this.loadId += 1;
    this.worker?.terminate();
    this.worker = undefined;
    this.enginePromise = undefined;
  }

  async unload() {
    this.generationId += 1;
    this.loadId += 1;
    await this.engine?.unload().catch(() => undefined);
    this.worker?.terminate();
    this.worker = undefined;
    this.engine = undefined;
    this.enginePromise = undefined;
  }
}

export const webLLM = new WebLLMBridge();
