import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Brand } from "@/components/Brand";
import { ModelActivity } from "@/components/ModelActivity";
import {
  BracesIcon,
  ChevronDownIcon,
  CommandIcon,
  ComponentIcon,
  FileTextIcon,
  MenuIcon,
  MessageCircleIcon,
  PauseIcon,
  SearchIcon,
  SendIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UploadIcon,
} from "@/components/icons";
import { MODEL_CONTEXT_LABEL, MODEL_LABEL } from "@/lib/web-llm";
import { getActiveConversation, useChatStore } from "@/store/chat";

const suggestions = [
  { label: "Explain WebGPU", prompt: "Explain how WebGPU accelerates a local language model.", icon: ComponentIcon },
  { label: "Write clearly", prompt: "Help me rewrite this idea clearly and concisely.", icon: MessageCircleIcon },
  { label: "Summarize notes", prompt: "Summarize these notes into key decisions and next steps.", icon: FileTextIcon },
  { label: "Review code", prompt: "Review this code for correctness, clarity, and performance.", icon: BracesIcon },
];

const MarkdownMessage = lazy(() =>
  import("@/components/MarkdownMessage").then((module) => ({ default: module.MarkdownMessage })),
);

function phaseLabel(phase: ReturnType<typeof useChatStore.getState>["modelPhase"]) {
  if (phase === "ready") return "Local · Ready";
  if (phase === "loading") return "Local · Loading";
  if (phase === "error") return "Local · Error";
  return "Local · On demand";
}

export function ChatWorkspace({
  onOpenCommand,
  onOpenMobile,
}: {
  onOpenCommand: () => void;
  onOpenMobile: () => void;
}) {
  const reduced = useReducedMotion();
  const state = useChatStore();
  const active = getActiveConversation(state);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [active?.messages, reduced]);

  function submit(value = input) {
    const prompt = value.trim();
    if (!prompt || state.isGenerating) return;
    state.sendMessage(prompt);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function chooseSuggestion(prompt: string) {
    setInput(prompt);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  if (!active) return null;

  return (
    <main className="workspace" id="main-content">
      <header className="workspace-header">
        <button className="icon-button mobile-menu" type="button" onClick={onOpenMobile} aria-label="Open conversations">
          <MenuIcon size={17} />
        </button>
        <div className="mobile-brand"><Brand /></div>
        <div className="conversation-title">
          <MessageCircleIcon size={16} />
          <strong>{active.title}</strong>
          <ChevronDownIcon size={13} />
        </div>
        <div className="workspace-actions">
          <button className="model-selector mat-cap" type="button" aria-label="Current model">
            <ComponentIcon size={15} />
            <span>{MODEL_LABEL}</span>
            <ChevronDownIcon size={13} />
          </button>
          <span className={`model-pill mat-cap is-${state.modelPhase}`}>
            <i aria-hidden="true" />
            {phaseLabel(state.modelPhase)}
          </span>
          <button className="icon-button header-command" type="button" onClick={onOpenCommand} aria-label="Open commands">
            <CommandIcon size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => state.clearConversation(active.id)}
            disabled={state.isGenerating || active.messages.length === 0}
            aria-label="Clear conversation"
          >
            <Trash2Icon size={16} />
          </button>
        </div>
      </header>

      <section className="chat-panel mat-panel">
        <ModelActivity />

        <div className="message-scroll no-bar" ref={scrollRef}>
          {active.messages.length === 0 ? (
            <motion.div
              className="empty-state"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0 : 0.28, ease: [0.23, 1, 0.32, 1] }}
            >
              <img src="/brand/chatllm-mark.png" alt="" />
              <h1>How can I help?</h1>
              <div className="suggestion-grid">
                {suggestions.map(({ label, prompt, icon: Icon }) => (
                  <button className="suggestion press mat-row" type="button" onClick={() => chooseSuggestion(prompt)} key={label}>
                    <Icon size={16} />
                    <span>{label}</span>
                    <SendIcon size={14} />
                  </button>
                ))}
              </div>
              <div className="trust-row meta">
                <span><ShieldCheckIcon size={13} />PRIVATE BY DEFAULT</span>
                <span><ComponentIcon size={13} />WEBGPU</span>
                <span><FileTextIcon size={13} />{MODEL_CONTEXT_LABEL} CONTEXT</span>
              </div>
            </motion.div>
          ) : (
            <div className="message-list">
              <AnimatePresence initial={false}>
                {active.messages.map((message) => (
                  <motion.article
                    className={`message is-${message.role}${message.isError ? " is-error" : ""}`}
                    key={message.id}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduced ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <div className="message-avatar">
                      {message.role === "assistant" ? <img src="/brand/chatllm-mark.png" alt="" /> : <span>You</span>}
                    </div>
                    <div className="message-body">
                      <header>
                        <strong>{message.role === "assistant" ? MODEL_LABEL : "You"}</strong>
                        <time>{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(message.createdAt)}</time>
                      </header>
                      {message.role === "assistant" ? (
                        message.content ? (
                          <Suspense fallback={<p>{message.content}</p>}>
                            <MarkdownMessage content={message.content} />
                          </Suspense>
                        ) : <span className="typing-indicator" aria-label="Generating"><i /><i /><i /></span>
                      ) : (
                        <p>{message.content}</p>
                      )}
                      {message.stats ? <small className="message-stats meta">{message.stats}</small> : null}
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="composer-shell">
          <div className="composer mat-cap">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                event.target.style.height = "auto";
                event.target.style.height = `${Math.min(event.target.scrollHeight, 150)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask anything…"
              aria-label="Message"
              rows={1}
            />
            <div className="composer-toolbar">
              <button type="button" aria-label="Add context" title="Add context">
                <UploadIcon size={16} />
              </button>
              <button className="composer-model" type="button" aria-label="Current model">
                <ComponentIcon size={14} />
                {MODEL_LABEL}
                <ChevronDownIcon size={12} />
              </button>
              <button className="composer-search" type="button" onClick={onOpenCommand}>
                <SearchIcon size={14} />
                <span>Commands</span>
                <kbd>⌘K</kbd>
              </button>
              <button
                className="send-button press"
                type="button"
                onClick={() => state.isGenerating ? state.cancelGeneration() : submit()}
                disabled={!state.isGenerating && input.trim().length === 0}
                aria-label={state.isGenerating ? "Stop generation" : "Send message"}
              >
                {state.isGenerating ? <PauseIcon size={17} /> : <SendIcon size={17} />}
              </button>
            </div>
          </div>
          <div className="composer-meta meta">
            WEBGPU · RUNS LOCALLY · 0 BYTES SENT · {MODEL_CONTEXT_LABEL} CONTEXT
          </div>
        </div>
      </section>
    </main>
  );
}
