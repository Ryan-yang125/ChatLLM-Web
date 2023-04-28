import React from 'react';

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
    <>
      <div className="z-20 bg-base-200 bg-opacity-90 backdrop-blur sticky top-0 items-center gap-2 px-4 py-2">
        <a
          href="/"
          aria-current="page"
          aria-label="Homepage"
          className="flex-0 btn btn-ghost px-2"
        >
          <div className="font-title text-primary inline-flex text-lg transition-all duration-200 md:text-3xl">
            <span className="uppercase">Chat-LLM</span>
            <span className="text-base-content uppercase">-Web</span>
          </div>
        </a>
        <div data-tip="theme" className="tooltip tooltip-bottom">
          <div>
            <label className="swap swap-rotate">
              <input type="checkbox" />
              <svg
                className="swap-on fill-current w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
              </svg>
              <svg
                className="swap-off fill-current w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
              </svg>
            </label>
          </div>
        </div>
      </div>
      <div className="h-[80%] max-h-[81%] overflow-scroll">
        <ul className="menu menu-compact menu-vertical flex flex-col p-0 px-4">
          {conversations.map((item, i) => (
            <ChatItem
              index={i}
              title={item.title}
              messageCount={item.messages.length}
              isActive={i === curConversationIndex}
              timeText={item.updateTime}
              onClick={() => chatStore.chooseConversation(i)}
            />
          ))}
        </ul>
      </div>
      <div className="p-0 px-4 mt-8">
        <Settings />
      </div>
    </>
  );
};

export { Sidebar };
