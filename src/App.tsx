import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ApprovalModal } from "@/components/beautiful-ui/Primitives";
import { ArtifactPanel } from "@/components/beautiful-ui/AgentComponents";
import { CommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";
import { useChatStore } from "@/store/chat";

export function App({ children }: { children: (openMobile: () => void) => ReactNode }) {
  const reduced = useReducedMotion();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hydrate = useChatStore((state) => state.hydrate);
  const createConversation = useChatStore((state) => state.createConversation);

  useEffect(() => { void hydrate(); }, [hydrate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); }
      if (command && event.key.toLowerCase() === "n") { event.preventDefault(); createConversation(); }
      if (event.key === "Escape") { setCommandOpen(false); setMobileOpen(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createConversation]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="desktop-sidebar"><Sidebar onOpenCommand={() => setCommandOpen(true)} /></div>
      {children(() => setMobileOpen(true))}
      <AnimatePresence>
        {mobileOpen ? <motion.div className="mobile-sidebar-layer" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileOpen(false); }}>
          <motion.div className="mobile-sidebar-panel" initial={reduced ? false : { x: -24 }} animate={{ x: 0 }} exit={{ x: -24 }} transition={{ duration: reduced ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}><Sidebar onOpenCommand={() => { setMobileOpen(false); setCommandOpen(true); }} onCloseMobile={() => setMobileOpen(false)} /></motion.div>
        </motion.div> : null}
      </AnimatePresence>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <ApprovalModal />
      <ArtifactPanel />
    </div>
  );
}
