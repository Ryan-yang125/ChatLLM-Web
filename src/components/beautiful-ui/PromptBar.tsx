import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ChevronDownIcon,
  ComponentIcon,
  FileTextIcon,
  PauseIcon,
  PlusIcon,
  SendIcon,
  SlidersHorizontalIcon,
} from "@/components/icons";
import { ContextCard, SweepSurface } from "@/components/beautiful-ui/Primitives";
import { readLocalFiles, type PromptPreset, validateAttachmentSelection } from "@/features/context/files";
import { getModel, modelPickerModels } from "@/features/models/catalog";
import { getActiveConversation, getConversationAttachments, useChatStore } from "@/store/chat";

const presets: { id: PromptPreset; label: string; command: string }[] = [
  { id: "summarize", label: "Summarize", command: "/summarize" },
  { id: "explain", label: "Explain", command: "/explain" },
  { id: "rewrite", label: "Rewrite", command: "/rewrite" },
  { id: "code", label: "Code", command: "/code" },
];

type Menu = "files" | "mentions" | "presets" | "models" | "settings" | null;

export function PromptBar() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const state = useChatStore();
  const conversation = getActiveConversation(state);
  const attachments = getConversationAttachments(state);
  const models = modelPickerModels(state.customModels, conversation?.modelId, state.deviceProfile);
  const [input, setInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preset, setPreset] = useState<PromptPreset>();
  const [menu, setMenu] = useState<Menu>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSelectedIds([]);
    setPreset(undefined);
    setMenu(null);
  }, [conversation?.id]);

  const activeModel = getModel(conversation?.modelId ?? state.recommendedModelId, state.customModels, state.deviceProfile);

  if (!conversation) return null;

  function submit() {
    const prompt = input.trim();
    if (!prompt || state.isGenerating) return;
    const selectedAttachments = attachments.filter((attachment) => selectedIds.includes(attachment.id));
    const validation = validateAttachmentSelection(selectedAttachments);
    if (validation) {
      setFileError(validation);
      return;
    }
    setFileError(null);
    state.sendMessage(prompt, selectedIds, preset);
    setInput("");
    setSelectedIds([]);
    setPreset(undefined);
    setMenu(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setFileError(null);
    try {
      const additions = await readLocalFiles(Array.from(files), conversation.id);
      state.addAttachments(additions);
      setSelectedIds((current) => [...new Set([...current, ...additions.map((item) => item.id)])]);
      setMenu("mentions");
    } catch (error) {
      setFileError(error instanceof Error ? error.message : String(error));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function choosePreset(next: PromptPreset) {
    setPreset(next);
    setInput((value) => value.replace(/^\/\S*\s?/, ""));
    setMenu(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  return (
    <div className="prompt-shell">
      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        multiple
        accept=".txt,.md,.markdown,.json,.js,.jsx,.ts,.tsx,.py,.go,.rs,.java,.css,.html,.yaml,.yml,.toml,.sql,.sh,.bash,.zsh,text/*"
        onChange={(event) => void addFiles(event.target.files)}
      />

      <AnimatePresence>
        {menu ? (
          <motion.div
            className={`prompt-menu is-${menu}`}
            initial={reduced ? false : { opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            {menu === "files" ? (
              <button className="prompt-menu-row" type="button" onClick={() => fileRef.current?.click()}>
                <span><PlusIcon size={15} /></span><div><strong>Files</strong><small>TXT, Markdown, JSON, and code</small></div>
              </button>
            ) : null}

            {menu === "mentions" ? (
              <div className="context-menu-list">
                {attachments.length ? attachments.map((attachment) => (
                  <ContextCard
                    key={attachment.id}
                    attachment={attachment}
                    selected={selectedIds.includes(attachment.id)}
                    onToggle={() => {
                      setSelectedIds((current) => current.includes(attachment.id)
                        ? current.filter((id) => id !== attachment.id)
                        : [...current, attachment.id]);
                      setInput((value) => value.replace(/^@\w*\s?/, ""));
                      setFileError(null);
                    }}
                    onRemove={() => {
                      state.removeAttachment(attachment.id);
                      setSelectedIds((current) => current.filter((id) => id !== attachment.id));
                    }}
                  />
                )) : <button className="prompt-menu-row" type="button" onClick={() => fileRef.current?.click()}><span><FileTextIcon size={15} /></span><div><strong>Add context</strong><small>Choose local text or code files</small></div></button>}
              </div>
            ) : null}

            {menu === "presets" ? presets.map((item) => (
              <button className="prompt-menu-row" type="button" key={item.id} onClick={() => choosePreset(item.id)}>
                <span className="menu-command">/</span><div><strong>{item.label}</strong><small>{item.command}</small></div>
              </button>
            )) : null}

            {menu === "models" ? models.map((model) => (
              <button className={`prompt-menu-row${model.id === conversation.modelId ? " is-selected" : ""}`} type="button" key={model.id} onClick={() => {
                setMenu(null);
                void state.requestModel(model.id);
              }}>
                <span><ComponentIcon size={15} /></span><div><strong>{model.label}</strong><small>{model.bestFor} · {t(`models.tier.${model.tier}`)}</small></div>
                <i>{model.contextWindow / 1024}K</i>
              </button>
            )) : null}

            {menu === "settings" ? (
              <div className="generation-settings">
                <label><span>Temperature <b>{conversation.settings.temperature.toFixed(1)}</b></span><input type="range" min="0" max="2" step="0.1" value={conversation.settings.temperature} onChange={(event) => state.updateSettings({ temperature: Number(event.target.value) })} /></label>
                <label><span>Top P <b>{conversation.settings.topP.toFixed(2)}</b></span><input type="range" min="0.1" max="1" step="0.05" value={conversation.settings.topP} onChange={(event) => state.updateSettings({ topP: Number(event.target.value) })} /></label>
                <label><span>Max output <b>{conversation.settings.maxTokens}</b></span><input type="range" min="128" max="2048" step="128" value={conversation.settings.maxTokens} onChange={(event) => state.updateSettings({ maxTokens: Number(event.target.value) })} /></label>
                <label><span>System prompt</span><textarea value={conversation.settings.systemPrompt} onChange={(event) => state.updateSettings({ systemPrompt: event.target.value })} rows={3} /></label>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="prompt-bar bui-card">
        <SweepSurface trigger={`${selectedIds.length}:${conversation.modelId}:${state.runtimePhase}`} />
        {selectedIds.length || preset ? (
          <div className="prompt-chips">
            {preset ? <button type="button" onClick={() => setPreset(undefined)}><span>/</span>{preset}<i>×</i></button> : null}
            {attachments.filter((attachment) => selectedIds.includes(attachment.id)).map((attachment) => (
              <button type="button" key={attachment.id} onClick={() => setSelectedIds((current) => current.filter((id) => id !== attachment.id))}>
                <FileTextIcon size={12} />{attachment.name}<i>×</i>
              </button>
            ))}
          </div>
        ) : null}
        <textarea
          ref={textareaRef}
          value={input}
          rows={1}
          placeholder={t("chat.placeholder")}
          aria-label={t("chat.placeholder")}
          onChange={(event) => {
            const value = event.target.value;
            setInput(value);
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
            if (/^\/\w*$/.test(value)) setMenu("presets");
            if (/^@\w*$/.test(value)) setMenu("mentions");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setMenu(null);
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="prompt-toolbar">
          <button className="prompt-icon" type="button" onClick={() => setMenu(menu === "files" ? null : "files")} aria-label={t("chat.addContext")}><PlusIcon size={16} /></button>
          <button className="prompt-icon prompt-at" type="button" onClick={() => setMenu(menu === "mentions" ? null : "mentions")} aria-label="Mention context">@</button>
          <button className="prompt-model" type="button" onClick={() => setMenu(menu === "models" ? null : "models")}>
            <ComponentIcon size={14} /><span>{activeModel?.label ?? conversation.modelId}</span><ChevronDownIcon size={12} />
          </button>
          <button className="prompt-icon" type="button" onClick={() => setMenu(menu === "settings" ? null : "settings")} aria-label="Generation settings"><SlidersHorizontalIcon size={15} /></button>
          <button
            className="prompt-send"
            type="button"
            aria-label={state.isGenerating ? t("chat.stop") : t("chat.send")}
            disabled={!state.isGenerating && !input.trim()}
            onClick={() => state.isGenerating ? state.cancelGeneration() : submit()}
          >
            {state.isGenerating ? <PauseIcon size={16} /> : <SendIcon size={16} />}
          </button>
        </div>
      </div>
      {fileError ? <p className="prompt-error" role="alert">{fileError}</p> : null}
      <p className="prompt-meta">WEBGPU · LOCAL ONLY · 4K CONTEXT</p>
    </div>
  );
}
