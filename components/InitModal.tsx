import React from 'react';

import Link from 'next/link';

import { useChatStore } from '@/store/chat';

function InitItem(props: { content: string; isError: boolean }) {
  return (
    <>
      <li className={`py-1 ${props.isError ? 'text-error' : ''}`}>
        {props.content}
      </li>
    </>
  );
}
export function InitModal() {
  const [initInfoTmp] = useChatStore((state) => [state.initInfoTmp]);

  const chatStore = useChatStore();
  return (
    <>
      <div className={`modal ${initInfoTmp.showModal ? 'modal-open' : ''}`}>
        <div className="modal-box w-11/12 max-w-5xl">
          {initInfoTmp.initMsg.findIndex((msg) => msg.isError) !== -1 && (
            <label
              htmlFor="my-modal-3"
              className="btn btn-sm btn-circle absolute right-2 top-2"
              onClick={() => chatStore.toggleInitModal(false)}
            >
              ✕
            </label>
          )}
          <h3 className="font-bold text-lg">Loading Model...</h3>
          <ul>
            {initInfoTmp.initMsg.map((msg) => (
              <InitItem
                content={msg.content}
                isError={!!msg.isError}
                key={msg.id}
              />
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

export function InstructionModal() {
  const [instructionModalStatus] = useChatStore((state) => [
    state.instructionModalStatus,
  ]);

  const chatStore = useChatStore();
  return (
    <>
      <div className={`modal ${instructionModalStatus ? 'modal-open' : ''}`}>
        <div className="modal-box w-11/12 max-w-5xl">
          <h3 className="font-bold text-lg">Instructions</h3>
          <p className="py-4">
            <Link href="https://github.com/mlc-ai/web-llm" target="_blank">
              WebLLM
            </Link>
            brings language model chats directly onto web browsers. Everything
            runs inside the browser with no server support and accelerated with
            WebGPU. For more details, check in{' '}
            <a href="https://github.com/mlc-ai/web-llm" target="_blank">
              WebLLM
            </a>
          </p>
          <p className="">Here are some instructions about this app: </p>
          <ul>
            <li className="py-1">1. We use model Vicuna-7b.</li>
            <li className="py-1">
              2. Using browser supports WebGPU, you can try out Chrome 113 or
              Chrome Canary. Chrome version ≤ 112 is not supported.
            </li>
            <li className="py-1">
              3. First init requires download model, for vicuna-7b-v1.1, it
              abouts 4GB. After downloading once, we can load modol from browser
              cache for next time usage, it's faster.
            </li>
            <li className="py-1">
              4. You will need a gpu with about 6.4G memory. If lower than that,
              it's ok to run, but slow to wait for response.
            </li>
          </ul>
          <div className="modal-action">
            <label
              htmlFor="init-modal"
              className="btn"
              onClick={() => chatStore.toggleInstuctionModal(false)}
            >
              Okay, Let's start!
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
