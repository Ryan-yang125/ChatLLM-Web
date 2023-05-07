import React, { useState } from 'react';

import { useChatStore } from '@/store/chat';

export function ChatInput() {
  const [userInput, setUserInput] = useState('');
  const chatStore = useChatStore();

  const onInput = (text: string) => {
    setUserInput(text);
  };

  const submitUserInput = async () => {
    if (userInput.length <= 0) return;
    chatStore.onUserInputContent(userInput);
    setUserInput('');
  };

  return (
    <div className="bg-base-100 flex items-center justify-center h-full">
      <textarea
        className="textarea textarea-primary textarea-bordered textarea-sm w-[50%]"
        placeholder="Ask me anything"
        value={userInput}
        onInput={(e) => onInput(e.currentTarget.value)}
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
  );
}
