export type Message = {
  content: string;
  type: 'assistant' | 'system' | 'user';
  createTime: string;
  id: number;
  isStreaming?: boolean;
  isError?: boolean;
  isInit?: boolean;
};

export type ChatConversation = {
  id: number;
  messages: Message[];
  createTime: string;
  updateTime: string;
  title: string;
};

export type UpdateBotMsg = (msg: Partial<Message>) => void;
