import type { LocalAttachment } from "@/types/chat";

export const MAX_FILE_BYTES = 64 * 1024;
export const MAX_FILES_PER_REQUEST = 4;
export const MAX_ATTACHMENT_TOKENS = 2048;

const allowedExtensions = new Set([
  "txt", "md", "markdown", "json", "js", "jsx", "ts", "tsx", "py", "go", "rs", "java",
  "css", "html", "htm", "yaml", "yml", "toml", "sql", "sh", "bash", "zsh",
]);

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function validateAttachmentSelection(attachments: LocalAttachment[]) {
  if (attachments.length > MAX_FILES_PER_REQUEST) {
    return `Choose up to ${MAX_FILES_PER_REQUEST} files.`;
  }
  const tokens = attachments.reduce((total, attachment) => total + attachment.estimatedTokens, 0);
  if (tokens > MAX_ATTACHMENT_TOKENS) {
    return `File context is about ${tokens.toLocaleString()} tokens. Keep it under ${MAX_ATTACHMENT_TOKENS.toLocaleString()}.`;
  }
  return null;
}

export async function readLocalFiles(files: File[], conversationId: string): Promise<LocalAttachment[]> {
  if (files.length > MAX_FILES_PER_REQUEST) throw new Error(`Choose up to ${MAX_FILES_PER_REQUEST} files.`);
  const results: LocalAttachment[] = [];

  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedExtensions.has(extension) && !file.type.startsWith("text/")) {
      throw new Error(`${file.name} is not a supported text or code file.`);
    }
    if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 64 KB.`);
    let text = await file.text();
    if (extension === "json") {
      try {
        text = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        throw new Error(`${file.name} contains invalid JSON.`);
      }
    }
    results.push({
      id: crypto.randomUUID(),
      conversationId,
      name: file.name,
      mimeType: file.type || "text/plain",
      size: file.size,
      text,
      estimatedTokens: estimateTokens(text),
      createdAt: Date.now(),
    });
  }

  const validation = validateAttachmentSelection(results);
  if (validation) throw new Error(validation);
  return results;
}

export function contextBlock(attachments: LocalAttachment[]) {
  if (!attachments.length) return "";
  return attachments
    .map((attachment) => `<context file="${attachment.name}">\n${attachment.text}\n</context>`)
    .join("\n\n");
}

export const PROMPT_PRESETS = {
  summarize: "Summarize the following clearly, preserving key facts and decisions.",
  explain: "Explain this step by step in clear language.",
  rewrite: "Rewrite this for clarity, structure, and concision.",
  code: "Help with this code. Check correctness, clarity, and performance.",
} as const;

export type PromptPreset = keyof typeof PROMPT_PRESETS;
