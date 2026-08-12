// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AGENT_MODEL_ID } from "../src/features/models/catalog";
import type { Conversation } from "../src/types/chat";

const engineMocks = vi.hoisted(() => ({
  agentStep: vi.fn(),
  interrupt: vi.fn(),
  isReady: vi.fn(() => true),
  isCached: vi.fn(async () => true),
  setCustomModels: vi.fn(),
  prepare: vi.fn(),
  generate: vi.fn(),
  unload: vi.fn(),
  clearModelCache: vi.fn(),
}));

vi.mock("@/features/runtime/engine-manager", () => ({ engineManager: engineMocks }));
vi.mock("@/features/persistence/db", () => ({
  loadSnapshot: vi.fn(async () => ({})),
  saveSnapshot: vi.fn(async () => undefined),
  loadActiveConversationId: vi.fn(() => null),
}));

import { useChatStore } from "../src/store/chat";

function conversation(): Conversation {
  return {
    id: "conversation-agent",
    title: "New conversation",
    mode: "agent",
    modelId: AGENT_MODEL_ID,
    settings: { temperature: 0.7, topP: 0.95, maxTokens: 512, systemPrompt: "Be concise." },
    messages: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

function completion(toolCalls: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> = [], content = "") {
  return { content, toolCalls, statsText: "10 tok/s", elapsedMs: 100 };
}

beforeEach(() => {
  engineMocks.agentStep.mockReset();
  engineMocks.interrupt.mockReset();
  engineMocks.isReady.mockReturnValue(true);
  useChatStore.setState({
    conversations: [conversation()],
    activeConversationId: "conversation-agent",
    attachments: [],
    artifacts: [],
    activeArtifactId: null,
    activeModelId: AGENT_MODEL_ID,
    runtimePhase: "ready",
    modelPhase: "ready",
    modelMessage: "Ready",
    modelProgress: 100,
    isGenerating: false,
    generationConversationId: null,
    approval: null,
    pendingSend: null,
    contextNotice: null,
  });
});

describe("agent run integration", () => {
  it("executes a read tool and returns a final answer", async () => {
    engineMocks.agentStep
      .mockResolvedValueOnce(completion([{ id: "call-1", type: "function", function: { name: "calculate", arguments: '{"expression":"2 + 2"}' } }]))
      .mockResolvedValueOnce(completion([], "The result is **4**."));

    useChatStore.getState().sendMessage("Calculate two plus two");
    await vi.waitFor(() => expect(useChatStore.getState().isGenerating).toBe(false));

    const assistant = useChatStore.getState().conversations[0].messages.at(-1)!;
    expect(assistant.content).toBe("The result is **4**.");
    expect(assistant.agentRun?.status).toBe("complete");
    expect(assistant.agentRun?.steps).toMatchObject([{ toolName: "calculate", status: "complete", result: "4" }]);
    expect(engineMocks.agentStep).toHaveBeenCalledTimes(2);
  });

  it("pauses artifact writes until the diff is approved", async () => {
    engineMocks.agentStep
      .mockResolvedValueOnce(completion([{ id: "call-2", type: "function", function: { name: "create_artifact", arguments: '{"title":"Brief","kind":"markdown","content":"# Brief\\nLocal"}' } }]))
      .mockResolvedValueOnce(completion([], "Created the brief."));

    useChatStore.getState().sendMessage("Create a brief");
    await vi.waitFor(() => expect(useChatStore.getState().approval?.kind).toBe("agent-tool"));
    expect(useChatStore.getState().artifacts).toHaveLength(0);

    await useChatStore.getState().confirmApproval();
    await vi.waitFor(() => expect(useChatStore.getState().isGenerating).toBe(false));

    expect(useChatStore.getState().artifacts).toMatchObject([{ title: "Brief", kind: "markdown", content: "# Brief\nLocal" }]);
    const assistant = useChatStore.getState().conversations[0].messages.at(-1)!;
    expect(assistant.agentRun?.steps[0]).toMatchObject({ status: "complete", artifactId: expect.any(String) });
  });

  it("returns a declined artifact write to the model without saving", async () => {
    engineMocks.agentStep
      .mockResolvedValueOnce(completion([{ id: "call-3", type: "function", function: { name: "create_artifact", arguments: '{"title":"Draft","kind":"text","content":"Draft"}' } }]))
      .mockResolvedValueOnce(completion([], "The draft was left unchanged."));

    useChatStore.getState().sendMessage("Create a draft");
    await vi.waitFor(() => expect(useChatStore.getState().approval?.kind).toBe("agent-tool"));
    useChatStore.getState().cancelApproval();
    await vi.waitFor(() => expect(useChatStore.getState().isGenerating).toBe(false));

    expect(useChatStore.getState().artifacts).toHaveLength(0);
    const assistant = useChatStore.getState().conversations[0].messages.at(-1)!;
    expect(assistant.agentRun?.steps[0]).toMatchObject({ status: "declined", result: "User declined the artifact change." });
  });

  it("stops an active agent completion and preserves the run", async () => {
    engineMocks.agentStep.mockImplementation((_history, _settings, _tools, _onChunk, signal: AbortSignal) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));

    useChatStore.getState().sendMessage("Keep working");
    await vi.waitFor(() => expect(useChatStore.getState().isGenerating).toBe(true));
    useChatStore.getState().cancelGeneration();

    expect(useChatStore.getState().isGenerating).toBe(false);
    expect(engineMocks.interrupt).toHaveBeenCalledOnce();
    const assistant = useChatStore.getState().conversations[0].messages.at(-1)!;
    expect(assistant.status).toBe("stopped");
    expect(assistant.agentRun?.status).toBe("stopped");
  });
});
