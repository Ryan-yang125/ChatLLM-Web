import React from 'react';

import Image from 'next/image';

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
          <Image src="aiBot.jpg" alt="" />
        </div>
      </div>
      <div className="chat-header">
        <time className="text-xs opacity-50 mx-2">{props.timeText}</time>
      </div>
      <div className="chat-bubble">{props.content}</div>
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
        <div className="flex justify-between">
          <button
            onClick={() => chatStore.delConversation(curConversationIndex)}
            className="btn btn-outline btn-xs mx-4"
          >
            Delete
          </button>
          <button
            onClick={() =>
              chatStore.updateCurConversation((conversation) => {
                conversation.title = 'haha';
              })
            }
            className="btn btn-outline btn-xs"
          >
            Rename
          </button>
        </div>
      </div>
      <div className="h-full overflow-scroll border-b-slate-100 py-4">
        {chatStore.curConversation()?.messages.map((item) => (
          <ChatConversation
            key={item.id}
            content={item.content}
            type={item.type}
            timeText={item.createTime}
          />
        ))}
      </div>
    </>
  );
}
