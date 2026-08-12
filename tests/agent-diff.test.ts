import { describe, expect, it } from "vitest";
import { diffLines } from "../src/features/agent/diff";

describe("artifact line diff", () => {
  it("marks additions and removals around stable lines", () => {
    expect(diffLines("alpha\nbeta\ngamma", "alpha\ndelta\ngamma")).toEqual([
      { type: "same", before: "alpha", after: "alpha" },
      { type: "add", after: "delta" },
      { type: "remove", before: "beta" },
      { type: "same", before: "gamma", after: "gamma" },
    ]);
  });

  it("handles a new empty-based artifact", () => {
    expect(diffLines("", "first\nsecond")).toEqual([
      { type: "add", after: "first" },
      { type: "add", after: "second" },
    ]);
  });

  it("uses a bounded full diff for large artifacts", () => {
    const before = ["top", ...Array.from({ length: 220 }, (_, index) => `old-${index}`), "bottom"].join("\n");
    const after = ["top", ...Array.from({ length: 220 }, (_, index) => `new-${index}`), "bottom"].join("\n");
    const rows = diffLines(before, after);
    expect(rows).toHaveLength(442);
    expect(rows[0]).toEqual({ type: "same", before: "top", after: "top" });
    expect(rows.at(-1)).toEqual({ type: "same", before: "bottom", after: "bottom" });
    expect(rows.filter((row) => row.type === "remove")).toHaveLength(220);
    expect(rows.filter((row) => row.type === "add")).toHaveLength(220);
  });
});
