import React from 'react';

import { useChatStore } from '@/store/chat';

export function ChatConversation(props: {
  content: string;
  type: string;
  timeText: string;
}) {
  return (
    <div
      className={`chat ${props.type === 'user' ? 'chat-end' : 'chat-start'}`}
    >
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img src="aiBot.jpg" />
        </div>
      </div>
      <div className="chat-header">
        {props.type === 'user' ? 'Me' : 'AI asssitant'}
        <time className="text-xs opacity-50">{props.timeText}</time>
      </div>
      <div className="chat-bubble">{props.content}</div>
      <div className="chat-footer opacity-50">Delivered</div>
    </div>
  );
}
export function ChatBox() {
  const [curConversationIndex] = useChatStore((state) => [
    state.curConversationIndex,
  ]);
  const chatStore = useChatStore();

  return (
    <>
      <div className="w-full px-4 flex justify-between">
        <div>
          <div>{chatStore.curConversation()?.title ?? ''}</div>
          <div>
            与 Vulcuna的{chatStore.curConversation()?.messages?.length ?? 0}
            条对话
          </div>
        </div>
        <div className="flex">
          <button
            onClick={() => chatStore.initLLMModel()}
            className="btn btn-outline btn-xs mx-4"
          >
            Init
          </button>
          <button
            onClick={() => chatStore.delConversation(curConversationIndex)}
            className="btn btn-outline btn-xs"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="h-full overflow-scroll border-b-slate-100 py-4">
        {chatStore.curConversation()?.messages.map((item) => (
          <ChatConversation
            content={item.content}
            type={item.type}
            timeText={item.createTime}
          />
        ))}
      </div>
    </>
  );
}
