import React, { useLayoutEffect, useRef, useState } from 'react';

import dynamic from 'next/dynamic';
import Image from 'next/image';

import { IconDelete, IconRename, IconSend } from './Icons';

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

const shouldSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key !== 'Enter') return false;
  if (e.key === 'Enter' && e.nativeEvent.isComposing) return false;
  return e.ctrlKey;
};
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
    scrollToBottom();
    setAutoScroll(true);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (shouldSubmit(e)) {
      submitUserInput();
    }
  };

  return (
    <>
      <div className="top-0 p-2 flex flex-col relative max-h-[100vh] h-[100vh]">
        <div className="w-full px-4 flex justify-between items-center py-2 border-b border-solid border-black border-opacity-10">
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
              <IconRename />
            </button>
            <button
              onClick={() => chatStore.delConversation(curConversationIndex)}
              className="btn btn-ghost btn-xs"
            >
              <IconDelete />
            </button>
          </div>
        </div>
        <div
          className="h-full overflow-auto  py-4 border-b border-solid border-black border-opacity-10"
          ref={scrollRef}
        >
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
                  {item.updateTime}
                </time>
              </div>
              <div className="chat-bubble">
                {item.isLoading ? (
                  <Loading />
                ) : item.type === 'assistant' ? (
                  <Markdown message={item} fontSize={14} defaultShow={true} />
                ) : (
                  <div>{item.content}</div>
                )}
              </div>
              <div className="chat-footer opacity-50">{item.statsText}</div>
            </div>
          ))}
        </div>
        <div className="relative bottom-0 p-4">
          <div className="bg-base-100 flex items-center justify-center h-full z-30">
            <textarea
              className="textarea textarea-primary textarea-bordered textarea-sm w-[50%]"
              placeholder="Ctrl + Enter to Send. Ask me anything"
              value={userInput}
              onInput={(e) => onInput(e.currentTarget.value)}
              onFocus={() => setAutoScroll(true)}
              onBlur={() => setAutoScroll(false)}
              onKeyDown={onInputKeyDown}
            ></textarea>
            <button
              onClick={submitUserInput}
              className="btn btn-ghost btn-xs relative right-12 top-2"
            >
              <IconSend />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
