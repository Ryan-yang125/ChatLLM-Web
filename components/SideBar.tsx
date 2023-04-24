import React from 'react';

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
          <div>{props.title}</div>
          <div className="flex justify-between h-full">
            <div>{props.messageCount}</div>
            <div>{props.timeText}</div>
          </div>
        </div>
      </a>
    </li>
  );
};
const Sidebar = () => {
  const mockChatItems = new Array(8).fill(-1).map((t, index) => ({
    title: 'New Conversation',
    index,
    messageCount: 21,
    isActive: index === 2,
    timeText: '2021-02-12 21:30',
  }));
  return (
    <>
      <nav className="fixed top-0 left-0 w-full h-full space-y-8 sm:w-80">
        <div className="flex flex-col h-full">
          <div className="flex-1 flex flex-col h-full overflow-auto p-4">
            <ul className="menu bg-base-100 w-56 p-2 rounded-box">
              {mockChatItems.map((item, i) => (
                <ChatItem
                  index={i}
                  title={item.title}
                  messageCount={item.messageCount}
                  isActive={item.isActive}
                  timeText={item.timeText}
                />
              ))}
            </ul>
          </div>
          <div>
            <ul className="menu menu-horizontal bg-base-100 rounded-box">
              <li>
                <a>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </a>
              </li>
              <li>
                <a>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </a>
              </li>
              <li>
                <a>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
};

export { Sidebar };
