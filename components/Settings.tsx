import React from 'react';

import { useChatStore } from '@/store/chat';

export function Settings() {
  const chatStore = useChatStore();
  return (
    <div className="flex w-full items-center justify-between">
      <button
        onClick={chatStore.newConversation}
        className="btn btn-outline btn-xs"
      >
        Add
      </button>
    </div>
  );
}
