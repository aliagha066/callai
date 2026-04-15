"use client";

import { useMemo, useState } from "react";
import {
  type CompanionMode,
  type PreferredLanguage,
  type ResponseStyle,
  useSettings,
} from "@/components/SettingsProvider";

export function SettingsPanel() {
  const { settings, isOpen, close, save } = useSettings();

  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep draft in sync when opening.
  useMemo(() => {
    if (!isOpen) return;
    setDraft(settings);
    setError(null);
    setBusy(false);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      await save(draft);
      close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn’t save settings";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />
      <div className="absolute right-4 top-20 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-white/10 bg-[rgb(var(--panel))] shadow-[0_0_40px_rgba(0,0,0,0.6)]">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white/90">Settings</p>
              <p className="mt-1 text-xs text-white/55">
                Personalize how your companion responds.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/5 hover:text-white/75"
              title="Close"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-white/60">
                Your name
              </label>
              <input
                value={draft.displayName}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, displayName: e.target.value }))
                }
                placeholder="Optional"
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 placeholder:text-white/35 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/60">AI name</label>
              <input
                value={draft.aiName}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, aiName: e.target.value }))
                }
                placeholder="SOFIA"
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 placeholder:text-white/35 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
              <p className="mt-1 text-[11px] text-white/40">
                If empty, we’ll use “SOFIA”.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-white/60">
                  Preferred language
                </label>
                <select
                  value={draft.preferredLanguage}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      preferredLanguage: e.target.value as PreferredLanguage,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                >
                  <option value="Auto">Auto</option>
                  <option value="English">English</option>
                  <option value="Azerbaijani">Azerbaijani</option>
                  <option value="Turkish">Turkish</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/60">
                  Companion mode
                </label>
                <select
                  value={draft.companionMode}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      companionMode: e.target.value as CompanionMode,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                >
                  <option value="Friend">Friend</option>
                  <option value="Coach">Coach</option>
                  <option value="Calm listener">Calm listener</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/60">
                Response style
              </label>
              <select
                value={draft.responseStyle}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    responseStyle: e.target.value as ResponseStyle,
                  }))
                }
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              >
                <option value="Short">Short</option>
                <option value="Balanced">Balanced</option>
                <option value="Deep">Deep</option>
              </select>
            </div>
          </div>

          {error ? <p className="mt-3 text-xs text-white/55">{error}</p> : null}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-4 py-3">
          <button
            type="button"
            onClick={close}
            className="text-xs font-semibold text-white/60 transition-colors hover:text-white/80"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-white/10 px-4 text-sm font-semibold text-white/85 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/14 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

