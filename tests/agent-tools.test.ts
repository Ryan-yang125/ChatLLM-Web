import { describe, expect, it } from "vitest";
import { commitArtifactProposal, executeAgentTool, parseToolArguments } from "../src/features/agent/tools";
import type { Artifact, LocalAttachment } from "../src/types/chat";

const attachment: LocalAttachment = {
  id: "file-1",
  conversationId: "conversation-1",
  name: "notes.md",
  mimeType: "text/markdown",
  size: 42,
  text: "Revenue: 120\nCosts: 45\nTODO: verify totals",
  estimatedTokens: 12,
  createdAt: 1,
};

const artifact: Artifact = {
  id: "artifact-1",
  conversationId: "conversation-1",
  title: "Summary",
  kind: "markdown",
  content: "# Summary\nOld",
  createdAt: 1,
  updatedAt: 1,
};

const context = (artifacts: Artifact[] = []) => ({
  conversationId: "conversation-1",
  attachments: [attachment],
  artifacts,
  createId: () => "artifact-new",
  now: () => 10,
});

describe("local agent tools", () => {
  it("parses object arguments and rejects arrays", () => {
    expect(parseToolArguments('{"query":"TODO"}')).toEqual({ query: "TODO" });
    expect(() => parseToolArguments("[]")).toThrow("JSON object");
  });

  it("lists, reads, and searches only selected context", () => {
    expect(executeAgentTool("list_context_files", {}, context()).output).toContain("notes.md");
    expect(executeAgentTool("read_context_file", { name: "notes.md" }, context()).output).toContain("Revenue");
    expect(executeAgentTool("search_context", { query: "todo" }, context()).output).toContain('"line":3');
    expect(() => executeAgentTool("read_context_file", { name: "private.md" }, context())).toThrow("not found");
  });

  it("evaluates bounded arithmetic without executing code", () => {
    expect(executeAgentTool("calculate", { expression: "(120 - 45) * 2" }, context()).output).toBe("150");
    expect(() => executeAgentTool("calculate", { expression: "globalThis.process" }, context())).toThrow("number");
    expect(() => executeAgentTool("calculate", { expression: "1 / 0" }, context())).toThrow("Invalid arithmetic");
  });

  it("requires approval proposals for artifact writes", () => {
    const created = executeAgentTool("create_artifact", { title: "Brief", kind: "markdown", content: "  # Brief\n" }, context());
    expect(created.proposal?.operation).toBe("create");
    expect(created.proposal?.artifact.content).toBe("  # Brief\n");
    expect(commitArtifactProposal(created.proposal!).output).toContain('"status":"saved"');

    const updated = executeAgentTool("update_artifact", { artifact: "Summary", content: "# Summary\nNew" }, context([artifact]));
    expect(updated.proposal?.operation).toBe("update");
    expect(updated.proposal?.previousContent).toBe(artifact.content);
    expect(updated.proposal?.artifact.updatedAt).toBe(10);
  });

  it("enforces artifact boundaries", () => {
    expect(() => executeAgentTool("create_artifact", { title: "Summary", kind: "markdown", content: "Duplicate" }, context([artifact]))).toThrow("already exists");
    expect(() => executeAgentTool("create_artifact", { title: "Huge", kind: "text", content: "x".repeat(64 * 1024 + 1) }, context())).toThrow("64 KB");
    expect(() => executeAgentTool("create_artifact", { title: "Lines", kind: "text", content: Array.from({ length: 2_001 }, () => "x").join("\n") }, context())).toThrow("2,000 lines");
    expect(() => executeAgentTool("create_artifact", { title: "Image", kind: "image", content: "data" }, context())).toThrow("Unsupported");
  });
});
