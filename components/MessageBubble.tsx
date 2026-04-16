"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/data/sampleMessages";

type Props = {
  message: ChatMessage;
  autoPlayVoice?: boolean;
};

type TtsLocaleCategory = "en" | "tr" | "az";

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

function normalizeVoiceLang(lang: string): string {
  return lang.trim().replace(/_/g, "-").toLowerCase();
}

function detectLocaleCategory(text: string): TtsLocaleCategory {
  const t = text.trim();
  if (!t) return "en";

  // Azerbaijani Latin: ə / Ə (schwa) is the strongest single-character signal.
  if (/[\u0259\u018F]/.test(t)) return "az";

  const turkishCharCount = (
    t.match(/[\u0131\u0130\u011F\u011E\u00FC\u00DC\u00F6\u00D6\u015F\u015E\u00E7\u00C7]/g) ??
    []
  ).length;
  if (turkishCharCount >= 1) return "tr";

  const lower = t.toLowerCase();
  const asciiTurkishHint =
    /\b(merhaba|teşekk|tesekk|teşekkürler|tesekkurler|hoşgeldin|hosgeldin|güzel|nasilsin|nasılsın|istanbul|türkiye|turkiye|için|icin|değil|degil|böyle|boyle|şöyle|soyle|geliyor|gidiyor|mısın|misin|musun)\b/i.test(
      lower,
    );

  let asciiLetters = 0;
  let unicodeLetters = 0;
  for (const ch of t) {
    if (/[A-Za-z]/.test(ch)) asciiLetters += 1;
    else if (/\p{L}/u.test(ch)) unicodeLetters += 1;
  }
  const totalLetters = asciiLetters + unicodeLetters;

  const mostlyEnglish =
    totalLetters > 0 &&
    !asciiTurkishHint &&
    turkishCharCount === 0 &&
    asciiLetters / totalLetters > 0.88;

  if (mostlyEnglish) return "en";
  if (asciiTurkishHint) return "tr";

  if (totalLetters > 0 && unicodeLetters === 0 && asciiLetters === totalLetters) {
    return "en";
  }

  return "en";
}

function scoreAzVoice(v: SpeechSynthesisVoice): number {
  const lang = normalizeVoiceLang(v.lang || "");
  const name = (v.name || "").toLowerCase();
  let s = 0;
  if (lang.startsWith("az")) s += 100;
  if (lang === "az-az" || /^az-[a-z]{2}$/.test(lang)) s += 25;
  if (name.includes("azerbaijani") || name.includes("azeri")) s += 45;
  return s;
}

function scoreTrVoice(v: SpeechSynthesisVoice): number {
  const lang = normalizeVoiceLang(v.lang || "");
  const name = (v.name || "").toLowerCase();
  let s = 0;
  if (lang.startsWith("tr")) s += 100;
  if (lang.startsWith("tr-tr")) s += 20;
  if (
    name.includes("turkish") ||
    name.includes("t\u00fcrk") ||
    name.includes("turk")
  ) {
    s += 35;
  }
  return s;
}

function scoreEnVoice(v: SpeechSynthesisVoice): number {
  const lang = normalizeVoiceLang(v.lang || "");
  let s = 0;
  if (lang.startsWith("en")) s += 100;
  if (lang.startsWith("en-us")) s += 30;
  if (lang.startsWith("en-gb")) s += 15;
  return s;
}

function pickBestVoices(
  voices: SpeechSynthesisVoice[],
  score: (v: SpeechSynthesisVoice) => number,
): SpeechSynthesisVoice[] {
  let best = -1;
  const out: SpeechSynthesisVoice[] = [];
  for (const v of voices) {
    const s = score(v);
    if (s > best) {
      best = s;
      out.length = 0;
      out.push(v);
    } else if (s === best && s > 0) {
      out.push(v);
    }
  }
  return best > 0 ? out : [];
}

function tieBreakEn(a: SpeechSynthesisVoice, b: SpeechSynthesisVoice): number {
  const la = normalizeVoiceLang(a.lang || "");
  const lb = normalizeVoiceLang(b.lang || "");
  if (la.startsWith("en-us") && !lb.startsWith("en-us")) return -1;
  if (!la.startsWith("en-us") && lb.startsWith("en-us")) return 1;
  return (a.name || "").localeCompare(b.name || "");
}

function tieBreakTr(a: SpeechSynthesisVoice, b: SpeechSynthesisVoice): number {
  const la = normalizeVoiceLang(a.lang || "");
  const lb = normalizeVoiceLang(b.lang || "");
  if (la.startsWith("tr-tr") && !lb.startsWith("tr-tr")) return -1;
  if (!la.startsWith("tr-tr") && lb.startsWith("tr-tr")) return 1;
  return (a.name || "").localeCompare(b.name || "");
}

function tieBreakAz(a: SpeechSynthesisVoice, b: SpeechSynthesisVoice): number {
  const la = normalizeVoiceLang(a.lang || "");
  const lb = normalizeVoiceLang(b.lang || "");
  if (la === "az-az" && lb !== "az-az") return -1;
  if (la !== "az-az" && lb === "az-az") return 1;
  return (a.name || "").localeCompare(b.name || "");
}

function selectVoiceAndLang(
  voices: SpeechSynthesisVoice[],
  category: TtsLocaleCategory,
): { voice: SpeechSynthesisVoice | null; utterLang: string } {
  if (!voices.length) {
    if (category === "en") return { voice: null, utterLang: "en-US" };
    if (category === "tr") return { voice: null, utterLang: "tr-TR" };
    return { voice: null, utterLang: "tr-TR" };
  }

  if (category === "az") {
    const azCandidates = pickBestVoices(voices, scoreAzVoice);
    if (azCandidates.length) {
      azCandidates.sort(tieBreakAz);
      const v = azCandidates[0];
      return { voice: v, utterLang: (v.lang || "az-AZ").replace(/_/g, "-") };
    }
    const trCandidates = pickBestVoices(voices, scoreTrVoice);
    if (trCandidates.length) {
      trCandidates.sort(tieBreakTr);
      const v = trCandidates[0];
      return { voice: v, utterLang: (v.lang || "tr-TR").replace(/_/g, "-") };
    }
    return { voice: null, utterLang: "tr-TR" };
  }

  if (category === "tr") {
    const trCandidates = pickBestVoices(voices, scoreTrVoice);
    if (trCandidates.length) {
      trCandidates.sort(tieBreakTr);
      const v = trCandidates[0];
      return { voice: v, utterLang: (v.lang || "tr-TR").replace(/_/g, "-") };
    }
    return { voice: null, utterLang: "tr-TR" };
  }

  const enCandidates = pickBestVoices(voices, scoreEnVoice);
  if (enCandidates.length) {
    enCandidates.sort(tieBreakEn);
    const v = enCandidates[0];
    return { voice: v, utterLang: (v.lang || "en-US").replace(/_/g, "-") };
  }
  return { voice: null, utterLang: "en-US" };
}

export function MessageBubble({ message, autoPlayVoice }: Props) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isTyping = message.id === "typing";
  const [playing, setPlaying] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  const ttsSupported = useMemo(() => !!getSpeechSynthesis(), []);

  useEffect(() => {
    voicesRef.current = voices;
  }, [voices]);

  useEffect(() => {
    const api = getSpeechSynthesis();
    if (!api) return;
    const { synth } = api;

    function refresh() {
      try {
        const next = synth.getVoices();
        setVoices(next ?? []);
      } catch {
        setVoices([]);
      }
    }

    refresh();
    synth.addEventListener("voiceschanged", refresh);
    return () => {
      synth.removeEventListener("voiceschanged", refresh);
    };
  }, [ttsSupported]);

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

    let list = voicesRef.current;
    try {
      const fresh = api.synth.getVoices();
      if (fresh?.length) list = fresh;
    } catch {
      // ignore
    }

    const category = detectLocaleCategory(text);
    const { voice, utterLang } = selectVoiceAndLang(list, category);

    const utter = new api.Utterance(text);
    utter.lang = utterLang;
    if (voice) utter.voice = voice;

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
                <span aria-hidden className="text-[13px] leading-none">
                  {"\u{1F50A}"}
                </span>
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
