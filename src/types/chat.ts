export type MessageRole = "assistant" | "user";

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  updatedAt: number;
  isStreaming?: boolean;
  isError?: boolean;
  stats?: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

export type ModelPhase = "idle" | "loading" | "ready" | "error";
