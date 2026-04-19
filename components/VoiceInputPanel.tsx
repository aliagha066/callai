"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSpeechRecognition,
  getSpeechRecognitionCtor,
  type SpeechRecognitionErrorLike,
  type SpeechRecognitionLike,
  type SpeechRecognitionResultLike,
} from "./speechRecognition";
import { useSettings } from "@/components/SettingsProvider";

type Props = {
  onClose: () => void;
  onUseText: (text: string) => void;
  onSend?: () => void;
};

export function VoiceInputPanel({ onClose, onUseText, onSend }: Props) {
  const { settings } = useSettings();
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [supported] = useState(() => !!getSpeechRecognitionCtor());
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [autoSend, setAutoSend] = useState(settings.autoSendVoiceMessages);
  const [preview, setPreview] = useState("");
  const previewRef = useRef("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stoppedHint, setStoppedHint] = useState(false);
  const stoppedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRecognition = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      try {
        rec.abort();
      } catch {
        // ignore
      }
    }
    recRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopRecognition();
      if (stoppedTimerRef.current) {
        clearTimeout(stoppedTimerRef.current);
        stoppedTimerRef.current = null;
      }
    };
  }, [stopRecognition]);

  useEffect(() => {
    setAutoSend(settings.autoSendVoiceMessages);
  }, [settings.autoSendVoiceMessages]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const applyPreviewToComposer = useCallback(
    (text: string, shouldSend: boolean) => {
      const t = text.trim();
      if (!t) return;
      onUseText(t);
      if (shouldSend && onSend) {
        setSending(true);
        // Fire send, then close the panel. Chat logic remains unchanged.
        try {
          onSend();
        } finally {
          setSending(false);
          onClose();
        }
      }
    },
    [onClose, onSend, onUseText],
  );

  const statusText = (() => {
    if (!supported) return "Speech recognition not supported";
    if (errorMessage) return errorMessage;
    if (stoppedHint) return "Stopped";
    if (sending) return "Sending...";
    if (listening) return "Listening...";
    if (processing) return "Processing...";
    return "Ready — tap the microphone to speak";
  })();

  function handleStart() {
    setStoppedHint(false);
    if (stoppedTimerRef.current) {
      clearTimeout(stoppedTimerRef.current);
      stoppedTimerRef.current = null;
    }
    setErrorMessage(null);
    stopRecognition();
    const rec = createSpeechRecognition({
      continuous: true,
      interimResults: true,
    });
    if (!rec) return;

    rec.onresult = (event: SpeechRecognitionResultLike) => {
      let transcript = "";
      const results = event.results;
      for (let i = 0; i < results.length; i++) {
        transcript += results[i]?.[0]?.transcript ?? "";
      }
      const trimmed = transcript.trim();
      previewRef.current = trimmed;
      setPreview(trimmed);
    };

    rec.onerror = (event: SpeechRecognitionErrorLike) => {
      if (event.error === "aborted") return;
      if (event.error === "no-speech") return;

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        setErrorMessage("Microphone access denied");
        setListening(false);
        setProcessing(false);
        recRef.current = null;
        return;
      }

      if (event.error === "audio-capture") {
        setErrorMessage("Microphone access denied");
        setListening(false);
        setProcessing(false);
        recRef.current = null;
        return;
      }

      setListening(false);
      setProcessing(false);
      recRef.current = null;
    };

    rec.onstart = () => {
      setListening(true);
      setProcessing(false);
    };

    rec.onend = () => {
      setListening(false);
      setProcessing(false);
      recRef.current = null;

      if (autoSend) {
        const latest = previewRef.current.trim();
        if (latest) {
          applyPreviewToComposer(latest, true);
        }
      }
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setErrorMessage("Could not start speech recognition.");
      setListening(false);
      setProcessing(false);
      recRef.current = null;
    }
  }

  function handleStop() {
    if (stoppedTimerRef.current) {
      clearTimeout(stoppedTimerRef.current);
      stoppedTimerRef.current = null;
    }
    setStoppedHint(true);
    stoppedTimerRef.current = setTimeout(() => {
      setStoppedHint(false);
      stoppedTimerRef.current = null;
    }, 1400);

    if (!recRef.current) {
      setListening(false);
      return;
    }
    setProcessing(true);
    try {
      recRef.current.stop();
    } catch {
      setProcessing(false);
      stopRecognition();
    }
  }

  function handleUseText() {
    const t = preview.trim();
    if (!t) return;
    applyPreviewToComposer(t, false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[61] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Voice input"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(85vh,36rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgb(var(--panel))] shadow-[0_0_40px_rgba(0,0,0,0.6)]">
        <div className="shrink-0 border-b border-white/10 px-4 py-3">
          <p className="text-sm font-semibold text-white/85">Voice input</p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            {statusText}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
          {!supported ? (
            <p className="text-sm leading-6 text-white/60">
              This browser does not expose speech recognition (or it is blocked).
              Try Chrome or Edge on desktop or Android, ensure a secure (HTTPS)
              page, and check site permissions — you can still type your message
              below.
            </p>
          ) : (
            <>
              <label className="text-xs font-semibold text-white/55">
                Preview
              </label>
              <div className="mt-1 min-h-[5rem] max-h-[min(28vh,12rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-relaxed text-white/80 ring-1 ring-white/5">
                {preview ? (
                  <p className="whitespace-pre-wrap break-words">{preview}</p>
                ) : (
                  <p className="text-white/40">Spoken text will appear here.</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={listening || !supported}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white/85 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/14 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 min-[360px]:flex-none"
                  title="Start microphone"
                >
                  <span aria-hidden className="text-base leading-none">
                    {"\u{1F3A4}"}
                  </span>
                  Start
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={!listening}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/75 transition-all duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 min-[360px]:flex-none"
                  title="Stop"
                >
                  Stop
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-white/65">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border border-white/25 bg-black/40 text-indigo-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                    checked={autoSend}
                    onChange={(e) => setAutoSend(e.target.checked)}
                  />
                  <span>Auto-send after dictation</span>
                </label>
              </div>

              <p className="mt-1 text-[11px] leading-relaxed text-white/35">
                Quick toggle for this panel only — default lives in Settings → Voice.
              </p>

              <p className="mt-2 text-[11px] leading-relaxed text-white/40">
                {autoSend
                  ? "We’ll send the recognized text automatically when you stop speaking."
                  : "Text is not sent automatically — review it in the message box, then send when you are ready."}
              </p>
            </>
          )}
        </div>

        <div className="shrink-0 space-y-2 border-t border-white/10 p-4">
          {supported ? (
            <button
              type="button"
              onClick={handleUseText}
              disabled={!preview.trim()}
              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-white/10 px-4 text-sm font-semibold text-white/85 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/14 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Use text in message
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/70 transition-all duration-200 hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

