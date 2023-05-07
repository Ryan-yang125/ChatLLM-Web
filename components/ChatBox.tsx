import React, { useLayoutEffect, useRef, useState } from 'react';

import dynamic from 'next/dynamic';
import Image from 'next/image';

import { Loading } from '@/pages';
import { useChatStore } from '@/store/chat';

const Markdown = dynamic(async () => (await import('./markdown')).Markdown, {
  loading: () => <Loading />,
});

function useScrollToBottom() {
  // for auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollToBottom = () => {
    const dom = scrollRef.current;
    if (dom) {
      setTimeout(() => (dom.scrollTop = dom.scrollHeight), 1);
    }
  };

  // auto scroll
  useLayoutEffect(() => {
    autoScroll && scrollToBottom();
  });

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollToBottom,
  };
}

export function ChatBox() {
  const [userInput, setUserInput] = useState('');

  const [curConversationIndex] = useChatStore((state) => [
    state.curConversationIndex,
  ]);
  const chatStore = useChatStore();
  const onInput = (text: string) => {
    setUserInput(text);
  };
  const { scrollRef, setAutoScroll, scrollToBottom } = useScrollToBottom();

  const submitUserInput = async () => {
    if (userInput.length <= 0) return;
    chatStore.onUserInputContent(userInput);
    setUserInput('');
    setAutoScroll(true);
    scrollToBottom();
  };
  return (
    <>
      <div className="top-0 p-2 flex flex-col relative max-h-[100vh] h-[100vh]">
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
              onClick={() => {
                const conversationName = window.prompt('Enter name: ');
                if (!conversationName) {
                  return;
                }
                chatStore.updateCurConversation((conversation) => {
                  conversation.title = conversationName;
                });
              }}
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
          {chatStore.curConversation()?.messages.map((item, i) => (
            <div
              key={i}
              className={`chat ${
                item.type === 'user' ? 'chat-end' : 'chat-start'
              }`}
            >
              <div className="chat-image avatar">
                <div className="w-10 rounded-full">
                  <Image
                    src={
                      item.type === 'assistant' ? '/vicuna.jpeg' : '/user.jpg'
                    }
                    alt=""
                    width={40}
                    height={40}
                  />
                </div>
              </div>
              <div className="chat-header">
                <time className="text-xs opacity-50 mx-2">
                  {item.createTime}
                </time>
              </div>
              <div className="chat-bubble">
                <Markdown
                  message={item}
                  parentRef={scrollRef}
                  fontSize={14}
                  defaultShow={true}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="relative bottom-0 p-4">
          <div className="bg-base-100 flex items-center justify-center h-full z-30">
            <textarea
              className="textarea textarea-primary textarea-bordered textarea-sm w-[50%]"
              placeholder="Ask me anything"
              value={userInput}
              onInput={(e) => onInput(e.currentTarget.value)}
              onFocus={() => setAutoScroll(true)}
              onBlur={() => setAutoScroll(false)}
            ></textarea>
            <button
              onClick={submitUserInput}
              className="btn btn-ghost btn-xs relative right-12 top-2"
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
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
