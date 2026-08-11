import { openDB, type DBSchema } from "idb";
import type {
  Conversation,
  CustomModelManifest,
  LocalAttachment,
  Message,
  Preferences,
} from "@/types/chat";

interface ChatLLMDB extends DBSchema {
  conversations: { key: string; value: Omit<Conversation, "messages"> };
  messages: { key: string; value: Message & { conversationId: string }; indexes: { conversationId: string } };
  attachments: { key: string; value: LocalAttachment; indexes: { conversationId: string } };
  preferences: { key: string; value: Preferences & { id: "primary" } };
  customModels: { key: string; value: CustomModelManifest };
}

export type PersistedSnapshot = {
  conversations: Conversation[];
  attachments: LocalAttachment[];
  preferences: Preferences;
  customModels: CustomModelManifest[];
  activeConversationId: string;
};

const dbPromise = openDB<ChatLLMDB>("chatllm-v3", 1, {
  upgrade(db) {
    db.createObjectStore("conversations", { keyPath: "id" });
    const messages = db.createObjectStore("messages", { keyPath: "id" });
    messages.createIndex("conversationId", "conversationId");
    const attachments = db.createObjectStore("attachments", { keyPath: "id" });
    attachments.createIndex("conversationId", "conversationId");
    db.createObjectStore("preferences", { keyPath: "id" });
    db.createObjectStore("customModels", { keyPath: "record.model_id" });
  },
});

export async function loadSnapshot(): Promise<Partial<PersistedSnapshot>> {
  const db = await dbPromise;
  const [conversationRows, messageRows, attachments, preference, customModels] = await Promise.all([
    db.getAll("conversations"),
    db.getAll("messages"),
    db.getAll("attachments"),
    db.get("preferences", "primary"),
    db.getAll("customModels"),
  ]);
  const messagesByConversation = new Map<string, Message[]>();
  for (const { conversationId, ...message } of messageRows) {
    const list = messagesByConversation.get(conversationId) ?? [];
    list.push(message);
    messagesByConversation.set(conversationId, list);
  }
  const conversations = conversationRows
    .map((conversation) => ({
      ...conversation,
      messages: (messagesByConversation.get(conversation.id) ?? []).sort((a, b) => a.createdAt - b.createdAt),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return {
    conversations,
    attachments,
    customModels,
    preferences: preference
      ? { language: preference.language, theme: preference.theme }
      : undefined,
  };
}

export async function saveSnapshot(snapshot: PersistedSnapshot) {
  const db = await dbPromise;
  const transaction = db.transaction(
    ["conversations", "messages", "attachments", "preferences", "customModels"],
    "readwrite",
  );
  await Promise.all([
    transaction.objectStore("conversations").clear(),
    transaction.objectStore("messages").clear(),
    transaction.objectStore("attachments").clear(),
    transaction.objectStore("customModels").clear(),
  ]);
  for (const { messages, ...conversation } of snapshot.conversations) {
    await transaction.objectStore("conversations").put(conversation);
    for (const message of messages) {
      await transaction.objectStore("messages").put({ ...message, conversationId: conversation.id });
    }
  }
  for (const attachment of snapshot.attachments) {
    await transaction.objectStore("attachments").put(attachment);
  }
  for (const model of snapshot.customModels) {
    await transaction.objectStore("customModels").put(model);
  }
  await transaction.objectStore("preferences").put({ id: "primary", ...snapshot.preferences });
  await transaction.done;
  try {
    localStorage.setItem("chatllm-active:v3", snapshot.activeConversationId);
  } catch {
    // IndexedDB remains the source of truth when localStorage is unavailable.
  }
}

export function loadActiveConversationId() {
  try {
    return localStorage.getItem("chatllm-active:v3");
  } catch {
    return null;
  }
}
