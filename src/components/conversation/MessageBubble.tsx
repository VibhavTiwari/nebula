import type { ConversationMessage } from "@/types/workstream";
import clsx from "clsx";

interface Props {
  message: ConversationMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={clsx("mb-4 flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={clsx(
          "max-w-[80%] rounded-lg px-4 py-3",
          isUser && "bg-nebula-600 text-white",
          !isUser && !isSystem && "bg-surface-2 text-surface-dark-0",
          isSystem && "bg-yellow-50 text-yellow-800 border border-yellow-200"
        )}
      >
        {/* Agent indicator */}
        {message.agentName && (
          <div className="text-xs font-medium mb-1 opacity-70">
            {message.agentName}
          </div>
        )}

        {/* Message content */}
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {renderContent(message.content)}
        </div>

        {/* Timestamp */}
        <div
          className={clsx(
            "text-xs mt-1.5",
            isUser ? "text-white/60" : "text-surface-dark-4"
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function renderContent(content: string): React.ReactNode {
  // Simple markdown-like rendering for bold text and code blocks
  const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1 py-0.5 bg-black/10 rounded text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
