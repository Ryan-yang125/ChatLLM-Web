import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Brand } from "@/components/Brand";
import { PromptBar } from "@/components/beautiful-ui/PromptBar";
import { AgentRunRail } from "@/components/beautiful-ui/AgentComponents";
import { PixelLoader, RecommendationCard, StatusTrace } from "@/components/beautiful-ui/Primitives";
import {
  BracesIcon,
  CheckIcon,
  ComponentIcon,
  CopyIcon,
  FileTextIcon,
  MenuIcon,
  MessageCircleIcon,
  SendIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "@/components/icons";
import { AGENT_MODEL_ID, allModels, getModel } from "@/features/models/catalog";
import { isModelCompatible } from "@/features/runtime/device";
import { getActiveConversation, useChatStore } from "@/store/chat";

const MarkdownMessage = lazy(() => import("@/components/MarkdownMessage").then((module) => ({ default: module.MarkdownMessage })));

export function ChatWorkspace({ onOpenMobile }: { onOpenMobile: () => void }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const state = useChatStore();
  const active = getActiveConversation(state);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const models = allModels(state.customModels, { profile: state.deviceProfile });
  const activeModel = getModel(active?.modelId ?? state.recommendedModelId, state.customModels, state.deviceProfile);
  const recommended = active?.mode === "agent"
    ? models.find((model) => model.id === active.modelId) ?? models.find((model) => model.id === AGENT_MODEL_ID) ?? models[0]
    : models.find((model) => model.id === state.recommendedModelId) ?? models[0];

  const suggestions = useMemo(() => active?.mode === "agent" ? [
    { label: t("agent.suggestions.brief"), prompt: "Read the selected files and create a concise project brief artifact.", icon: FileTextIcon },
    { label: t("agent.suggestions.audit"), prompt: "Search the selected files for TODOs and create an audit artifact grouped by priority.", icon: BracesIcon },
    { label: t("agent.suggestions.calculate"), prompt: "Calculate the totals found in the selected data and create a markdown summary artifact.", icon: ComponentIcon },
    { label: t("agent.suggestions.improve"), prompt: "Review the selected document and update its matching artifact with a clearer structure.", icon: MessageCircleIcon },
  ] : [
    { label: t("chat.suggestions.explain"), prompt: "Explain how WebGPU accelerates a local language model.", icon: ComponentIcon },
    { label: t("chat.suggestions.write"), prompt: "Help me rewrite this idea clearly and concisely.", icon: MessageCircleIcon },
    { label: t("chat.suggestions.summarize"), prompt: "Summarize these notes into key decisions and next steps.", icon: FileTextIcon },
    { label: t("chat.suggestions.review"), prompt: "Review this code for correctness, clarity, and performance.", icon: BracesIcon },
  ], [active?.mode, t]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [active?.messages, reduced, state.runtimePhase]);

  if (!active || !recommended) return null;

  async function copyMessage(id: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1400);
  }

  const busy = ["checking", "downloading", "loading"].includes(state.runtimePhase);
  const traceDetails = [
    state.deviceProfile?.webGPU ? `WebGPU · ${state.deviceProfile.adapterName}` : "WebGPU unavailable",
    activeModel ? `${activeModel.label} · ${activeModel.contextWindow / 1024}K context` : "Model pending",
    state.contextNotice ?? "Prompts and responses stay on this device",
  ];

  return (
    <main className="workspace" id="main-content">
      <header className="workspace-header">
        <button className="icon-button mobile-menu" type="button" onClick={onOpenMobile} aria-label="Open conversations"><MenuIcon size={17} /></button>
        <div className="mobile-brand"><Brand /></div>
        <div className="conversation-title"><MessageCircleIcon size={15} /><strong>{active.title}</strong><span className={`mode-tag is-${active.mode}`}>{t(`agent.${active.mode}`)}</span></div>
        <div className="workspace-actions">
          <Link className="header-model" to="/models"><ComponentIcon size={14} /><span>{activeModel?.label ?? active.modelId}</span><i className={`status-dot is-${state.runtimePhase}`} /></Link>
          <button className="icon-button" type="button" onClick={() => state.clearConversation(active.id)} disabled={state.isGenerating || !active.messages.length} aria-label="Clear conversation"><Trash2Icon size={15} /></button>
        </div>
      </header>

      <section className="chat-panel bui-window">
        <div className="message-scroll" ref={scrollRef}>
          {active.messages.length === 0 ? (
            <motion.div className="empty-state-v3" initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="empty-brand"><img src="/brand/chatllm-mark.png" alt="" /><span>{active.mode === "agent" ? "LOCAL AGENT WORKSPACE" : "LOCAL MODEL STUDIO"}</span></div>
              <h1>{active.mode === "agent" ? t("agent.title") : t("chat.title")}</h1>
              <RecommendationCard model={recommended} compatible={isModelCompatible(recommended, state.deviceProfile)} onUse={() => void state.requestModel(recommended.id)} />
              <div className="suggestion-grid-v3">
                {suggestions.map(({ label, prompt, icon: Icon }) => (
                  <button type="button" key={label} onClick={() => state.sendMessage(prompt)}><Icon size={15} /><span>{label}</span><SendIcon size={13} /></button>
                ))}
              </div>
              <div className="trust-row-v3"><span><ShieldCheckIcon size={13} />{t("chat.private")}</span><span><ComponentIcon size={13} />WebGPU</span><span><FileTextIcon size={13} />4K context</span></div>
            </motion.div>
          ) : (
            <div className="message-list-v3">
              <StatusTrace label={busy ? state.modelMessage : state.isGenerating ? "Generating" : "Local activity"} details={traceDetails} active={busy || state.isGenerating} />
              {busy ? <div className="inline-loader"><PixelLoader label={state.modelMessage || "Preparing model"} progress={state.modelProgress} /></div> : null}
              <AnimatePresence initial={false}>
                {active.messages.map((message) => {
                  const messageModel = getModel(message.modelId ?? active.modelId, state.customModels, state.deviceProfile);
                  const messageAttachments = state.attachments.filter((attachment) => message.attachmentIds.includes(attachment.id));
                  return (
                    <motion.article className={`message-v3 is-${message.role}${message.isError ? " is-error" : ""}`} key={message.id} initial={reduced ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="message-v3-header">
                        <div className="message-avatar-v3">{message.role === "assistant" ? <img src="/brand/chatllm-mark.png" alt="" /> : <span>Y</span>}</div>
                        <div><strong>{message.role === "assistant" ? messageModel?.label ?? "ChatLLM" : "You"}</strong><time>{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(message.createdAt)}</time></div>
                        {message.content ? <button type="button" onClick={() => void copyMessage(message.id, message.content)} aria-label="Copy message">{copiedId === message.id ? <CheckIcon size={14} /> : <CopyIcon size={14} />}</button> : null}
                      </div>
                      {messageAttachments.length ? <div className="message-context-chips">{messageAttachments.map((attachment) => <span key={attachment.id}><FileTextIcon size={11} />{attachment.name}</span>)}</div> : null}
                      {message.agentRun ? <AgentRunRail message={message} /> : null}
                      <div className="message-content-v3">
                        {message.role === "assistant" ? message.content ? (
                          <Suspense fallback={<p>{message.content}</p>}><MarkdownMessage content={message.content} /></Suspense>
                        ) : message.agentRun ? null : <PixelLoader label="Generating" /> : <p>{message.content}</p>}
                      </div>
                      {message.status === "stopped" ? <span className="message-state">Stopped</span> : null}
                      {message.stats ? <div className="message-stats-v3"><span>{(message.stats.elapsedMs / 1000).toFixed(1)}s</span><span>{message.stats.text || "Local generation"}</span></div> : null}
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
        <PromptBar />
      </section>
    </main>
  );
}
