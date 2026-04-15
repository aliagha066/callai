"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Type a message…",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      160,
    )}px`;
  }, [value]);

  return (
    <div className="border-t border-white/5 bg-black/35 backdrop-blur-xl">
      <div className="mx-auto max-w-4xl px-4 py-4">
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-[rgb(var(--panel))] p-2 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] shadow-[0_0_20px_rgba(99,102,241,0.06)] transition-all duration-200">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl bg-black/20 px-3 py-2 text-sm leading-relaxed text-white placeholder:text-white/35 ring-1 ring-white/10 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />

          <button
            type="button"
            onClick={onSend}
            disabled={disabled || value.trim().length === 0}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white ring-1 ring-white/10 shadow-[0_0_20px_rgba(99,102,241,0.08)] transition-all duration-200 hover:bg-white/14 hover:ring-white/20 hover:brightness-110 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
            title="Send"
          >
            <span className="translate-x-[1px]">↵</span>
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-white/40">
            UI-only prototype. Voice/video, accounts, and saved chats come later.
          </p>
          <p className="hidden text-xs text-white/35 sm:block">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

