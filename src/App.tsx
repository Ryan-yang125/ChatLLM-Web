import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChatWorkspace } from "@/components/ChatWorkspace";
import { CommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";
import { useChatStore } from "@/store/chat";

export function App() {
  const reduced = useReducedMotion();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const createConversation = useChatStore((state) => state.createConversation);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (command && event.key.toLowerCase() === "n") {
        event.preventDefault();
        createConversation();
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createConversation]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to conversation</a>
      <div className="desktop-sidebar">
        <Sidebar onOpenCommand={() => setCommandOpen(true)} />
      </div>
      <ChatWorkspace
        onOpenCommand={() => setCommandOpen(true)}
        onOpenMobile={() => setMobileOpen(true)}
      />

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="mobile-sidebar-layer"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.16 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setMobileOpen(false);
            }}
          >
            <motion.div
              className="mobile-sidebar-panel"
              initial={reduced ? false : { x: -28 }}
              animate={{ x: 0 }}
              exit={{ x: -28 }}
              transition={{ duration: reduced ? 0 : 0.24, ease: [0.23, 1, 0.32, 1] }}
            >
              <Sidebar
                onOpenCommand={() => {
                  setMobileOpen(false);
                  setCommandOpen(true);
                }}
                onCloseMobile={() => setMobileOpen(false)}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
