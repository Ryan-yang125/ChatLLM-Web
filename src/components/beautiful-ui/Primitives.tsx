import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { ACCENTS, accentChain, createShader, playSweep, type ShaderController } from "glimm";
import {
  AlertTriangle,
  CheckCircle2Icon,
  ChevronDownIcon,
  ComponentIcon,
  FileTextIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "@/components/icons";
import { ProgressBar } from "@/components/ProgressBar";
import { diffLines } from "@/features/agent/diff";
import { getModel, modelSizeLabel } from "@/features/models/catalog";
import { useChatStore } from "@/store/chat";
import type { LocalAttachment, ModelDefinition } from "@/types/chat";

export function SweepSurface({ trigger }: { trigger: string | number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<ShaderController | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!canvasRef.current || reduced) return;
    controllerRef.current = createShader({
      canvas: canvasRef.current,
      palette: accentChain([ACCENTS.blue, ACCENTS.indigo, ACCENTS.cyan]),
      bandTight: 0.62,
      brightness: document.documentElement.dataset.theme === "dark" ? 0.65 : 0.9,
      swellAmount: 0.38,
    });
    return () => controllerRef.current?.destroy();
  }, [reduced]);

  useEffect(() => {
    if (!controllerRef.current || reduced) return;
    const handle = playSweep(controllerRef.current, {
      sweepMs: 760,
      outroMs: 420,
      peakAlpha: 0.52,
      waveAmount: 0.35,
      rippleAmount: 0.2,
      easing: "easeOutQuart",
    });
    return () => handle.cancel();
  }, [reduced, trigger]);

  return <canvas className="glimm-canvas" ref={canvasRef} aria-hidden="true" />;
}

export function PixelLoader({ label, elapsed, progress }: { label: string; elapsed?: string; progress?: number | null }) {
  return (
    <div className="bui-loading" role="status">
      <span aria-hidden="true" className="pixel-grid">
        {Array.from({ length: 9 }, (_, index) => <i key={index} style={{ animationDelay: `${(index % 4) * 90}ms` }} />)}
      </span>
      <span className="shimmer-text">{label}</span>
      {elapsed ? <span className="mono-label">{elapsed}</span> : null}
      {progress !== undefined ? <ProgressBar value={progress} label="" className="compact-progress" /> : null}
    </div>
  );
}

export function StatusTrace({ label, details, active = false }: { label: string; details: string[]; active?: boolean }) {
  const [open, setOpen] = useState(active);
  useEffect(() => setOpen(active), [active]);
  return (
    <div className="status-trace">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {active ? <span className="trace-spark" aria-hidden="true" /> : <CheckCircle2Icon size={15} />}
        <span className={active ? "shimmer-text" : ""}>{label}</span>
        <ChevronDownIcon size={13} className={open ? "is-open" : ""} />
      </button>
      <div className="trace-grid" data-open={open}>
        <div>
          <ol>{details.map((detail) => <li key={detail}>{detail}</li>)}</ol>
        </div>
      </div>
    </div>
  );
}

export function InsightCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <article className="insight-card bui-card">
      <div className="insight-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function RecommendationCard({
  model,
  compatible,
  onUse,
}: {
  model: ModelDefinition;
  compatible: boolean;
  onUse: () => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <article className="recommendation-card bui-card">
      <div className="recommendation-mark"><ComponentIcon size={19} /></div>
      <div className="recommendation-copy">
        <div><span>{t("common.recommended")}</span><i>{compatible ? t("common.compatible") : t("common.checkDevice")}</i></div>
        <h2>{model.label}</h2>
        <p>{i18n.language === "zh" ? model.bestForZh : model.bestFor}</p>
        <dl>
          <div><dt>{t("common.memory")}</dt><dd>{modelSizeLabel(model)}</dd></div>
          <div><dt>{t("common.context")}</dt><dd>{model.contextWindow / 1024}K</dd></div>
          <div><dt>{t("common.privacy")}</dt><dd>{t("common.onDevice")}</dd></div>
        </dl>
      </div>
      <button className="bui-primary" type="button" onClick={onUse} disabled={!compatible}>{t("models.use")}</button>
    </article>
  );
}

export function ContextCard({ attachment, selected, onToggle, onRemove }: {
  attachment: LocalAttachment;
  selected: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={`context-card${selected ? " is-selected" : ""}`}>
      <button type="button" className="context-select" onClick={onToggle} aria-pressed={selected}>
        <FileTextIcon size={15} />
        <span><strong>{attachment.name}</strong><small>{attachment.estimatedTokens.toLocaleString()} tokens</small></span>
        {selected ? <CheckCircle2Icon size={14} /> : null}
      </button>
      <button type="button" onClick={onRemove} aria-label={`Remove ${attachment.name}`}><Trash2Icon size={13} /></button>
    </div>
  );
}

function approvalCopy(kind: NonNullable<ReturnType<typeof useChatStore.getState>["approval"]>["kind"], modelLabel: string) {
  if (kind === "delete-cache") return { title: "Delete model cache?", body: `${modelLabel} will need to be downloaded again.` };
  if (kind === "custom-model") return { title: "Trust this model source?", body: "The browser will download and execute the declared WebAssembly model library." };
  if (kind === "fallback") return { title: "Load the lighter model?", body: `${modelLabel} uses less GPU memory and keeps this conversation local.` };
  if (kind === "agent-mode") return { title: "Enable Agent mode?", body: `${modelLabel} supports local tool calls and artifact workflows.` };
  if (kind === "agent-tool") return { title: "Apply artifact change?", body: "Review the local diff before this artifact is saved." };
  return { title: "Download local model?", body: `${modelLabel} will be stored in this browser for later sessions.` };
}

export function ApprovalModal() {
  const { t, i18n } = useTranslation();
  const reduced = useReducedMotion();
  const approval = useChatStore((state) => state.approval);
  const customModels = useChatStore((state) => state.customModels);
  const confirm = useChatStore((state) => state.confirmApproval);
  const cancel = useChatStore((state) => state.cancelApproval);
  const modelId = approval && "modelId" in approval ? approval.modelId : approval?.kind === "custom-model" ? approval.manifest.record.model_id : "";
  const model = getModel(modelId, customModels);
  const copy = approval ? approvalCopy(approval.kind, model?.label ?? modelId) : null;
  const proposal = approval?.kind === "agent-tool" ? approval.proposal : null;
  const diff = proposal ? diffLines(proposal.previousContent, proposal.artifact.content) : [];
  const localizedCopy = approval && i18n.language === "zh" ? {
    title: approval.kind === "delete-cache" ? "删除模型缓存？" : approval.kind === "custom-model" ? "信任此模型来源？" : approval.kind === "fallback" ? "加载轻量模型？" : approval.kind === "agent-mode" ? "启用 Agent 模式？" : approval.kind === "agent-tool" ? "应用 Artifact 修改？" : "下载本地模型？",
    body: approval.kind === "delete-cache" ? `${model?.label ?? modelId} 下次使用时需要重新下载。` : approval.kind === "custom-model" ? "浏览器将下载并执行清单中声明的 WebAssembly 模型库。" : approval.kind === "agent-tool" ? "确认 Diff 后，修改将保存在当前浏览器。" : `${model?.label ?? modelId} 将在当前浏览器中本地运行。`,
  } : copy;

  return (
    <AnimatePresence>
      {approval && localizedCopy ? (
        <motion.div className="approval-layer" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => {
          if (event.target === event.currentTarget) cancel();
        }}>
          <motion.section
            className={`approval-card bui-card${proposal ? " is-artifact" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-title"
            initial={reduced ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="approval-icon">{approval.kind === "delete-cache" ? <AlertTriangle size={18} /> : proposal ? <FileTextIcon size={18} /> : <ShieldCheckIcon size={18} />}</div>
            <div><h2 id="approval-title">{localizedCopy.title}</h2><p>{localizedCopy.body}</p></div>
            {proposal ? (
              <div className="artifact-approval-body">
                <div className="artifact-approval-summary"><span>{proposal.operation}</span><strong>{proposal.artifact.title}</strong><i>{proposal.artifact.kind}</i></div>
                <div className="diff-table" role="table" aria-label="Artifact diff">
                  {diff.map((row, index) => <div className={`diff-row is-${row.type}`} role="row" key={`${index}-${row.type}`}><span>{row.type === "add" ? "+" : row.type === "remove" ? "−" : ""}</span><code>{row.after ?? row.before ?? " "}</code></div>)}
                </div>
              </div>
            ) : (
              <dl>
                <div><dt>Model</dt><dd>{model?.label ?? modelId}</dd></div>
                {model ? <div><dt>Memory</dt><dd>{modelSizeLabel(model)}</dd></div> : null}
                <div><dt>Runtime</dt><dd>WebLLM · WebGPU</dd></div>
              </dl>
            )}
            <footer>
              <button className="bui-secondary" type="button" onClick={cancel}>{t("common.cancel")}</button>
              <button className="bui-primary" type="button" onClick={() => void confirm()}>{approval.kind === "delete-cache" ? t("models.deleteCache") : proposal ? t("agent.apply") : t("common.confirm")}</button>
            </footer>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
