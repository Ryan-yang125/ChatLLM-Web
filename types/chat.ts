export type Message = {
  content: string;
  type: 'assistant' | 'system' | 'user';
  createTime: string;
  id: number;
};

export type ChatConversation = {
  id: number;
  messages: Message[];
  createTime: string;
  updateTime: string;
};
