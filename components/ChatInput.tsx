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
        placeholder="Ask me"
        value={userInput}
        onInput={(e) => onInput(e.currentTarget.value)}
      ></textarea>
      <button onClick={submitUserInput} className="btn btn-outline btn-xs">
        send
      </button>
    </div>
  );
}
