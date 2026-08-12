import { lazy, Suspense } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  Code2Icon,
  CopyIcon,
  FileTextIcon,
  PauseIcon,
  RefreshCwIcon,
} from "@/components/icons";
import { useChatStore } from "@/store/chat";
import type { AgentStep, Message } from "@/types/chat";

const MarkdownMessage = lazy(() => import("@/components/MarkdownMessage").then((module) => ({ default: module.MarkdownMessage })));

function argumentSummary(step: AgentStep) {
  for (const key of ["name", "query", "expression", "title", "artifact"]) {
    const value = step.arguments[key];
    if (typeof value === "string" && value) return value.slice(0, 72);
  }
  return "Local browser tool";
}

export function AgentRunRail({ message }: { message: Message }) {
  const { t } = useTranslation();
  const openArtifact = useChatStore((state) => state.openArtifact);
  const retryAgent = useChatStore((state) => state.retryAgent);
  const run = message.agentRun;
  if (!run) return null;

  return (
    <section className={`agent-run-rail is-${run.status}`} aria-label={t("agent.run")}>
      <header>
        <span className="agent-run-signal" aria-hidden="true" />
        <strong>{t("agent.run")}</strong>
        <i>{t(`agent.status.${run.status}`)}</i>
        <small>{run.steps.length}/{run.maxSteps}</small>
      </header>
      <ol>
        {run.steps.map((step) => (
          <li className={`agent-step is-${step.status}`} key={step.id}>
            <span className="agent-step-node">
              {step.status === "running" ? <span className="agent-step-spinner" /> : step.status === "awaiting-approval" ? <PauseIcon size={12} /> : step.status === "complete" ? <CheckCircle2Icon size={12} /> : <span>!</span>}
            </span>
            <div>
              <div className="tool-chip"><Code2Icon size={11} />{t(`agent.tools.${step.toolName}`)}</div>
              <strong>{argumentSummary(step)}</strong>
              {step.status === "error" || step.status === "declined" ? <p>{step.result}</p> : null}
            </div>
            <span className="agent-step-status">{t(`agent.step.${step.status}`)}</span>
            {step.artifactId ? <button type="button" onClick={() => openArtifact(step.artifactId!)}><FileTextIcon size={12} />{t("agent.openArtifact")}</button> : null}
          </li>
        ))}
        {!run.steps.length ? <li className="agent-step is-running"><span className="agent-step-node"><span className="agent-step-spinner" /></span><div><strong>{t("agent.planning")}</strong></div></li> : null}
      </ol>
      {run.status === "error" || run.status === "stopped" ? <footer><button type="button" onClick={() => retryAgent(message.id)}><RefreshCwIcon size={12} />{t("models.retry")}</button></footer> : null}
    </section>
  );
}

export function ArtifactPanel() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const activeArtifactId = useChatStore((state) => state.activeArtifactId);
  const artifact = useChatStore((state) => state.artifacts.find((item) => item.id === activeArtifactId));
  const close = useChatStore((state) => state.closeArtifact);

  function download() {
    if (!artifact) return;
    const blob = new Blob([artifact.content], { type: artifact.kind === "json" ? "application/json" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const extension = { markdown: ".md", code: ".txt", json: ".json", text: ".txt" }[artifact.kind];
    const filename = artifact.title.replace(/[^a-z0-9._-]+/gi, "-");
    anchor.download = filename.includes(".") ? filename : `${filename}${extension}`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function copy() {
    if (artifact) await navigator.clipboard.writeText(artifact.content);
  }

  return (
    <AnimatePresence>
      {artifact ? (
        <motion.aside
          className="artifact-panel bui-card"
          aria-label={t("agent.artifact")}
          initial={reduced ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 18 }}
          transition={{ duration: reduced ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
        >
          <header>
            <div><span>{artifact.kind}</span><h2>{artifact.title}</h2></div>
            <button type="button" onClick={close} aria-label={t("common.close")}><ChevronRightIcon size={14} /></button>
          </header>
          <div className="artifact-content">
            {artifact.kind === "markdown" ? <Suspense fallback={<pre>{artifact.content}</pre>}><MarkdownMessage content={artifact.content} /></Suspense> : <pre>{artifact.content}</pre>}
          </div>
          <footer>
            <button className="bui-secondary" type="button" onClick={() => void copy()}><CopyIcon size={13} />{t("agent.copy")}</button>
            <button className="bui-primary" type="button" onClick={download}><FileTextIcon size={13} />{t("agent.download")}</button>
          </footer>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
