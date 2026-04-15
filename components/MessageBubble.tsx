import type { ChatMessage } from "@/data/sampleMessages";

type Props = {
  message: ChatMessage;
};

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isTyping = message.id === "typing";

  return (
    <div
      className={[
        isUser ? "flex justify-end" : "flex justify-start",
        "transition-all duration-200",
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[92%] sm:max-w-[78%]",
          "rounded-2xl px-4 py-3 text-sm leading-relaxed sm:px-[18px] sm:py-[14px] sm:text-[15px]",
          "shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]",
          isUser
            ? "bg-neutral-900 text-white ring-1 ring-white/10 shadow-[0_0_20px_rgba(99,102,241,0.08)]"
            : [
                "border border-white/10 bg-neutral-800/70 text-neutral-200 shadow-[0_0_20px_rgba(99,102,241,0.06)]",
                isTyping ? "opacity-75" : "",
              ].join(" "),
        ].join(" ")}
      >
        {isTyping ? (
          <span className="inline-flex items-center gap-1.5">
            <span>{message.content}</span>
            <span className="inline-flex items-center gap-1 opacity-70">
              <span className="h-1 w-1 rounded-full bg-neutral-200/70 animate-pulse [animation-delay:0ms]" />
              <span className="h-1 w-1 rounded-full bg-neutral-200/70 animate-pulse [animation-delay:150ms]" />
              <span className="h-1 w-1 rounded-full bg-neutral-200/70 animate-pulse [animation-delay:300ms]" />
            </span>
          </span>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}

