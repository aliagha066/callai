"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthUI } from "@/components/AuthUIProvider";
import { supabase } from "@/lib/supabaseClient";

type SettingsRow = {
  user_id: string;
  display_name: string | null;
  ai_name: string | null;
  preferred_language: string | null;
  response_style: string | null;
  updated_at?: string | null;
};

const DEFAULTS = {
  display_name: "",
  ai_name: "Sofia",
  preferred_language: "EN",
  response_style: "friendly",
} as const;

const AI_NAME_CACHE_KEY = "callai.settings.ai_name.v1";

function clampText(value: string, max: number) {
  return value.trim().slice(0, max);
}

export function UserSettingsControls() {
  const { user } = useAuthUI();
  const userId = user?.id ?? null;

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState<string>(DEFAULTS.display_name);
  const [aiName, setAiName] = useState<string>(DEFAULTS.ai_name);
  const [language, setLanguage] = useState<"EN" | "AZ" | "TR">(
    DEFAULTS.preferred_language,
  );
  const [style, setStyle] = useState<"friendly" | "professional" | "casual">(
    DEFAULTS.response_style,
  );

  const isLoggedIn = !!userId;

  const canSave = useMemo(() => {
    if (!isLoggedIn) return false;
    if (!aiName.trim()) return false;
    return true;
  }, [isLoggedIn, aiName]);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;

    async function load() {
      setBusy(true);
      setNotice(null);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;

        if (!data) {
          // No row exists yet: keep defaults; it will be created on save.
          setDisplayName(DEFAULTS.display_name);
          setAiName(DEFAULTS.ai_name);
          setLanguage(DEFAULTS.preferred_language);
          setStyle(DEFAULTS.response_style);
          return;
        }

        const row = data as SettingsRow;
        setDisplayName(row.display_name ?? "");
        setAiName(row.ai_name ?? DEFAULTS.ai_name);
        setLanguage(
          row.preferred_language === "AZ" || row.preferred_language === "TR"
            ? row.preferred_language
            : "EN",
        );
        setStyle(
          row.response_style === "professional" || row.response_style === "casual"
            ? row.response_style
            : "friendly",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load settings";
        setError(msg);
      } finally {
        setBusy(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  if (!isLoggedIn) return null;

  async function onSave() {
    if (!userId) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const nextAiName = clampText(aiName, 40) || DEFAULTS.ai_name;
      const payload = {
        user_id: userId,
        display_name: clampText(displayName, 40) || null,
        ai_name: nextAiName,
        preferred_language: language,
        response_style: style,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("user_settings").upsert(payload);
      if (error) throw error;

      // Lightweight live-update for other UI (e.g. typing indicator).
      try {
        window.localStorage.setItem(AI_NAME_CACHE_KEY, nextAiName);
        window.dispatchEvent(
          new CustomEvent("callai:ai-name-updated", { detail: { aiName: nextAiName } }),
        );
      } catch {
        // ignore
      }

      setNotice("Saved.");
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save settings";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setNotice(null);
          setError(null);
        }}
        className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/70 transition-all duration-200 hover:bg-white/8 hover:text-white/85 hover:brightness-110"
        title="Settings"
      >
        Settings
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[rgb(var(--panel))] shadow-[0_0_30px_rgba(0,0,0,0.55)]">
          <div className="p-4">
            <p className="text-sm font-semibold text-white/85">Settings</p>
            <p className="mt-1 text-xs leading-5 text-white/55">
              Personalize your companion.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-white/60">
                  Display Name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Optional"
                  className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 placeholder:text-white/35 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/60">
                  AI Name
                </label>
                <input
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="Sofia"
                  className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 placeholder:text-white/35 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/60">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) =>
                      setLanguage(e.target.value as "EN" | "AZ" | "TR")
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  >
                    <option value="EN">EN</option>
                    <option value="AZ">AZ</option>
                    <option value="TR">TR</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/60">
                    Response Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) =>
                      setStyle(e.target.value as "friendly" | "professional" | "casual")
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  >
                    <option value="friendly">friendly</option>
                    <option value="professional">professional</option>
                    <option value="casual">casual</option>
                  </select>
                </div>
              </div>
            </div>

            {error ? <p className="mt-3 text-xs text-white/55">{error}</p> : null}
            {notice ? (
              <p className="mt-2 text-xs text-white/55">{notice}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-4 py-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-white/60 transition-colors hover:text-white/80"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={busy || !canSave}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white/10 px-4 text-sm font-semibold text-white/85 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/14 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              title="Save"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

