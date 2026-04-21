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
      className="fixed inset-0 z-[55] flex min-h-[100dvh] min-w-0 flex-col overflow-x-hidden text-[rgb(var(--fg))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]"
      role="dialog"
      aria-modal="true"
      aria-label={`Call with ${aiName}`}
    >
      {/* “Room” feel — static layers + blur, no video / no canvas */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[rgb(var(--bg))]">
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-indigo-950/35 to-black"
          aria-hidden
        />
        <div
          className="absolute -left-[20%] top-[8%] h-[min(90vw,24rem)] w-[min(90vw,24rem)] rounded-full bg-cyan-500/[0.11] blur-3xl sm:blur-[64px]"
          aria-hidden
        />
        <div
          className="absolute -right-[18%] bottom-[20%] h-[min(80vw,22rem)] w-[min(80vw,22rem)] rounded-full bg-violet-500/[0.14] blur-3xl sm:blur-[64px]"
          aria-hidden
        />
        <div
          className="absolute left-1/2 top-[30%] h-[40vmin] w-[80vmin] -translate-x-1/2 rounded-full bg-indigo-500/[0.08] blur-3xl"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_32%,rgba(99,102,241,0.1),transparent_55%)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_120%_100%_at_50%_100%,rgba(0,0,0,0.5),transparent_50%)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 backdrop-blur-[1px] sm:backdrop-blur-[2px]"
          aria-hidden
        />
      </div>

      <header className="relative z-10 flex shrink-0 items-start justify-center px-4 pt-2 sm:pt-3">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-2.5 text-center shadow-[0_4px_32px_rgba(0,0,0,0.35)] backdrop-blur-md sm:py-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-white/50">
            Call
          </p>
          <p className="mt-0.5 truncate text-base font-semibold tracking-tight text-white/95 sm:text-lg">
            {aiName}
          </p>
          <p className="mt-1 text-[0.7rem] leading-snug text-white/40">
            Voice + UI only · no camera
          </p>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-4 sm:px-5">
        <div className="relative flex w-full max-w-sm flex-col items-center">
          {/* State glow — synced to speaking / thinking / listening */}
          <div
            className={[
              "pointer-events-none absolute inset-[-20%] rounded-full transition-opacity duration-500",
              showWaveform
                ? "opacity-100 bg-[radial-gradient(circle,rgba(var(--accent),0.42)_0%,transparent_70%)] motion-safe:animate-pulse"
                : showThinking
                  ? "opacity-100 bg-[radial-gradient(circle,rgba(250,204,21,0.2)_0%,transparent_70%)] motion-safe:animate-pulse"
                  : showListenRing
                    ? "opacity-100 bg-[radial-gradient(circle,rgba(34,211,238,0.2)_0%,transparent_70%)]"
                    : "opacity-30 bg-[radial-gradient(circle,rgba(99,102,241,0.1)_0%,transparent_68%)]",
            ].join(" ")}
            aria-hidden
          />

          {showListenRing ? (
            <div
              className="callai-listen-orb pointer-events-none absolute inset-[-6%] rounded-full border-2 border-cyan-300/30 bg-cyan-400/[0.04] shadow-[0_0_32px_rgba(34,211,238,0.15)]"
              aria-hidden
            />
          ) : null}

          <div
            className={[
              "relative flex h-[min(56vw,14rem)] w-[min(56vw,14rem)] items-center justify-center rounded-full sm:h-60 sm:w-60",
              "bg-gradient-to-b from-neutral-800/80 via-neutral-900/50 to-indigo-950/40",
              "ring-[1.5px] ring-white/12 transition-[box-shadow,transform] duration-500 motion-reduce:transition-[box-shadow] sm:ring-2",
              showWaveform
                ? "callai-avatar-breathe shadow-[0_0_0_1px_rgba(var(--accent),0.4),0_0_56px_rgba(var(--accent-2),0.4),0_0_100px_rgba(99,102,241,0.12)]"
                : showThinking
                  ? "shadow-[0_0_0_1px_rgba(250,204,21,0.3),0_0_48px_rgba(250,204,21,0.12)]"
                  : showListenRing
                    ? "shadow-[0_0_0_1px_rgba(34,211,238,0.4),0_0_44px_rgba(34,211,238,0.2)]"
                    : "shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_12px_48px_rgba(0,0,0,0.45)]",
            ].join(" ")}
          >
            <div
              className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_85%_70%_at_35%_25%,rgba(255,255,255,0.12),transparent_55%)]"
              aria-hidden
            />
            <div
              className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_90%_90%_at_50%_100%,rgba(0,0,0,0.45),transparent_50%)]"
              aria-hidden
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-indigo-500/10 to-transparent" />
            <div className="relative flex flex-col items-center justify-center gap-1.5">
              <div className="flex w-11 items-center justify-between px-0.5 sm:w-12">
                <span className="h-2 w-2 rounded-full bg-white/90 shadow-[0_0_14px_rgba(99,102,241,0.3)]" />
                <span className="h-2 w-2 rounded-full bg-white/90 shadow-[0_0_14px_rgba(99,102,241,0.3)]" />
              </div>
              <div className="h-2.5 w-7 rounded-b-full border-b-2 border-white/70 opacity-80" />
            </div>
          </div>

          {showWaveform ? (
            <div
              className="mt-8 flex h-9 items-end justify-center gap-1.5 sm:mt-9"
              aria-hidden
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="callai-wave-bar block w-[3px] rounded-full bg-gradient-to-t from-indigo-300/30 to-white/80 sm:w-1.5"
                  style={{ animationDelay: `${i * 75}ms` }}
                />
              ))}
            </div>
          ) : showThinking ? (
            <div
              className="mt-8 flex h-9 items-end justify-center gap-2 sm:mt-9"
              aria-hidden
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="callai-thinking-dot h-2 w-2 rounded-full bg-amber-200/70 motion-safe:animate-pulse"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </div>
          ) : showListenRing ? (
            <div
              className="mt-8 flex h-9 items-end justify-center gap-1.5 sm:mt-9"
              aria-hidden
            >
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="h-1 w-1 rounded-full bg-cyan-300/70 motion-safe:animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 h-9 sm:mt-9" aria-hidden />
          )}

          <p
            className={[
              "mt-4 min-h-[1.4rem] max-w-[19rem] text-center text-xs font-semibold leading-snug tracking-wide text-white/60 transition-opacity duration-200 sm:mt-5 sm:max-w-md sm:text-[0.8rem]",
              statusLine ? "opacity-100" : "text-white/25 opacity-0",
            ].join(" ")}
            aria-live="polite"
          >
            {statusLine ?? "—"}
          </p>
        </div>
      </div>

      <footer className="relative z-10 flex w-full max-w-md shrink-0 items-end justify-center gap-6 self-center px-5 pb-3 sm:gap-8 sm:pb-5">
        <button
          type="button"
          onClick={onToggleAiMute}
          className={[
            "inline-flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full border text-sm font-medium shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition-all duration-200 sm:h-14 sm:w-14",
            aiMuted
              ? "border-amber-400/40 bg-amber-500/20 text-amber-50 ring-2 ring-amber-400/30"
              : "border-white/12 bg-white/[0.08] text-white/90 ring-1 ring-white/8 hover:bg-white/12",
          ].join(" ")}
          aria-label={aiMuted ? "Unmute AI voice" : "Mute AI voice"}
          title={aiMuted ? "Unmute" : "Mute AI"}
        >
          <span className="text-lg leading-none sm:text-xl" aria-hidden>
            {aiMuted ? "\u{1F50A}" : "\u{1F507}"}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleMic}
          className={[
            "inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 text-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-200 sm:h-[4.5rem] sm:w-[4.5rem] sm:text-[1.75rem]",
            userListening
              ? "border-indigo-300/50 bg-indigo-500/30 text-white ring-4 ring-indigo-400/25"
              : "border-white/15 bg-gradient-to-b from-white/15 to-white/[0.07] text-white ring-1 ring-white/10 hover:from-white/18 hover:to-white/10",
          ].join(" ")}
          aria-label={userListening ? "Stop microphone" : "Start microphone"}
          title={
            userListening
              ? "Stop — your message sends next"
              : "Tap to speak"
          }
        >
          {"\u{1F3A4}"}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-gradient-to-b from-red-500/25 to-red-600/20 text-sm font-bold text-red-100 shadow-[0_8px_28px_rgba(220,38,38,0.25)] ring-1 ring-red-500/20 transition-all duration-200 hover:from-red-500/35 hover:to-red-600/30 sm:h-14 sm:w-14"
          aria-label="End call"
          title="End call"
        >
          <span className="text-lg leading-none" aria-hidden>
            ✕
          </span>
        </button>
      </footer>
    </div>
  );
}
