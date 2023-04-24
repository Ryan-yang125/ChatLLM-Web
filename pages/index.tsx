import React, { useState } from 'react';

import { WebLLM } from '@/hooks/web-llm';

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
    <div className="flex w-full h-[1296px]">
      <div className="w-[20%]">
        <Sidebar />
      </div>
      <div className="divider divider-horizontal"></div>
      <div className="w-[80%]">
        <div>
          <button className="btn btn-secondary" onClick={handleClick}>
            Init
          </button>
          <div className="flex items-center my-4">
            Input:
            <input
              className="input input-bordered input-primary w-full max-w-xs"
              type="text"
              value={inputValue}
              onChange={handleChange}
            />
            <button className="btn btn-secondary" onClick={handleInput}>
              Send
            </button>
          </div>
          <div className="flex items-center my-4">
            <div>Output:</div>
            <input
              className="input input-bordered input-primary w-full max-w-xs"
              type="text"
              value={outputValue}
              readOnly
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
