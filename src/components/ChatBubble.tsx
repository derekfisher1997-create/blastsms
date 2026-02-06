interface ChatBubbleProps {
  direction: "inbound" | "outbound";
  content: string;
  timestamp: string;
  status?: string;
}

export default function ChatBubble({
  direction,
  content,
  timestamp,
  status,
}: ChatBubbleProps) {
  const isOutbound = direction === "outbound";

  return (
    <div
      className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-2`}
    >
      <div
        className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl ${
          isOutbound
            ? "bg-fg text-bg rounded-br-md"
            : "bg-surface-raised border border-edge text-fg rounded-bl-md"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        <div
          className={`flex items-center gap-1.5 mt-1 ${
            isOutbound ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className={`text-[10px] ${
              isOutbound ? "text-bg/50" : "text-fg-dim"
            }`}
          >
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isOutbound && status && (
            <span className="text-[10px] text-bg/40">{status}</span>
          )}
        </div>
      </div>
    </div>
  );
}
