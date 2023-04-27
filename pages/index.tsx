import React, { useState } from 'react';

import { WebLLM } from '@/hooks/web-llm';

import { ChatBox } from '@/components/ChatBox';
import { ChatInput } from '@/components/ChatInput';
import { Sidebar } from '@/components/SideBar';

const Home = () => {
  const [inputValue, setInputValue] = useState('');
  const [outputValue, setOutputValue] = useState('');
  const [LLM, setLLM] = useState(new WebLLM());
  const handleClick = async () => {
    console.log('startInit');
    try {
      await LLM.init();
    } catch (error) {
      console.error(error);
    }
  };
  const handleInput = () => {
    // 在这里执行输入框的逻辑
    console.log(inputValue);
    try {
      LLM.chat(inputValue, [], []).then((gM) => {
        if (gM) {
          console.log(gM);
          setOutputValue(gM);
        }
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (event: any) => {
    setInputValue(event.target.value);
  };
  return (
    <div className="bg-base-100 drawer drawer-mobile">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content p-8">
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
        <aside className="bg-base-200 w-80">
          <Sidebar />
          <div className="from-base-200 pointer-events-none sticky bottom-0 flex h-20 bg-gradient-to-t to-transparent" />
        </aside>
      </div>
    </div>
  );
};

export default Home;
