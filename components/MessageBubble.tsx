"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChatMessage } from "@/data/sampleMessages";

type Props = {
  message: ChatMessage;
  autoPlayVoice?: boolean;
};

let currentlySpeakingId: string | null = null;

function getSpeechSynthesis() {
  if (typeof window === "undefined") return null;
  if (!("speechSynthesis" in window)) return null;
  if (!("SpeechSynthesisUtterance" in window)) return null;
  return {
    synth: (window as typeof window & { speechSynthesis: SpeechSynthesis })
      .speechSynthesis,
    Utterance: (window as typeof window & {
      SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance;
    }).SpeechSynthesisUtterance,
  };
}

function detectLang(text: string): string | undefined {
  const asciiLetters = text.match(/[A-Za-z]/g)?.length ?? 0;
  const nonAscii = text.replace(/[A-Za-z\s\d]/g, "").length;
  if (asciiLetters === 0) return undefined;
  if (asciiLetters >= nonAscii * 2) return "en-US";
  return undefined;
}

export function MessageBubble({ message, autoPlayVoice }: Props) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isTyping = message.id === "typing";
  const [playing, setPlaying] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  const ttsSupported = useMemo(() => !!getSpeechSynthesis(), []);

  function stop() {
    const api = getSpeechSynthesis();
    if (!api) return;
    api.synth.cancel();
    currentlySpeakingId = null;
    setPlaying(false);
  }

  function play() {
    const api = getSpeechSynthesis();
    if (!api) return;

    const text = message.content?.trim();
    if (!text) return;

    api.synth.cancel();
    const utter = new api.Utterance(text);
    const lang = detectLang(text);
    if (lang) utter.lang = lang;

    utter.onstart = () => {
      currentlySpeakingId = message.id;
      setPlaying(true);
    };
    utter.onend = () => {
      if (currentlySpeakingId === message.id) {
        currentlySpeakingId = null;
      }
      setPlaying(false);
    };
    utter.onerror = () => {
      if (currentlySpeakingId === message.id) {
        currentlySpeakingId = null;
      }
      setPlaying(false);
    };

    api.synth.speak(utter);
  }

  useEffect(() => {
    return () => {
      if (currentlySpeakingId === message.id) {
        stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAssistant || isTyping) return;
    if (!autoPlayVoice || hasAutoPlayed) return;
    if (!ttsSupported) return;

    play();
    setHasAutoPlayed(true);
    // We deliberately ignore play in deps to avoid retriggering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayVoice, hasAutoPlayed, isAssistant, isTyping, ttsSupported]);

  const showPlay =
    isAssistant && !isTyping && ttsSupported && message.content.trim().length > 0;

  return (
    <div
      className={[
        isUser ? "flex w-full justify-end" : "flex w-full justify-start",
        "min-w-0 max-w-full transition-all duration-200",
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[88%] min-w-0 break-words sm:max-w-[78%]",
          "rounded-2xl px-4 py-3 text-sm leading-relaxed sm:px-[18px] sm:py-[14px] sm:text-[15px]",
          "shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]",
          isUser
            ? "ml-auto mr-1.5 bg-neutral-900 text-white ring-1 ring-white/10 shadow-[0_0_20px_rgba(99,102,241,0.08)] sm:mr-0"
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
        ) : showPlay ? (
          <div className="flex flex-col gap-1.5">
            <div>{message.content}</div>
            <div className="mt-0.5 flex justify-end">
              <button
                type="button"
                onClick={() => (playing ? stop() : play())}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/10 px-2.5 py-1 text-[11px] font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                <span aria-hidden>🔊</span>
                {playing ? "Stop" : "Play"}
              </button>
            </div>
          </div>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}

