import React from 'react';

import Link from 'next/link';

import { Settings } from './Settings';

import { useChatStore } from '@/store/chat';

export const ChatItem = (props: {
  onClick?: () => void;
  title: string;
  timeText: string;
  index: number;
  messageCount: number;
  isActive: boolean;
}) => {
  return (
    <li key={props.index} onClick={props.onClick} className="my-2">
      <a className={props.isActive ? 'active' : ''}>
        <div className="flex flex-col h-full w-full">
          <div className="">{props.title}</div>
          <div className="flex justify-between h-full menu-title">
            <div>Messages: {props.messageCount}</div>
            <div>{props.timeText}</div>
          </div>
        </div>
      </a>
    </li>
  );
};
const Sidebar = () => {
  const [conversations, curConversationIndex] = useChatStore((state) => [
    state.conversations,
    state.curConversationIndex,
  ]);
  const chatStore = useChatStore();
  return (
    <div className="top-0 p-2 flex flex-col relative max-h-[100vh] h-[100vh]">
      <div className="bg-base-200 bg-opacity-90 backdrop-blur sticky top-0 items-center gap-2 px-4 py-2">
        <Link
          href="https://github.com/Ryan-yang125/ChatLLM-Web"
          aria-current="page"
          target="_blank"
          aria-label="GithubPage"
          className="flex-0 btn btn-ghost px-2"
        >
          <div className="font-title transition-all duration-200 md:text-2xl">
            <div className="my-1 text-xl font-bold">ChatLLM-Web</div>
          </div>
        </Link>
        <div className="text-base-content text-xs opacity-40 font-bold px-2">
          AI assitant running in browser.
        </div>
      </div>
      <div className="overflow-auto flex-1 overflow-x-hidden">
        <ul className="menu menu-compact menu-vertical flex flex-col p-0 px-4">
          {conversations.map((item, i) => (
            <ChatItem
              key={item.id}
              index={i}
              title={item.title}
              messageCount={item.messages.length}
              isActive={i === curConversationIndex}
              timeText={item.updateTime}
              onClick={() => chatStore.chooseConversation(i)}
            />
          ))}
        </ul>
        <div className="from-base-200 pointer-events-none sticky bottom-0 flex h-20 bg-gradient-to-t to-transparent" />
      </div>
      <Settings />
    </div>
  );
};

export { Sidebar };
