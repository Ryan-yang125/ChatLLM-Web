import { memo, useState, type FC } from "react";
import ReactMarkdown, { type Options } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { ArrowDownIcon, CheckIcon, CopyIcon } from "@/components/icons";
import { useTheme } from "@/components/ThemeProvider";

const MemoMarkdown: FC<Options> = memo(
  ReactMarkdown,
  (previous, next) => previous.children === next.children,
);

const extensions: Record<string, string> = {
  bash: ".sh",
  css: ".css",
  html: ".html",
  javascript: ".js",
  json: ".json",
  jsx: ".jsx",
  markdown: ".md",
  python: ".py",
  rust: ".rs",
  shell: ".sh",
  sql: ".sql",
  swift: ".swift",
  tsx: ".tsx",
  typescript: ".ts",
};

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  const dark = theme === "dark" || (theme === "system" && document.documentElement.dataset.theme === "dark");

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function download() {
    const extension = extensions[language] || ".txt";
    const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chatllm-code${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="code-block">
      <div className="code-toolbar">
        <span className="meta">{language || "TEXT"}</span>
        <div>
          <button type="button" onClick={() => void copy()} aria-label="Copy code">
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
          </button>
          <button type="button" onClick={download} aria-label="Download code">
            <ArrowDownIcon size={14} />
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language}
        style={dark ? vscDarkPlus : oneLight}
        PreTag="div"
        customStyle={{ margin: 0, padding: "16px 18px", background: "transparent", fontSize: 13 }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <MemoMarkdown
      className="markdown"
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ inline, className, children, ...props }) {
          const value = String(children).replace(/\n$/, "");
          const match = /language-(\w+)/.exec(className || "");
          if (!inline) {
            return <CodeBlock language={match?.[1] || ""} value={value} />;
          }
          return <code className={className} {...props}>{children}</code>;
        },
      }}
    >
      {content}
    </MemoMarkdown>
  );
}
