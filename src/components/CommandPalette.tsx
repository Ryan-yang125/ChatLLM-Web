import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CommandIcon,
  GithubIcon,
  MessageCircleIcon,
  MonitorIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "@/components/icons";
import { useTheme } from "@/components/ThemeProvider";
import { useChatStore } from "@/store/chat";

type PaletteItem = {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  disabled?: boolean;
  action: () => void;
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const { setTheme } = useTheme();
  const state = useChatStore();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const active = state.conversations.find((item) => item.id === state.activeConversationId);
    const base: PaletteItem[] = [
      {
        id: "new",
        label: "New conversation",
        hint: "⌘N",
        icon: <PlusIcon size={16} />,
        disabled: state.isGenerating,
        action: state.createConversation,
      },
      ...state.conversations.slice(0, 8).map((conversation) => ({
        id: `conversation:${conversation.id}`,
        label: conversation.title,
        hint: conversation.id === state.activeConversationId ? "Current" : "Conversation",
        icon: <MessageCircleIcon size={16} />,
        disabled: state.isGenerating && conversation.id !== state.activeConversationId,
        action: () => state.selectConversation(conversation.id),
      })),
      {
        id: "theme",
        label: "Toggle light and dark theme",
        hint: "Appearance",
        icon: <MonitorIcon size={16} />,
        action: () => {
          const dark = document.documentElement.dataset.theme === "dark";
          setTheme(dark ? "light" : "dark");
        },
      },
      {
        id: "clear",
        label: `Clear ${active?.title ?? "conversation"}`,
        hint: "Local action",
        icon: <Trash2Icon size={16} />,
        disabled: state.isGenerating || !active?.messages.length,
        action: () => active && state.clearConversation(active.id),
      },
      {
        id: "github",
        label: "Open GitHub repository",
        hint: "External",
        icon: <GithubIcon size={16} />,
        action: () => window.open("https://github.com/Ryan-yang125/ChatLLM-Web", "_blank", "noopener,noreferrer"),
      },
    ];
    return base;
  }, [setTheme, state]);

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? items.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(needle))
      : items;
  }, [items, query]);

  useEffect(() => {
    if (activeIndex >= visibleItems.length) setActiveIndex(0);
  }, [activeIndex, visibleItems.length]);

  function choose(item: PaletteItem | undefined) {
    if (!item || item.disabled) return;
    item.action();
    onClose();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="palette-layer"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.14 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className="command-palette mat-float"
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            initial={reduced ? false : { opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="palette-search">
              <SearchIcon size={17} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") onClose();
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveIndex((index) => Math.min(index + 1, visibleItems.length - 1));
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex((index) => Math.max(index - 1, 0));
                  }
                  if (event.key === "Enter") choose(visibleItems[activeIndex]);
                }}
                placeholder="Search chats or run a command…"
                aria-label="Search commands"
              />
              <kbd>ESC</kbd>
            </div>
            <div className="palette-heading meta">
              <CommandIcon size={13} />
              QUICK ACTIONS
            </div>
            <div className="palette-results" role="listbox">
              {visibleItems.map((item, index) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  className={activeIndex === index ? "is-active" : ""}
                  disabled={item.disabled}
                  key={item.id}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(item)}
                >
                  <span className="palette-item-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  <small>{item.hint}</small>
                </button>
              ))}
              {visibleItems.length === 0 ? <p>No matching commands</p> : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
