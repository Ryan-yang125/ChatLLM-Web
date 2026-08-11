import type { Conversation } from "@/types/chat";

export type ConversationGroup = {
  label: "Today" | "Yesterday" | "Earlier";
  conversations: Conversation[];
};

export function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function groupConversations(conversations: Conversation[], now = Date.now()): ConversationGroup[] {
  const today = startOfDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;
  const groups: ConversationGroup[] = [
    { label: "Today", conversations: [] },
    { label: "Yesterday", conversations: [] },
    { label: "Earlier", conversations: [] },
  ];

  for (const conversation of conversations) {
    if (conversation.updatedAt >= today) groups[0].conversations.push(conversation);
    else if (conversation.updatedAt >= yesterday) groups[1].conversations.push(conversation);
    else groups[2].conversations.push(conversation);
  }

  return groups.filter((group) => group.conversations.length > 0);
}

export function timeLabel(timestamp: number, now = Date.now()) {
  const date = new Date(timestamp);
  if (startOfDay(timestamp) === startOfDay(now)) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function titleFromPrompt(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim();
  return compact.length > 48 ? `${compact.slice(0, 47).trimEnd()}…` : compact;
}

export function parseModelProgress(message: string) {
  const percent = message.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percent) return Math.min(100, Math.max(0, Number(percent[1])));

  const fraction = message.match(/\[(\d+)\s*\/\s*(\d+)\]/);
  if (fraction) {
    const current = Number(fraction[1]);
    const total = Number(fraction[2]);
    if (total > 0) return Math.round((current / total) * 100);
  }
  return null;
}
