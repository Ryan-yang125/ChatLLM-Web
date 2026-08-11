import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppRouterProvider } from "@/router";
import "@/styles.css";

const root = document.getElementById("root");

if (!root) throw new Error("Missing #root application mount point");

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <AppRouterProvider />
    </ThemeProvider>
  </StrictMode>,
);
