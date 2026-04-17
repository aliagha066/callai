/** Shared Web Speech (SpeechRecognition) helper.
 *  Kept minimal and defensive because TS lib targets often omit these types.
 */
export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionResultLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorLike) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
};

export type SpeechRecognitionResultLike = {
  results: {
    length: number;
    [index: number]: { 0: { transcript: string }; isFinal?: boolean };
  };
};

export type SpeechRecognitionErrorLike = {
  error: string;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function createSpeechRecognition(opts?: {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
}): SpeechRecognitionLike | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;
  let rec: SpeechRecognitionLike;
  try {
    rec = new Ctor();
  } catch {
    return null;
  }

  rec.continuous = opts?.continuous ?? false;
  rec.interimResults = opts?.interimResults ?? true;
  try {
    rec.lang = opts?.lang ?? navigator.language ?? "en-US";
  } catch {
    rec.lang = "en-US";
  }

  return rec;
}

