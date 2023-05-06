import React, { useEffect } from 'react';

import { ChatBox } from '@/components/ChatBox';
import { ChatInput } from '@/components/ChatInput';
import { InitModal, InstructionModal } from '@/components/InitModal';
import { Sidebar } from '@/components/SideBar';

import { useChatStore } from '@/store/chat';

const Home = () => {
  const [setWorkerConversationHistroy] = useChatStore((state) => [
    state.setWorkerConversationHistroy,
  ]);
  useEffect(() => {
    setWorkerConversationHistroy();
  }, []);
  return (
    <>
      <div className="bg-base-100 drawer drawer-mobile">
        <input id="my-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content p-4">
          {/* <label htmlFor="my-drawer" className="btn btn-primary drawer-button">Open drawer</label> */}
          <div className="h-[80%]">
            <ChatBox />
          </div>
          <div className="h-[20%]">
            <ChatInput />
          </div>
        </div>
        <div className="drawer-side">
          <label htmlFor="my-drawer" className="drawer-overlay"></label>
          <aside className="bg-base-200 w-70 h-full">
            <Sidebar />
            <div className="from-base-200 pointer-events-none sticky bottom-0 flex h-20 bg-gradient-to-t to-transparent" />
          </aside>
        </div>
      </div>
      <InitModal />
      <InstructionModal />
    </>
  );
};

export default Home;
