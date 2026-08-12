import type { ChatCompletionTool } from "@mlc-ai/web-llm";
import type { Artifact, ArtifactKind, ArtifactProposal, LocalAttachment } from "@/types/chat";

const MAX_TOOL_OUTPUT = 8_000;
const MAX_ARTIFACT_CONTENT = 64 * 1024;
const MAX_ARTIFACT_LINES = 2_000;

export const AGENT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_context_files",
      description: "List the local files selected for this agent run.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "read_context_file",
      description: "Read the complete text of one selected local file by exact name.",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Exact file name from list_context_files." } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_context",
      description: "Search selected local files for text and return matching lines.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Evaluate arithmetic containing numbers, parentheses, +, -, *, /, and %.",
      parameters: {
        type: "object",
        properties: { expression: { type: "string" } },
        required: ["expression"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_artifacts",
      description: "List artifacts already saved in this conversation.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "read_artifact",
      description: "Read a saved artifact by ID or exact title.",
      parameters: {
        type: "object",
        properties: { artifact: { type: "string", description: "Artifact ID or exact title." } },
        required: ["artifact"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_artifact",
      description: "Propose a new local artifact. The user must approve it before it is saved.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          kind: { type: "string", enum: ["markdown", "code", "json", "text"] },
          content: { type: "string" },
        },
        required: ["title", "kind", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_artifact",
      description: "Propose replacing a saved artifact. The user must approve the diff before it is saved.",
      parameters: {
        type: "object",
        properties: {
          artifact: { type: "string", description: "Artifact ID or exact title." },
          content: { type: "string" },
        },
        required: ["artifact", "content"],
        additionalProperties: false,
      },
    },
  },
];

export const AGENT_SYSTEM_PROMPT = `You are a private local agent running inside the user's browser.
Use tools when they make the task more reliable. Only selected context files and saved artifacts are available.
Read tools run locally. Artifact creation and updates require user approval.
Keep plans short, use no more than eight tool calls, and finish with a concise Markdown result.`;

type ToolContext = {
  conversationId: string;
  attachments: LocalAttachment[];
  artifacts: Artifact[];
  createId: () => string;
  now: () => number;
};

export type ToolExecution = {
  output?: string;
  proposal?: ArtifactProposal;
};

function stringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} is required.`);
  return value.trim();
}

function contentArg(args: Record<string, unknown>) {
  const value = args.content;
  if (typeof value !== "string" || !value.trim()) throw new Error("content is required.");
  if (value.split("\n").length > MAX_ARTIFACT_LINES) throw new Error("Artifact content exceeds 2,000 lines.");
  return value;
}

function truncate(value: string) {
  return value.length > MAX_TOOL_OUTPUT ? `${value.slice(0, MAX_TOOL_OUTPUT)}\n…output truncated` : value;
}

function findArtifact(artifacts: Artifact[], query: string) {
  return artifacts.find((artifact) => artifact.id === query || artifact.title.toLowerCase() === query.toLowerCase());
}

class ArithmeticParser {
  private position = 0;
  constructor(private readonly source: string) {}

  parse() {
    const value = this.expression();
    this.space();
    if (this.position !== this.source.length || !Number.isFinite(value)) throw new Error("Invalid arithmetic expression.");
    return value;
  }

  private expression() {
    let value = this.term();
    while (true) {
      this.space();
      if (this.consume("+")) value += this.term();
      else if (this.consume("-")) value -= this.term();
      else return value;
    }
  }

  private term() {
    let value = this.factor();
    while (true) {
      this.space();
      if (this.consume("*")) value *= this.factor();
      else if (this.consume("/")) value /= this.factor();
      else if (this.consume("%")) value %= this.factor();
      else return value;
    }
  }

  private factor(): number {
    this.space();
    if (this.consume("+")) return this.factor();
    if (this.consume("-")) return -this.factor();
    if (this.consume("(")) {
      const value = this.expression();
      this.space();
      if (!this.consume(")")) throw new Error("Missing closing parenthesis.");
      return value;
    }
    const start = this.position;
    while (/[0-9.]/.test(this.source[this.position] ?? "")) this.position += 1;
    const token = this.source.slice(start, this.position);
    if (!token || !/^\d*\.?\d+$/.test(token)) throw new Error("Expected a number.");
    return Number(token);
  }

  private consume(value: string) {
    if (this.source[this.position] !== value) return false;
    this.position += 1;
    return true;
  }

  private space() {
    while (/\s/.test(this.source[this.position] ?? "")) this.position += 1;
  }
}

export function parseToolArguments(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Tool arguments must be a JSON object.");
  return parsed as Record<string, unknown>;
}

export function executeAgentTool(name: string, args: Record<string, unknown>, context: ToolContext): ToolExecution {
  if (name === "list_context_files") {
    return { output: JSON.stringify(context.attachments.map(({ name: fileName, size, mimeType }) => ({ name: fileName, size, mimeType }))) };
  }
  if (name === "read_context_file") {
    const fileName = stringArg(args, "name");
    const file = context.attachments.find((item) => item.name === fileName);
    if (!file) throw new Error(`Context file not found: ${fileName}`);
    return { output: truncate(file.text) };
  }
  if (name === "search_context") {
    const query = stringArg(args, "query").toLowerCase();
    const matches = context.attachments.flatMap((file) => file.text.split("\n").flatMap((line, index) =>
      line.toLowerCase().includes(query) ? [{ file: file.name, line: index + 1, text: line.trim().slice(0, 240) }] : [],
    )).slice(0, 24);
    return { output: JSON.stringify(matches) };
  }
  if (name === "calculate") {
    const expression = stringArg(args, "expression");
    return { output: String(new ArithmeticParser(expression).parse()) };
  }
  if (name === "list_artifacts") {
    return { output: JSON.stringify(context.artifacts.map(({ id, title, kind, updatedAt }) => ({ id, title, kind, updatedAt }))) };
  }
  if (name === "read_artifact") {
    const query = stringArg(args, "artifact");
    const artifact = findArtifact(context.artifacts, query);
    if (!artifact) throw new Error(`Artifact not found: ${query}`);
    return { output: truncate(artifact.content) };
  }
  if (name === "create_artifact") {
    const title = stringArg(args, "title").slice(0, 80);
    const kind = stringArg(args, "kind") as ArtifactKind;
    const content = contentArg(args);
    if (!["markdown", "code", "json", "text"].includes(kind)) throw new Error("Unsupported artifact kind.");
    if (content.length > MAX_ARTIFACT_CONTENT) throw new Error("Artifact content exceeds 64 KB.");
    if (context.artifacts.some((artifact) => artifact.title.toLowerCase() === title.toLowerCase())) throw new Error("Artifact title already exists.");
    const now = context.now();
    return {
      proposal: {
        operation: "create",
        previousContent: "",
        artifact: { id: context.createId(), conversationId: context.conversationId, title, kind, content, createdAt: now, updatedAt: now },
      },
    };
  }
  if (name === "update_artifact") {
    const query = stringArg(args, "artifact");
    const content = contentArg(args);
    if (content.length > MAX_ARTIFACT_CONTENT) throw new Error("Artifact content exceeds 64 KB.");
    const artifact = findArtifact(context.artifacts, query);
    if (!artifact) throw new Error(`Artifact not found: ${query}`);
    return {
      proposal: {
        operation: "update",
        previousContent: artifact.content,
        artifact: { ...artifact, content, updatedAt: context.now() },
      },
    };
  }
  throw new Error(`Unknown tool: ${name}`);
}

export function commitArtifactProposal(proposal: ArtifactProposal) {
  return {
    artifact: proposal.artifact,
    output: JSON.stringify({ status: "saved", id: proposal.artifact.id, title: proposal.artifact.title, kind: proposal.artifact.kind }),
  };
}
