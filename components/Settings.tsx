import React from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { IconAdd, IconInfo, IconSetting } from './Icons';

import { useChatStore } from '@/store/chat';

export function Settings() {
  const chatStore = useChatStore();
  return (
    <div className="flex items-center justify-between py-5 relative bottom-0 px-4">
      <div className="flex">
        <button
          onClick={() => chatStore.toggleInstuctionModal(true)}
          className="btn btn-ghost btn-xs"
        >
          <IconInfo />
        </button>
        <div className="tooltip" data-tip="in developing...">
          <button className="btn btn-ghost btn-xs">
            <IconSetting />
          </button>
        </div>
        <Link
          href="https://github.com/Ryan-yang125/ChatLLM-Web"
          target="_blank"
          className="btn btn-ghost btn-xs"
        >
          <Image src="github-mark-white.svg" alt="" width={24} height={24} />
        </Link>
      </div>
      <button
        onClick={chatStore.newConversation}
        className="btn btn-ghost btn-xs"
      >
        <IconAdd />
      </button>
    </div>
  );
}
