import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Brand } from "@/components/Brand";
import {
  ArrowLeftIcon,
  GithubIcon,
  MessageCircleIcon,
  MonitorIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from "@/components/icons";
import { useTheme } from "@/components/ThemeProvider";
import { groupConversations, timeLabel } from "@/lib/chat-utils";
import { useChatStore } from "@/store/chat";

export function Sidebar({
  onOpenCommand,
  onCloseMobile,
}: {
  onOpenCommand: () => void;
  onCloseMobile?: () => void;
}) {
  const reduced = useReducedMotion();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const {
    conversations,
    activeConversationId,
    isGenerating,
    createConversation,
    selectConversation,
    deleteConversation,
  } = useChatStore();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(needle),
    );
  }, [conversations, query]);

  const groups = useMemo(() => groupConversations(filtered), [filtered]);

  function newConversation() {
    createConversation();
    onCloseMobile?.();
  }

  function toggleTheme() {
    const resolvedDark = document.documentElement.dataset.theme === "dark";
    setTheme(resolvedDark ? "light" : "dark");
  }

  return (
    <aside className="sidebar" aria-label="Conversation library">
      <div className="sidebar-brand-row">
        <Brand />
        {onCloseMobile ? (
          <button className="icon-button mobile-close" type="button" onClick={onCloseMobile} aria-label="Close navigation">
            <ArrowLeftIcon size={16} />
          </button>
        ) : null}
      </div>

      <button className="new-chat-button press" type="button" onClick={newConversation} disabled={isGenerating}>
        <PlusIcon size={16} />
        <span>New conversation</span>
        <kbd>⌘N</kbd>
      </button>

      <div className="sidebar-search mat-cap">
        <SearchIcon size={15} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations"
        />
        <button type="button" onClick={onOpenCommand} aria-label="Open command menu">
          <kbd>⌘K</kbd>
        </button>
      </div>

      <nav className="conversation-list no-bar" aria-label="Conversations">
        {groups.length ? groups.map((group) => (
          <section className="conversation-group" key={group.label}>
            <h2>{group.label}</h2>
            <div>
              {group.conversations.map((conversation) => {
                const active = conversation.id === activeConversationId;
                const lastMessage = conversation.messages.at(-1)?.content || "No messages yet";
                return (
                  <motion.div
                    layout={!reduced}
                    className={`conversation-row${active ? " is-active" : ""}`}
                    key={conversation.id}
                  >
                    <button
                      className="conversation-select"
                      type="button"
                      onClick={() => {
                        selectConversation(conversation.id);
                        onCloseMobile?.();
                      }}
                      disabled={isGenerating && !active}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className="conversation-indicator" aria-hidden="true" />
                      <span className="conversation-copy">
                        <strong>{conversation.title}</strong>
                        <small>{lastMessage}</small>
                      </span>
                      <time>{timeLabel(conversation.updatedAt)}</time>
                    </button>
                    <button
                      className="conversation-delete"
                      type="button"
                      onClick={() => deleteConversation(conversation.id)}
                      disabled={isGenerating}
                      aria-label={`Delete ${conversation.title}`}
                    >
                      <Trash2Icon size={13} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )) : (
          <div className="sidebar-empty">No conversations found</div>
        )}
      </nav>

      <div className="sidebar-footer">
        <button type="button" onClick={onOpenCommand}>
          <SlidersHorizontalIcon size={15} />
          <span>Commands</span>
          <kbd>⌘K</kbd>
        </button>
        <a href="https://github.com/Ryan-yang125/ChatLLM-Web" target="_blank" rel="noreferrer">
          <GithubIcon size={15} />
          <span>GitHub</span>
        </a>
        <button type="button" onClick={toggleTheme}>
          <MonitorIcon size={15} />
          <span>Theme</span>
          <small>{theme}</small>
        </button>
        <div className="privacy-row meta">
          <MessageCircleIcon size={13} />
          LOCAL · PRIVATE
        </div>
      </div>
    </aside>
  );
}
