import React from 'react';

export function ChatInput() {
  return (
    <div className="bg-base-100 flex items-center justify-center h-full">
      <textarea
        className="textarea textarea-primary textarea-bordered textarea-sm w-[50%]"
        placeholder="Ask me"
      ></textarea>
    </div>
  );
}
