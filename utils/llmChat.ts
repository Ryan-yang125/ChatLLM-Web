// @ts-nocheck
// import EmccWASI  from '../public/lib/tvmjs/tvmjs_runtime.wasi'
// import { sentencePieceProcessor } from '../public/lib/sentencepiece/index'
// const sentencePieceProcessor = require('../public/lib/sentencepiece/index')

const llmChatConfig = {
  kvConfig: {
    numLayers: 64,
    shape: [32, 32, 128],
    dtype: 'float32',
  },
  wasmUrl: 'lib/vicuna-7b-v1/vicuna-7b-v1_webgpu.wasm',
  cacheUrl: 'https://huggingface.co/mlc-ai/web-lm/resolve/main/vicuna-7b-v1/',
  tokenizer: 'lib/vicuna-7b-v1/tokenizer.model',
  maxGenLength: 1024,
  meanGenLength: 256,
  maxWindowLength: 2048,
};

class LLMChatPipeline {
  constructor(tvm, tokenizer, cacheMetadata, config) {
    if (cacheMetadata == undefined) {
      throw Error('Expect cacheMetadata');
    }
    this.tvm = tvm;
    this.logger = console.log;
    this.tokenizer = tokenizer;
    this.bosTokenId = 1;
    this.eosTokenId = 2;

    this.maxWindowLength = config.maxWindowLength;
    this.maxGenLength = config.maxGenLength;
    this.meanGenLength = config.meanGenLength;
    this.streamInterval = 1;

    this.decodingTotalTime = 0;
    this.decodingTotalTokens = 0;
    this.encodingTotalTime = 0;
    this.encodingTotalTokens = 0;

    this.conversation = defaultConversation();

    this.device = this.tvm.webgpu();
    this.vm = this.tvm.detachFromCurrentScope(
      this.tvm.createVirtualMachine(this.device),
    );
    this.encoding = this.tvm.detachFromCurrentScope(
      this.vm.getFunction('encoding'),
    );
    this.decoding = this.tvm.detachFromCurrentScope(
      this.vm.getFunction('decoding'),
    );
    this.params = this.tvm.detachFromCurrentScope(
      this.tvm.getParamsFromCache('param', cacheMetadata.ParamSize),
    );
    const fcreateCache = this.vm.getFunction('create_kv_cache');
    this.fclearKVCaches = this.tvm.detachFromCurrentScope(
      this.tvm.getGlobalFunc('vm.builtin.attention_kv_cache_array_clear'),
    );

    // use extern config for now
    this.kvCache = this.tvm.detachFromCurrentScope(fcreateCache());
    // fill with pad token
    this.logitsOnCPU = undefined;

    this.kvCacheLength = 0;
    this.clearCache = true;
  }

  dispose() {
    // note: tvm instance is not owned by this class
    this.params.dispose();
    this.decoding.dispose();
    this.encoding.dispose();
    this.vm.dispose();
    this.kvCache.dispose();
    this.fclearKVCaches.dispose();
    if (this.logitsOnCPU != undefined) {
      this.logitsOnCPU.dispose();
    }
  }

  #clearKVCache() {
    this.fclearKVCaches(this.kvCache);
  }

  #forward(inputs, curPos) {
    this.tvm.beginScope();
    var retValue;
    const seqLenShape = this.tvm.makeShapeTuple([curPos]);
    if (inputs.shape[1] > 1) {
      retValue = this.encoding(inputs, seqLenShape, this.kvCache, this.params);
    } else {
      retValue = this.decoding(inputs, seqLenShape, this.kvCache, this.params);
    }
    const logits = this.tvm.detachFromCurrentScope(retValue.get(0));
    this.tvm.endScope();
    this.tvm.attachToCurrentScope(logits);
    return logits;
  }

  // NOTE: caller must call device.sync()
  #updateLogitsOnCPU(logits) {
    if (this.logitsOnCPU == undefined) {
      this.logitsOnCPU = this.tvm.detachFromCurrentScope(
        this.tvm.empty(logits.shape, logits.dtype, this.tvm.cpu()),
      );
    } else {
      if (logits.shape[0] != this.logitsOnCPU.shape[0]) {
        throw Error('We expect the size of logits to remain unchanged');
      }
    }
    this.logitsOnCPU.copyFrom(logits);
  }

  async sampleTokenFromLogits(logits, temperature = 0.8, top_p = 0.95) {
    this.tvm.beginScope();
    this.#updateLogitsOnCPU(logits);
    this.tvm.endScope();
    await this.device.sync();
    return this.tvm.sampleTopPFromLogits(this.logitsOnCPU, temperature, top_p);
  }

  async getInputTokens() {
    let tokens = [this.bosTokenId];
    let prompts = '';
    if (this.conversation.messages.length <= 2) {
      prompts = this.conversation.getPromptArray();
    } else {
      tokens.pop();
      prompts = this.conversation.getPromptArrayUnproccessed();
    }
    tokens.push(...(await this.tokenizer.encodeIds(prompts[0])));
    let ctxLength = tokens.length;
    let context = [];
    let need_shift_window = false;
    for (let i = prompts.length - 1; i > 0; --i) {
      const encoded = this.tokenizer.encodeIds(prompts[i]);
      ctxLength += encoded.length;
      if (
        this.kvCacheLength + ctxLength + this.meanGenLength >=
        this.maxWindowLength
      ) {
        need_shift_window = true;
        break;
      }
      context.unshift(encoded);
    }
    if (!need_shift_window) {
      for (const ctx of context) {
        tokens.push(...ctx);
      }
      return tokens;
    }
    // need shift window and re-encode
    this.logger('need shift window');
    this.kvCacheLength = 0;
    this.clearCache = true;
    // abandon all tokens we collected
    tokens = [this.bosTokenId];
    let all_prompts = this.conversation.getPromptArray();
    tokens.push(...(await this.tokenizer.encodeIds(all_prompts[0])));
    context = [];
    ctxLength = tokens.length;
    //only keep 10% of the window context
    const fill_factor = 0.1;
    for (let i = all_prompts.length - 1; i > 0; --i) {
      const encoded = this.tokenizer.encodeIds(all_prompts[i]);
      ctxLength += encoded.length;
      if (
        ctxLength >= fill_factor * this.maxWindowLength &&
        i + 2 < all_prompts.length
      ) {
        break;
      }
      context.unshift(encoded);
    }
    for (const ctx of context) {
      tokens.push(...ctx);
    }
    if (tokens.length + this.meanGenLength >= this.maxWindowLength) {
      throw Error('Exceed max window length curr=' + tokens.length);
    }
    return tokens;
  }

  resetChat() {
    this.conversation.reset();
    this.#clearKVCache();
    this.decodingTotalTime = 0;
    this.encodingTotalTime = 0;
    this.decodingTotalTokens = 0;
    this.encodingTotalTokens = 0;
  }

  async generate(inputPrompt, callbackUpdateResponse) {
    this.conversation.appendMessage(this.conversation.roles[0], inputPrompt);
    this.conversation.appendMessage(this.conversation.roles[1], '');
    const stopStr = this.conversation.getStopStr();
    const tokens = await this.getInputTokens();
    const inputTokenLength = tokens.length;

    var outputPrompt = '';
    if (this.clearCache) {
      this.#clearKVCache();
      this.clearCache = false;
    }
    const maxGenLen = Math.min(
      this.maxGenLength,
      this.maxWindowLength - tokens.length,
    );
    if (maxGenLen < this.meanGenLength) {
      throw Error('Too small window size config');
    }
    let step = 0;
    for (
      ;
      step < maxGenLen &&
      this.kvCacheLength + inputTokenLength + step < this.maxWindowLength;
      ++step
    ) {
      this.tvm.beginScope();
      var inputData;
      let tstart = performance.now();
      if (step == 0) {
        inputData = this.tvm.empty([1, tokens.length], 'int32', this.device);
        inputData.copyFrom(tokens);
      } else {
        inputData = this.tvm.empty([1, 1], 'int32', this.device);
        inputData.copyFrom(tokens.slice(tokens.length - 1));
      }
      const logits = this.tvm.detachFromCurrentScope(
        this.#forward(inputData, this.kvCacheLength + inputTokenLength + step),
      );
      this.tvm.endScope();

      const nextToken = await this.sampleTokenFromLogits(logits);
      logits.dispose();

      tokens.push(nextToken);
      const outputTokens = tokens.slice(inputTokenLength);
      outputPrompt = this.tokenizer.decodeIds(outputTokens);

      if (nextToken == this.eosTokenId) break;

      const stopPos = outputPrompt.lastIndexOf(stopStr);
      if (stopPos != -1) {
        outputPrompt = outputPrompt.substring(0, stopPos);
        break;
      }
      let tend = performance.now();
      if (step != 0) {
        this.decodingTotalTokens += 1;
        this.decodingTotalTime += (tend - tstart) / 1000;
      } else {
        this.encodingTotalTime += (tend - tstart) / 1000;
        this.encodingTotalTokens += inputTokenLength;
      }

      if (step % this.streamInterval == 0) {
        callbackUpdateResponse(step, outputPrompt);
      }
    }
    this.kvCacheLength += tokens.length - 1;
    this.conversation.messages[this.conversation.messages.length - 1][1] =
      outputPrompt;
    return outputPrompt;
  }

  async evaluate() {
    // run a canonical evaluation of the flow
    this.#clearKVCache();
    const testPrompt = 'The capital of Canada is';
    const ids = await this.tokenizer.encodeIds(testPrompt);
    const inputPromptSize = ids.length;
    const tokens = Array.from(ids);
    tokens.unshift(this.bosTokenId);
    if (tokens.length == 0) {
      throw Error('empty token');
    }

    this.tvm.beginScope();
    const inputData = this.tvm.empty([1, tokens.length], 'int32', this.device);
    inputData.copyFrom(tokens);
    const encodingStart = performance.now();
    this.#forward(inputData, tokens.length);
    this.tvm.endScope();
    await this.device.sync();

    const decodingStart = performance.now();

    this.tvm.beginScope();
    const firstSampleToken = this.tvm
      .empty([1, 1], 'int32', this.device)
      .copyFrom([6234]);
    this.#updateLogitsOnCPU(this.#forward(firstSampleToken, tokens.length + 1));
    await this.device.sync();
    this.tvm.endScope();

    const decodingEnd = performance.now();
    const msg =
      `encoding-time=${((decodingStart - encodingStart) / 1000).toFixed(
        4,
      )} sec` +
      `decoding-time=${((decodingEnd - decodingStart) / 1000).toFixed(4)} sec`;

    // simply log tokens for eyeballing.
    console.log('Logits:');
    console.log(this.logitsOnCPU.toArray());
    console.log(msg);
  }

  /**
   * async preload webgpu pipelines when possible.
   */
  async asyncLoadWebGPUPiplines() {
    await this.tvm.asyncLoadWebGPUPiplines(this.vm.getInternalModule());
  }

  runtimeStatsText() {
    return (
      `encoding: ${(this.encodingTotalTokens / this.encodingTotalTime).toFixed(
        4,
      )} tokens/sec, ` +
      `decoding: ${(this.decodingTotalTokens / this.decodingTotalTime).toFixed(
        4,
      )} tokens/sec`
    );
  }
}

/**
 * A instance that can be used to facilitate deployment.
 */
class LLMChatInstance {
  constructor() {
    this.requestInProgress = false;
    this.config = undefined;
    this.tvm = undefined;
    this.pipeline = undefined;
    this.uiChat = undefined;
    this.uiChatInput = undefined;
    this.logger = console.log;
    this.debugTest = false;
  }
  /**
   * Initialize TVM
   * @param wasmUrl URL to wasm source.
   * @param cacheUrl URL to NDArray cache.
   * @param logger Custom logger.
   */
  async #asyncInitTVM(wasmUrl, cacheUrl) {
    if (this.tvm !== undefined) {
      return;
    }
    this.logger = console.log;

    const wasmSource = await (await fetch(wasmUrl)).arrayBuffer();
    const tvm = await tvmjs.instantiate(
      new Uint8Array(wasmSource),
      new EmccWASI(),
      this.logger,
    );
    // initialize WebGPU
    try {
      const output = await tvmjs.detectGPUDevice();
      if (output !== undefined) {
        var label = 'WebGPU';
        if (output.adapterInfo.description.length != 0) {
          label += ' - ' + output.adapterInfo.description;
        } else {
          label += ' - ' + output.adapterInfo.vendor;
        }
        console.log('init', 'Initialize GPU device: ' + label);

        // console.log();
        tvm.initWebGPU(output.device);
      } else {
        console.log('error', 'This browser env do not support WebGPU');
        this.reset();
        throw Error('This browser env do not support WebGPU');
      }
    } catch (err) {
      console.log(
        'error',
        'Find an error initializing the WebGPU device ' + err.toString(),
      );
      console.log(err.stack);
      this.reset();
      throw Error('Find an error initializing WebGPU: ' + err.toString());
    }
    console.log('init', '');
    this.tvm = tvm;
    // self = this;
    // function initProgressCallback(report) {
    //   self.updateLastMessage("init", report.text);
    // }
    const initProgressCallback = (report) => {
      this.updateLastMessage('init', report.text);
    };
    tvm.registerInitProgressCallback(initProgressCallback);
    if (!cacheUrl.startsWith('http')) {
      cacheUrl = new URL(cacheUrl, document.URL).href;
    }
    console.log('start fetchNDArray');

    await tvm.fetchNDArrayCache(cacheUrl, tvm.webgpu());
    console.log('end fetchNDArray');
  }
  /**
   * Async initialize instance.
   */
  async asyncInit() {
    if (this.pipeline !== undefined) return;
    await this.#asyncInitConfig();
    await this.#asyncInitTVM(this.config.wasmUrl, this.config.cacheUrl);
    await this.#asyncInitPipeline();
  }

  /**
   * Async initialize config
   */
  async #asyncInitConfig() {
    if (this.config !== undefined) return;
    this.config = llmChatConfig;
    this.uiChat = document.getElementById('chatui-chat');
    this.uiChatInput = document.getElementById('chatui-input');
    this.uiChatInfoLabel = document.getElementById('chatui-info-label');
  }

  /**
   * Initialize the pipeline
   *
   * @param tokenizerModel The url to tokenizer model.
   */
  async #asyncInitPipeline() {
    console.log('asyncInitPipeline start');

    if (this.pipeline !== undefined) return;
    // initialize UX and tokenizer
    console.log('tokenizer start');

    const tokenizer = await tvmjsGlobalEnv.sentencePieceProcessor(
      this.config.tokenizer,
    );
    console.log('tokenizer end');

    console.log('pipeline start');
    this.pipeline = this.tvm.withNewScope(() => {
      return new LLMChatPipeline(
        this.tvm,
        tokenizer,
        this.tvm.cacheMetadata,
        this.config,
      );
    });
    console.log('pipeline end');
    console.log('asyncLoadWebGPUPiplines start');
    await this.pipeline.asyncLoadWebGPUPiplines();
    console.log('asyncLoadWebGPUPiplines end');
    this.updateLastMessage('init', 'All initialization finished.');
  }

  appendMessage(kind, text) {
    console.log(kind, text);
    return;
    if (kind == 'init') {
      text = '[System Initalize] ' + text;
    }
    const msg = `
      <div class="msg ${kind}-msg">
        <div class="msg-bubble">
          <div class="msg-text">${text}</div>
        </div>
      </div>
    `;
    this.uiChat.insertAdjacentHTML('beforeend', msg);
    this.uiChat.scrollTo(0, this.uiChat.scrollHeight);
  }

  updateLastMessage(kind, text) {
    console.log(kind, text);

    return;
    if (kind == 'init') {
      text = '[System Initalize] ' + text;
    }
    const matches = this.uiChat.getElementsByClassName(`msg ${kind}-msg`);
    if (matches.length == 0) throw Error(`${kind} message do not exist`);
    const msg = matches[matches.length - 1];
    const msgText = msg.getElementsByClassName('msg-text');
    if (msgText.length != 1) throw Error('Expect msg-text');
    if (msgText[0].innerHTML == text) return;
    text = text.replaceAll('\n', '<br>');
    msgText[0].innerHTML = text;
    this.uiChat.scrollTo(0, this.uiChat.scrollHeight);
  }

  async respondTestMessage(repeat) {
    console.log('left', '');
    const testMessage = 'I am a friendly bot. Please ask questions.';
    const encodedResult = await this.pipeline.tokenizer.encodeIds(testMessage);

    const currentIds = [];
    for (let k = 0; k < repeat; ++k) {
      for (let i = 0; i < encodedResult.length; ++i) {
        currentIds.push(encodedResult[i]);
        const msg = this.pipeline.tokenizer.decodeIds(currentIds);
        this.updateLastMessage('left', msg);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  resetChat() {
    if (this.requestInProgress) return;
    const clearTags = ['left', 'right'];
    for (const tag of clearTags) {
      const matches = this.uiChat.getElementsByClassName(`msg ${tag}-msg`);
      for (const item of matches) {
        item.remove();
      }
    }
    this.uiChatInfoLabel.innerHTML = '';
    this.pipeline.resetChat();
  }

  /**
   * Run generate
   */
  async generate() {
    if (this.requestInProgress) {
      return;
    }

    this.requestInProgress = true;

    try {
      await this.asyncInit();
    } catch (err) {
      console.log('error', 'Init error, ' + err.toString());
      console.log(err.stack);
      this.reset();
      this.requestInProgress = false;
      return;
    }

    if (this.debugTest) {
      await this.pipeline.evaluate();
      this.requestInProgress = false;
      return;
    }

    const prompt = this.uiChatInput.value;
    if (prompt == '') {
      this.requestInProgress = false;
      return;
    }

    console.log('right', prompt);
    this.uiChatInput.value = '';
    this.uiChatInput.setAttribute('placeholder', 'Generating...');

    console.log('left', '');
    const callbackUpdateResponse = (step, msg) => {
      if (msg.endsWith('##')) {
        msg = msg.substring(0, msg.length - 2);
      } else if (msg.endsWith('#')) {
        msg = msg.substring(0, msg.length - 1);
      }
      this.updateLastMessage('left', msg);
    };
    try {
      const output = await this.pipeline.generate(
        prompt,
        callbackUpdateResponse,
      );
      this.updateLastMessage('left', output);
      this.uiChatInfoLabel.innerHTML = this.pipeline.runtimeStatsText();
    } catch (err) {
      console.log('error', 'Generate error, ' + err.toString());
      console.log(err.stack);
      this.reset();
    }
    this.uiChatInput.setAttribute('placeholder', 'Enter your message...');
    this.requestInProgress = false;
  }

  /**
   * Reset the instance;
   */
  reset() {
    this.tvm = undefined;
    if (this.pipeline !== undefined) {
      this.pipeline.dispose();
    }
    this.pipeline = undefined;
  }
}

export const localLLMChatIntance = new LLMChatInstance();
// if (typeof window !== "undefined") {
//   // Client-side-only code
//   window.tvmjsGlobalEnv.asyncOnGenerate = async function () {
//     await localLLMChatIntance.generate();
//   };

//   window.tvmjsGlobalEnv.asyncOnReset = async function () {
//     await localLLMChatIntance.resetChat();
//   };

// }
