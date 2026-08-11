export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup">
      <img src="/brand/chatllm-mark.png" alt="" className="brand-mark" />
      {compact ? null : <span>ChatLLM</span>}
    </span>
  );
}
