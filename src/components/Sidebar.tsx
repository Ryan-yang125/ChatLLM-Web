import { useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Brand } from "@/components/Brand";
import {
  ArrowLeftIcon,
  ComponentIcon,
  GithubIcon,
  LanguagesIcon,
  MessageCircleIcon,
  MonitorIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "@/components/icons";
import { useTheme } from "@/components/ThemeProvider";
import { groupConversations, timeLabel } from "@/lib/chat-utils";
import { useChatStore } from "@/store/chat";

export function Sidebar({ onOpenCommand, onCloseMobile }: { onOpenCommand: () => void; onCloseMobile?: () => void }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const state = useChatStore();
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groupConversations(needle
      ? state.conversations.filter((conversation) => conversation.title.toLowerCase().includes(needle))
      : state.conversations);
  }, [query, state.conversations]);

  function toggleTheme() {
    const dark = document.documentElement.dataset.theme === "dark";
    const next = dark ? "light" : "dark";
    setTheme(next);
    state.setThemePreference(next);
  }

  return (
    <aside className="sidebar" aria-label="ChatLLM navigation">
      <div className="sidebar-brand-row"><Brand />{onCloseMobile ? <button className="icon-button mobile-close" onClick={onCloseMobile} aria-label="Close navigation"><ArrowLeftIcon size={16} /></button> : null}</div>
      <button className="new-chat-button" type="button" disabled={state.isGenerating} onClick={() => { state.createConversation(); onCloseMobile?.(); }}><PlusIcon size={15} /><span>{t("nav.newChat")}</span><kbd>⌘N</kbd></button>

      <nav className="primary-nav" aria-label="Primary">
        <Link to="/" activeProps={{ className: "is-active" }} onClick={onCloseMobile}><MessageCircleIcon size={15} /><span>Chat</span></Link>
        <Link to="/models" activeProps={{ className: "is-active" }} onClick={onCloseMobile}><ComponentIcon size={15} /><span>{t("nav.models")}</span><i className={`status-dot is-${state.runtimePhase}`} /></Link>
      </nav>

      <div className="sidebar-search"><SearchIcon size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /><button onClick={onOpenCommand}><kbd>⌘K</kbd></button></div>

      <div className="sidebar-section-label"><span>{t("nav.conversations")}</span><small>{state.conversations.length}</small></div>
      <nav className="conversation-list" aria-label={t("nav.conversations")}>
        {groups.map((group) => (
          <section className="conversation-group" key={group.label}>
            <h2>{group.label}</h2>
            {group.conversations.map((conversation) => {
              const active = conversation.id === state.activeConversationId && pathname === "/";
              return (
                <motion.div layout={!reduced} className={`conversation-row${active ? " is-active" : ""}`} key={conversation.id}>
                  <Link className="conversation-select" to="/" onClick={() => { state.selectConversation(conversation.id); onCloseMobile?.(); }}>
                    <span className="conversation-indicator" />
                    <span className="conversation-copy"><strong>{conversation.title}</strong><small>{conversation.messages.at(-1)?.content || "No messages yet"}</small></span>
                    <time>{timeLabel(conversation.updatedAt)}</time>
                  </Link>
                  <button className="conversation-delete" type="button" disabled={state.isGenerating} onClick={() => state.deleteConversation(conversation.id)} aria-label={`Delete ${conversation.title}`}><Trash2Icon size={13} /></button>
                </motion.div>
              );
            })}
          </section>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" onClick={() => state.setLanguage(state.preferences.language === "en" ? "zh" : "en")}><LanguagesIcon size={15} /><span>{t("nav.language")}</span><small>{state.preferences.language === "en" ? "EN" : "中文"}</small></button>
        <button type="button" onClick={toggleTheme}><MonitorIcon size={15} /><span>{t("nav.theme")}</span><small>{theme}</small></button>
        <a href="https://github.com/Ryan-yang125/ChatLLM-Web" target="_blank" rel="noreferrer"><GithubIcon size={15} /><span>{t("nav.github")}</span></a>
        <div className="privacy-row"><ShieldLabel /></div>
      </div>
    </aside>
  );
}

function ShieldLabel() {
  return <><span className="privacy-dot" />LOCAL · PRIVATE</>;
}
