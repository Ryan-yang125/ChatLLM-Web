import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ComponentIcon, PauseIcon, PlayIcon, RefreshCwIcon } from "@/components/icons";
import { MODEL_LABEL, MODEL_SIZE_LABEL } from "@/lib/web-llm";
import { ProgressBar } from "@/components/ProgressBar";
import { useChatStore } from "@/store/chat";

export function ModelActivity() {
  const reduced = useReducedMotion();
  const {
    modelPhase,
    modelMessage,
    modelProgress,
    isGenerating,
    prepareModel,
    unloadModel,
    cancelGeneration,
  } = useChatStore();

  if (modelPhase === "ready") return null;

  const loading = modelPhase === "loading";
  const error = modelPhase === "error";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.section
        className={`model-activity mat-cap${error ? " is-error" : ""}`}
        aria-label="Local model status"
        key={modelPhase}
        initial={reduced ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: reduced ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="model-activity-icon">
          <ComponentIcon size={18} />
        </div>
        <div className="model-activity-copy">
          {loading ? (
            <ProgressBar
              value={modelProgress}
              label={`Preparing ${MODEL_LABEL}`}
              pendingLabel="Loading"
              completeLabel="Ready"
            />
          ) : (
            <strong>{error ? "Model setup needs attention" : `Prepare ${MODEL_LABEL}`}</strong>
          )}
          <span>{loading || error ? modelMessage : `${MODEL_SIZE_LABEL} · cached after the first load`}</span>
        </div>
        {loading ? (
          <button
            className="icon-button"
            type="button"
            onClick={isGenerating ? cancelGeneration : unloadModel}
            aria-label={isGenerating ? "Stop generation" : "Cancel model load"}
          >
            <PauseIcon size={15} />
          </button>
        ) : (
          <button className="model-action press" type="button" onClick={prepareModel}>
            {error ? <RefreshCwIcon size={14} /> : <PlayIcon size={14} />}
            {error ? "Retry" : "Load model"}
          </button>
        )}
      </motion.section>
    </AnimatePresence>
  );
}
