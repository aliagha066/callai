"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onVoicePressStart?: () => void;
  onVoicePressEnd?: () => void;
  onVoiceTapFallback?: () => void;
  voiceListening?: boolean;
  voiceStatusText?: string | null;
  voiceStatusKind?: "idle" | "listening" | "working" | "speaking";
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  onVoicePressStart,
  onVoicePressEnd,
  onVoiceTapFallback,
  voiceListening,
  voiceStatusText,
  voiceStatusKind = "idle",
  disabled,
  placeholder = "Type a message…",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pttActiveRef = useRef(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    if (value.trim().length === 0) return;
    onSend();
  }

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      160,
    )}px`;
  }, [value]);

  function handleFocus() {
    if (typeof window === "undefined") return;
    const el = textareaRef.current;
    if (!el) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) return;

    // Defer slightly so the virtual keyboard has time to animate.
    window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden border-t border-white/5 bg-black/35 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-full overflow-x-hidden px-3">
        <div className="mx-auto w-full max-w-4xl py-4 sm:px-1 sm:py-4">
          <form
            className="flex w-full max-w-full min-w-0 flex-col gap-2 overflow-x-hidden rounded-2xl border border-white/10 bg-[rgb(var(--panel))] p-2 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] shadow-[0_0_20px_rgba(99,102,241,0.06)] transition-all duration-200"
            onSubmit={handleSubmit}
          >
            <div className="flex w-full min-w-0 items-center gap-2">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                placeholder={placeholder}
                rows={1}
                className="max-h-40 min-h-[44px] w-full max-w-full min-w-0 flex-1 resize-none rounded-xl bg-black/20 px-3 py-2 text-[16px] leading-relaxed text-white placeholder:text-white/35 ring-1 ring-white/10 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 sm:text-sm"
                onFocus={handleFocus}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />

              {onVoicePressStart || onVoiceTapFallback ? (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      if (!onVoicePressStart) return;
                      if (disabled) return;
                      // Push-to-talk: press = start listening.
                      pttActiveRef.current = true;
                      try {
                        (e.currentTarget as HTMLButtonElement).setPointerCapture(
                          e.pointerId,
                        );
                      } catch {
                        // ignore
                      }
                      e.preventDefault();
                      onVoicePressStart();
                    }}
                    onPointerUp={(e) => {
                      if (!onVoicePressEnd) return;
                      if (!pttActiveRef.current) return;
                      pttActiveRef.current = false;
                      try {
                        (e.currentTarget as HTMLButtonElement).releasePointerCapture(
                          e.pointerId,
                        );
                      } catch {
                        // ignore
                      }
                      e.preventDefault();
                      // Release = stop listening (existing flow continues: processing/sending).
                      onVoicePressEnd();
                    }}
                    onPointerCancel={() => {
                      if (!onVoicePressEnd) return;
                      if (!pttActiveRef.current) return;
                      pttActiveRef.current = false;
                      onVoicePressEnd();
                    }}
                    onClick={() => {
                      // Pointer up triggers click; ignore those.
                      if (pttActiveRef.current) return;
                      if (!onVoiceTapFallback) return;
                      if (disabled) return;
                      onVoiceTapFallback();
                    }}
                    disabled={disabled}
                    className={[
                      "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-sm font-semibold ring-1 ring-white/10 shadow-[0_0_20px_rgba(99,102,241,0.06)] transition-all duration-200 hover:brightness-110 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50",
                      voiceStatusKind === "listening"
                        ? "bg-indigo-500/22 text-white ring-indigo-400/40 hover:bg-indigo-500/26"
                        : voiceStatusKind === "working"
                          ? "bg-indigo-500/12 text-white/90 ring-indigo-400/25 hover:bg-indigo-500/14"
                          : voiceStatusKind === "speaking"
                            ? "bg-emerald-500/10 text-white/90 ring-emerald-400/25 hover:bg-emerald-500/12"
                            : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white/90",
                    ].join(" ")}
                    aria-label={voiceListening ? "Stop voice input" : "Voice input"}
                    title={
                      onVoicePressStart
                        ? "Hold to talk"
                        : "Voice input"
                    }
                  >
                    <span className="text-[18px] leading-none">{"\u{1F3A4}"}</span>
                  </button>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={disabled || value.trim().length === 0}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white ring-1 ring-white/10 shadow-[0_0_20px_rgba(99,102,241,0.08)] transition-all duration-200 hover:bg-white/14 hover:ring-white/20 hover:brightness-110 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
                title="Send"
              >
                <span className="translate-x-[1px]">↵</span>
              </button>
            </div>

            <div
              className={[
                "min-h-[1.125rem] px-1 text-[11px] font-medium leading-tight tabular-nums transition-opacity duration-200",
                voiceStatusText ? "opacity-100 text-indigo-200/90" : "opacity-0",
              ].join(" ")}
              aria-live={voiceStatusText ? "polite" : "off"}
              aria-hidden={!voiceStatusText}
            >
              {voiceStatusText ?? "—"}
            </div>
          </form>
        </div>

        <div className="mx-auto w-full max-w-4xl mt-2 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="min-w-0 text-xs text-white/40">
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

