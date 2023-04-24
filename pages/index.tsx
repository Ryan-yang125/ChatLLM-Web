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
    <>
      <Sidebar />
      <div className="w-[100%] h-[800px] flex flex-col justify-center items-center">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleClick}
        >
          Init
        </button>
        <div className="flex items-center my-4">
          Input:
          <input
            className="border border-gray-400 py-2 px-4 rounded-l mx-4"
            type="text"
            value={inputValue}
            onChange={handleChange}
          />
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r"
            onClick={handleInput}
          >
            Send
          </button>
        </div>
        <div className="flex items-center my-4">
          <div>Output:</div>

          <input
            className="border border-gray-400 py-2 px-4 rounded-l mx-4"
            type="text"
            value={outputValue}
            readOnly
          />
        </div>
      </div>
    </>
  );
};

export default Home;
