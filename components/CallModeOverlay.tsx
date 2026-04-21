"use client";

type Props = {
  open: boolean;
  aiName: string;
  /** Model / network in progress (Call Mode) */
  isThinking: boolean;
  /** AI text-to-speech is actively playing */
  aiSpeaking: boolean;
  /** User mic dictation session is active */
  userListening: boolean;
  /** Recognition settling / processing (not “thinking” — that is isThinking) */
  userWorking: boolean;
  /** When true, new AI replies will not auto-speak (no webcam / stream) */
  aiMuted: boolean;
  onClose: () => void;
  onToggleMic: () => void;
  onToggleAiMute: () => void;
  statusLine: string | null;
};

export function CallModeOverlay({
  open,
  aiName,
  isThinking,
  aiSpeaking,
  userListening,
  userWorking,
  aiMuted,
  onClose,
  onToggleMic,
  onToggleAiMute,
  statusLine,
}: Props) {
  if (!open) return null;

  const showSpeaking = aiSpeaking && !aiMuted;
  const showThinking = isThinking && !showSpeaking;
  const showListenRing =
    (userListening || userWorking) && !showThinking && !showSpeaking;
  const showWaveform = showSpeaking;

  return (
    <div
      className="fixed inset-0 z-[55] flex flex-col bg-[rgb(var(--bg))] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
      role="dialog"
      aria-modal="true"
      aria-label={`Call with ${aiName}`}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3 sm:px-5 sm:pt-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white/90">Call</p>
          <p className="truncate text-xs text-white/45">Voice + UI only · no video</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-red-400/25 bg-red-500/10 px-4 text-xs font-semibold text-red-100/90 ring-1 ring-red-400/15 transition-colors hover:bg-red-500/16"
          aria-label="End call"
          title="End call"
        >
          End
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
        <div className="relative flex flex-col items-center">
          <div
            className={[
              "pointer-events-none absolute inset-[-18%] rounded-full transition-opacity duration-300",
              showWaveform
                ? "opacity-100 bg-[radial-gradient(circle,rgba(var(--accent),0.35)_0%,transparent_68%)] motion-safe:animate-pulse"
                : showThinking
                  ? "opacity-95 bg-[radial-gradient(circle,rgba(250,204,21,0.18)_0%,transparent_68%)] motion-safe:animate-pulse"
                  : showListenRing
                    ? "opacity-90 bg-[radial-gradient(circle,rgba(56,189,248,0.22)_0%,transparent_70%)] motion-safe:animate-pulse"
                    : "opacity-0",
            ].join(" ")}
            aria-hidden
          />

          <div
            className={[
              "relative flex h-[min(52vw,13.5rem)] w-[min(52vw,13.5rem)] items-center justify-center rounded-full bg-gradient-to-b from-neutral-900/70 via-neutral-900/35 to-indigo-500/15 ring-2 transition-[box-shadow,transform] duration-300 motion-reduce:transition-none sm:h-56 sm:w-56",
              showWaveform
                ? "shadow-[0_0_0_1px_rgba(var(--accent),0.35),0_0_48px_rgba(var(--accent-2),0.35)] motion-safe:scale-[1.02]"
                : showThinking
                  ? "shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_40px_rgba(250,204,21,0.14)]"
                  : showListenRing
                    ? "shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_0_36px_rgba(56,189,248,0.2)]"
                    : "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_24px_rgba(99,102,241,0.12)]",
            ].join(" ")}
          >
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(var(--accent),0.2),transparent_60%)]" />
            <div className="relative flex flex-col items-center justify-center gap-1">
              <div className="flex w-10 items-center justify-between px-0.5 sm:w-11">
                <span className="h-1.5 w-1.5 rounded-full bg-white/90 shadow-[0_0_12px_rgba(99,102,241,0.2)]" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/90 shadow-[0_0_12px_rgba(99,102,241,0.2)]" />
              </div>
              <div className="h-2 w-6 rounded-b-full border-b-2 border-white/65 opacity-70" />
            </div>
          </div>

          {showWaveform ? (
            <div
              className="mt-7 flex h-8 items-end justify-center gap-1 sm:mt-8"
              aria-hidden
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="callai-wave-bar block w-1 rounded-full bg-white/50 sm:w-1.5"
                  style={{ animationDelay: `${i * 90}ms` }}
                />
              ))}
            </div>
          ) : showThinking ? (
            <div
              className="mt-7 flex h-8 items-end justify-center gap-1.5 sm:mt-8"
              aria-hidden
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="callai-thinking-dot h-1.5 w-1.5 rounded-full bg-amber-200/60 motion-safe:animate-pulse"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </div>
          ) : (
            <div className="mt-7 h-8 sm:mt-8" aria-hidden />
          )}

          <p className="mt-3 max-w-[16rem] text-center text-sm font-medium text-white/80 sm:mt-4 sm:max-w-xs">
            {aiName}
          </p>
          <p
            className={[
                "mt-1 min-h-[1.25rem] text-center text-[11px] font-semibold leading-snug tracking-wide text-white/55 transition-opacity duration-200 sm:text-xs",
                statusLine ? "opacity-100" : "text-white/30 opacity-0",
            ].join(" ")}
            aria-live="polite"
          >
            {statusLine ?? "—"}
          </p>
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-center gap-4 px-4 pb-4 sm:gap-6 sm:pb-6">
        <button
          type="button"
          onClick={onToggleMic}
          className={[
            "inline-flex h-14 w-14 items-center justify-center rounded-full border text-lg shadow-lg transition-all duration-200 sm:h-[3.75rem] sm:w-[3.75rem] sm:text-xl",
            userListening
              ? "border-indigo-400/40 bg-indigo-500/25 text-white ring-2 ring-indigo-400/35"
              : "border-white/15 bg-white/10 text-white/90 ring-1 ring-white/10 hover:bg-white/14",
          ].join(" ")}
          aria-label={userListening ? "Stop microphone" : "Start microphone"}
          title={
            userListening
              ? "Stop — what you said will be sent"
              : "Speak — message sends when you stop"
          }
        >
          {"\u{1F3A4}"}
        </button>

        <button
          type="button"
          onClick={onToggleAiMute}
          className={[
            "inline-flex h-14 w-14 items-center justify-center rounded-full border text-sm font-semibold shadow-lg transition-all duration-200 sm:h-[3.75rem] sm:w-[3.75rem]",
            aiMuted
              ? "border-amber-400/35 bg-amber-500/15 text-amber-100/90 ring-2 ring-amber-400/25"
              : "border-white/15 bg-white/10 text-white/85 ring-1 ring-white/10 hover:bg-white/14",
          ].join(" ")}
          aria-label={aiMuted ? "Unmute AI voice" : "Mute AI voice"}
          title={aiMuted ? "Unmute AI voice" : "Mute AI voice"}
        >
          <span className="text-lg leading-none sm:text-xl" aria-hidden>
            {aiMuted ? "\u{1F50A}" : "\u{1F507}"}
          </span>
        </button>
      </footer>
    </div>
  );
}
