import React from 'react';

import Image from 'next/image';

import { Message } from '@/types/chat';

import { useChatStore } from '@/store/chat';

export function ChatConversation(props: {
  content: string;
  type: Message['type'];
  timeText: string;
}) {
  return (
    <div
      className={`chat ${props.type === 'user' ? 'chat-end' : 'chat-start'}`}
    >
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <Image
            src={props.type === 'assistant' ? '/vicuna.jpeg' : '/user.jpg'}
            alt=""
            width={40}
            height={40}
          />
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
      <div className="w-full px-4 flex justify-between items-center py-2">
        <div className="transition-all duration-200">
          <div className="my-1 text-xl font-bold overflow-hidden text-ellipsis whitespace-nowrap block max-w-[50vw]">
            {chatStore.curConversation()?.title ?? ''}
          </div>
          <div className="text-base-content text-xs opacity-40 font-bold">
            {chatStore.curConversation()?.messages?.length ?? 0} messages with
            Vicuna
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() =>
              chatStore.updateCurConversation((conversation) => {
                conversation.title = 'haha';
              })
            }
            className="btn btn-ghost btn-xs"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
          </button>
          <button
            onClick={() => chatStore.delConversation(curConversationIndex)}
            className="btn btn-ghost btn-xs"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
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
