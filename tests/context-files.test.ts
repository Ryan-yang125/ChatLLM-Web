import { describe, expect, it } from "vitest";
import {
  contextBlock,
  estimateTokens,
  MAX_ATTACHMENT_TOKENS,
  validateAttachmentSelection,
} from "../src/features/context/files";
import type { LocalAttachment } from "../src/types/chat";

const attachment = (overrides: Partial<LocalAttachment> = {}): LocalAttachment => ({
  id: crypto.randomUUID(),
  conversationId: "conversation",
  name: "notes.md",
  mimeType: "text/markdown",
  size: 20,
  text: "Local context",
  estimatedTokens: 4,
  createdAt: 1,
  ...overrides,
});

describe("local file context", () => {
  it("estimates tokens conservatively", () => {
    expect(estimateTokens("12345678")).toBe(2);
  });

  it("rejects context above the request budget", () => {
    const result = validateAttachmentSelection([
      attachment({ estimatedTokens: MAX_ATTACHMENT_TOKENS + 1 }),
    ]);
    expect(result).toContain("under 2,048");
  });

  it("wraps files in explicit context blocks", () => {
    expect(contextBlock([attachment()])).toContain('<context file="notes.md">');
  });
});
