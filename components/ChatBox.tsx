import React from 'react';

export function ChatConversation(props: { content: string; role: string }) {
  return (
    <div
      className={`chat ${props.role === 'user' ? 'chat-start' : 'chat-end'}`}
    >
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img src="aiBot.jpg" />
        </div>
      </div>
      <div className="chat-header">
        Obi-Wan Kenobi
        <time className="text-xs opacity-50">12:45</time>
      </div>
      <div className="chat-bubble">You were the Chosen One!</div>
      <div className="chat-footer opacity-50">Delivered</div>
    </div>
  );
}
export function ChatBox() {
  const mockC = new Array(22).fill(1).map((_item, i) => ({
    content: 'I love you!I love you!I love you!I love you!',
    role: i % 2 ? 'assitant' : 'user',
  }));
  return (
    <div className="h-full overflow-scroll border-b py-4">
      {mockC.map((item) => (
        <ChatConversation content={item.content} role={item.role} />
      ))}
    </div>
  );
}
