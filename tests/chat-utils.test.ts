import { describe, expect, it } from "vitest";
import {
  groupConversations,
  parseModelProgress,
  titleFromPrompt,
} from "../src/lib/chat-utils";
import type { Conversation } from "../src/types/chat";

function conversation(id: string, updatedAt: number): Conversation {
  return {
    id,
    title: id,
    messages: [],
    createdAt: updatedAt,
    updatedAt,
  };
}

describe("chat utilities", () => {
  it("groups conversations by recent day", () => {
    const now = new Date(2026, 7, 11, 12).getTime();
    const groups = groupConversations([
      conversation("today", now - 60_000),
      conversation("yesterday", now - 26 * 60 * 60 * 1000),
      conversation("earlier", now - 4 * 24 * 60 * 60 * 1000),
    ], now);

    expect(groups.map((group) => group.label)).toEqual(["Today", "Yesterday", "Earlier"]);
  });

  it("creates a compact first-message title", () => {
    const title = titleFromPrompt("  Explain   WebGPU memory pressure and local model caching in detail  ");
    expect(title).toBe("Explain WebGPU memory pressure and local model…");
  });

  it("reads percentage and fraction progress reports", () => {
    expect(parseModelProgress("Downloading params 68%")) .toBe(68);
    expect(parseModelProgress("Loading [3/4]")) .toBe(75);
    expect(parseModelProgress("Preparing model")) .toBeNull();
  });
});
