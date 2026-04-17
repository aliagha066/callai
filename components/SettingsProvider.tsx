"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthUI } from "@/components/AuthUIProvider";

export type PreferredLanguage = "Auto" | "English" | "Azerbaijani" | "Turkish";
export type CompanionMode = "Friend" | "Coach" | "Calm listener";
export type ResponseStyle = "Short" | "Balanced" | "Deep";
export type VoiceOutputLanguagePreference =
  | "Auto"
  | "English"
  | "Azerbaijani"
  | "Turkish";
export type VoiceSpeechRate = "Slow" | "Normal" | "Fast";

export type UserSettings = {
  displayName: string;
  aiName: string;
  preferredLanguage: PreferredLanguage;
  companionMode: CompanionMode;
  responseStyle: ResponseStyle;
  autoPlayAiVoice: boolean;
  autoSendVoiceMessages: boolean;
  preferredVoiceLanguage: VoiceOutputLanguagePreference;
  voiceSpeechRate: VoiceSpeechRate;
};

const DEFAULT_SETTINGS: UserSettings = {
  displayName: "",
  aiName: "SOFIA",
  preferredLanguage: "Auto",
  companionMode: "Friend",
  responseStyle: "Balanced",
  autoPlayAiVoice: false,
  // Voice modal previously always finalized by sending; keep that as the default
  // when the key is absent from stored settings.
  autoSendVoiceMessages: true,
  preferredVoiceLanguage: "Auto",
  voiceSpeechRate: "Normal",
};

const STORAGE_GUEST_KEY = "callai.settings.guest.v1";

function coerceSettings(input: unknown): UserSettings {
  const s = (input ?? {}) as Partial<UserSettings> & Record<string, unknown>;

  const displayName =
    typeof s.displayName === "string" ? s.displayName.trim() : "";

  const aiNameRaw = typeof s.aiName === "string" ? s.aiName.trim() : "";
  const aiName = aiNameRaw.length ? aiNameRaw : "SOFIA";

  const preferredLanguage =
    s.preferredLanguage === "Auto" ||
    s.preferredLanguage === "English" ||
    s.preferredLanguage === "Azerbaijani" ||
    s.preferredLanguage === "Turkish"
      ? s.preferredLanguage
      : "Auto";

  const companionMode =
    s.companionMode === "Friend" ||
    s.companionMode === "Coach" ||
    s.companionMode === "Calm listener"
      ? s.companionMode
      : "Friend";

  const responseStyle =
    s.responseStyle === "Short" ||
    s.responseStyle === "Balanced" ||
    s.responseStyle === "Deep"
      ? s.responseStyle
      : "Balanced";

  const autoPlayAiVoice =
    typeof s.autoPlayAiVoice === "boolean"
      ? s.autoPlayAiVoice
      : typeof (s as { auto_play_ai_voice?: unknown }).auto_play_ai_voice === "boolean"
        ? (s as { auto_play_ai_voice: boolean }).auto_play_ai_voice
        : DEFAULT_SETTINGS.autoPlayAiVoice;

  const autoSendSnake = (s as { auto_send_voice_messages?: unknown })
    .auto_send_voice_messages;
  const autoSendVoiceMessages =
    typeof s.autoSendVoiceMessages === "boolean"
      ? s.autoSendVoiceMessages
      : typeof autoSendSnake === "boolean"
        ? autoSendSnake
        : DEFAULT_SETTINGS.autoSendVoiceMessages;

  const pvlRaw = s.preferredVoiceLanguage ?? (s as { preferred_voice_language?: unknown }).preferred_voice_language;
  const preferredVoiceLanguage =
    pvlRaw === "Auto" ||
    pvlRaw === "English" ||
    pvlRaw === "Azerbaijani" ||
    pvlRaw === "Turkish"
      ? pvlRaw
      : "Auto";

  const vsrRaw = s.voiceSpeechRate ?? (s as { voice_speech_rate?: unknown }).voice_speech_rate;
  const voiceSpeechRate =
    vsrRaw === "Slow" || vsrRaw === "Normal" || vsrRaw === "Fast"
      ? vsrRaw
      : "Normal";

  return {
    displayName,
    aiName,
    preferredLanguage,
    companionMode,
    responseStyle,
    autoPlayAiVoice,
    autoSendVoiceMessages,
    preferredVoiceLanguage,
    voiceSpeechRate,
  };
}

function loadGuestSettings(): UserSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_GUEST_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return coerceSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveGuestSettings(settings: UserSettings) {
  try {
    window.localStorage.setItem(STORAGE_GUEST_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

type SettingsContextValue = {
  settings: UserSettings;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  save: (next: UserSettings) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthUI();
  const authedUserId = user?.id ?? null;

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isOpen, setIsOpen] = useState(false);

  // Load guest settings once for initial render.
  useEffect(() => {
    setSettings(loadGuestSettings());
  }, []);

  // When auth state changes: load from Supabase if logged in; otherwise revert to guest.
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!authedUserId) {
        setSettings(loadGuestSettings());
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_settings")
          .select(
            "display_name,ai_name,preferred_language,companion_mode,response_style,auto_play_ai_voice,auto_send_voice_messages,preferred_voice_language,voice_speech_rate",
          )
          .eq("user_id", authedUserId)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;

        if (!data) {
          // No row yet: keep defaults (do not write automatically).
          setSettings((prev) => coerceSettings(prev));
          return;
        }

        setSettings(
          coerceSettings({
            displayName: data.display_name ?? "",
            aiName: data.ai_name ?? "SOFIA",
            preferredLanguage: data.preferred_language ?? "Auto",
            companionMode: data.companion_mode ?? "Friend",
            responseStyle: data.response_style ?? "Balanced",
            autoPlayAiVoice:
              typeof (data as { auto_play_ai_voice?: unknown }).auto_play_ai_voice ===
              "boolean"
                ? (data as { auto_play_ai_voice: boolean }).auto_play_ai_voice
                : undefined,
            autoSendVoiceMessages:
              typeof (data as { auto_send_voice_messages?: unknown })
                .auto_send_voice_messages === "boolean"
                ? (data as { auto_send_voice_messages: boolean })
                    .auto_send_voice_messages
                : undefined,
            preferredVoiceLanguage: (data as { preferred_voice_language?: unknown })
              .preferred_voice_language as VoiceOutputLanguagePreference | undefined,
            voiceSpeechRate: (data as { voice_speech_rate?: unknown })
              .voice_speech_rate as VoiceSpeechRate | undefined,
          }),
        );
      } catch {
        // If table doesn't exist or any error: fall back to guest settings safely.
        setSettings(loadGuestSettings());
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [authedUserId]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      save: async (next) => {
        const safe = coerceSettings(next);
        setSettings(safe);

        if (!authedUserId) {
          saveGuestSettings(safe);
          try {
            window.dispatchEvent(new CustomEvent("callai:settings-saved"));
          } catch {
            // ignore
          }
          return;
        }

        // Upsert to Supabase for logged-in users.
        await supabase.from("user_settings").upsert({
          user_id: authedUserId,
          display_name: safe.displayName,
          ai_name: safe.aiName,
          preferred_language: safe.preferredLanguage,
          companion_mode: safe.companionMode,
          response_style: safe.responseStyle,
          auto_play_ai_voice: safe.autoPlayAiVoice,
          auto_send_voice_messages: safe.autoSendVoiceMessages,
          preferred_voice_language: safe.preferredVoiceLanguage,
          voice_speech_rate: safe.voiceSpeechRate,
          updated_at: new Date().toISOString(),
        });
        try {
          window.dispatchEvent(new CustomEvent("callai:settings-saved"));
        } catch {
          // ignore
        }
      },
    }),
    [settings, isOpen, authedUserId],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

