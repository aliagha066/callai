"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  /** Called when the user focuses the composer (keeps it visible when auto-recessed). */
  onComposerInteract?: () => void;
  onVoiceMicToggle?: () => void;
  onVoiceOpenPanelFallback?: () => void;
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
  onComposerInteract,
  onVoiceMicToggle,
  onVoiceOpenPanelFallback,
  voiceListening,
  voiceStatusText,
  voiceStatusKind = "idle",
  disabled,
  placeholder = "Type a message…",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
    <div className="w-full min-w-0 max-w-full overflow-x-hidden border-t border-white/10 bg-gradient-to-t from-black/60 via-black/38 to-black/10 pb-[max(0.35rem,env(safe-area-inset-bottom))] shadow-[0_-10px_32px_rgba(0,0,0,0.32)] backdrop-blur-xl backdrop-saturate-150 sm:from-black/70 sm:via-black/45 sm:to-black/15 sm:pb-[env(safe-area-inset-bottom)] sm:shadow-[0_-18px_48px_rgba(0,0,0,0.42)]">
      <div className="w-full max-w-full overflow-x-hidden px-2.5 sm:px-3">
        <div className="mx-auto w-full max-w-4xl py-2.5 sm:px-1 sm:py-4">
          <form
            className="flex w-full max-w-full min-w-0 flex-col gap-1.5 overflow-x-hidden rounded-[1.125rem] border border-white/10 bg-[rgb(var(--panel))] p-1.5 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] shadow-[0_0_16px_rgba(99,102,241,0.05)] ring-1 ring-black/20 transition-all duration-200 sm:gap-2 sm:rounded-2xl sm:p-2 sm:shadow-[0_0_20px_rgba(99,102,241,0.06)] sm:ring-0"
            onSubmit={handleSubmit}
            onFocusCapture={() => onComposerInteract?.()}
          >
            <div className="flex w-full min-w-0 items-center gap-1.5 sm:gap-2">
              <textarea
                id="callai-composer-textarea"
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                placeholder={placeholder}
                rows={1}
                className="max-h-40 min-h-[44px] w-full max-w-full min-w-0 flex-1 resize-none rounded-xl bg-black/20 px-2.5 py-1.5 text-[16px] leading-relaxed text-white placeholder:text-white/35 ring-1 ring-white/10 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 sm:px-3 sm:py-2 sm:text-sm"
                onFocus={handleFocus}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />

              {onVoiceMicToggle || onVoiceOpenPanelFallback ? (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onPointerDown={() => onComposerInteract?.()}
                    onClick={() => {
                      if (!onVoiceMicToggle) return;
                      if (disabled) return;
                      onVoiceMicToggle();
                    }}
                    onContextMenu={(e) => {
                      if (!onVoiceOpenPanelFallback) return;
                      e.preventDefault();
                      if (disabled) return;
                      onVoiceOpenPanelFallback();
                    }}
                    disabled={disabled}
                    className={[
                      "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-sm font-semibold ring-1 ring-white/10 shadow-[0_0_14px_rgba(99,102,241,0.05)] transition-all duration-200 hover:brightness-110 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11 sm:shadow-[0_0_20px_rgba(99,102,241,0.06)]",
                      voiceStatusKind === "listening"
                        ? "bg-indigo-500/22 text-white ring-indigo-400/40 hover:bg-indigo-500/26"
                        : voiceStatusKind === "working"
                          ? "bg-indigo-500/12 text-white/90 ring-indigo-400/25 hover:bg-indigo-500/14"
                          : voiceStatusKind === "speaking"
                            ? "bg-emerald-500/10 text-white/90 ring-emerald-400/25 hover:bg-emerald-500/12"
                            : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white/90",
                    ].join(" ")}
                    aria-label={voiceListening ? "Stop dictation" : "Start dictation"}
                    title={
                      onVoiceOpenPanelFallback && onVoiceMicToggle
                        ? "Tap: dictate into the message · Long-press: open voice panel"
                        : onVoiceMicToggle
                          ? "Tap: toggle dictation into the message"
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
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white ring-1 ring-white/10 shadow-[0_0_14px_rgba(99,102,241,0.06)] transition-all duration-200 hover:bg-white/14 hover:ring-white/20 hover:brightness-110 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11 sm:shadow-[0_0_20px_rgba(99,102,241,0.08)]"
                aria-label="Send message"
                title="Send"
              >
                <span className="translate-x-[1px]">↵</span>
              </button>
            </div>

            <div
              className={[
                "min-h-[1rem] px-0.5 text-[10px] font-medium leading-tight tabular-nums transition-opacity duration-200 sm:min-h-[1.125rem] sm:px-1 sm:text-[11px]",
                voiceStatusText ? "opacity-100 text-indigo-200/90" : "opacity-0",
              ].join(" ")}
              aria-live={voiceStatusText ? "polite" : "off"}
              aria-hidden={!voiceStatusText}
            >
              {voiceStatusText ?? "—"}
            </div>
          </form>
        </div>

        <div className="mx-auto mt-1.5 hidden w-full max-w-4xl min-w-0 flex-col gap-1 text-xs sm:mt-2 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="min-w-0 text-white/40">
            Type or dictate, then send. Logged in: chats sync to your account. Guest:
            chats stay on this device. Voice works best in Chrome or Edge over HTTPS.
          </p>
          <p className="text-white/35 sm:text-right">
            <span className="hidden sm:inline">Enter to send · Shift+Enter for new line</span>
          </p>
        </div>
      </div>
    </div>
  );
}

