"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthUI } from "@/components/AuthUIProvider";

type Props = {
  compact?: boolean;
};

export function AuthControls({ compact }: Props) {
  const { user, loginOpen: open, setLoginOpen: setOpen } = useAuthUI();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "magic">("login");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayEmail = useMemo(() => user?.email || "Logged in", [user]);

  async function sendMagicLink() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email.");
      return;
    }
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });
      if (error) throw error;
      setNotice("Check your email for a magic link.");
      setEmail("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Login failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function loginWithPassword() {
    const trimmed = email.trim();
    const pw = password;
    if (!trimmed) {
      setError("Enter your email.");
      return;
    }
    if (!pw) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password: pw,
      });
      if (error) throw error;
      setOpen(false);
      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Login failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function signUpWithPassword() {
    const trimmed = email.trim();
    const pw = password;
    const cpw = confirmPassword;

    if (!trimmed) {
      setError("Enter your email.");
      return;
    }
    if (!pw) {
      setError("Create a password.");
      return;
    }
    if (pw.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (cpw !== pw) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmed,
        password: pw,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });
      if (error) throw error;

      // If confirmation is required, user may not be immediately available.
      if (!data.session) {
        setNotice("Account created. Please confirm via the email we sent you.");
      } else {
        setNotice("Welcome — you’re signed in.");
        setOpen(false);
      }

      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign up failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Logout failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-[220px] truncate text-sm font-medium text-white/70 sm:inline">
          {displayEmail}
        </span>
        <button
          type="button"
          onClick={logout}
          disabled={busy}
          className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/70 transition-all duration-200 hover:bg-white/8 hover:text-white/85 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          title="Logout"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setNotice(null);
          setError(null);
        }}
        className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/70 transition-all duration-200 hover:bg-white/8 hover:text-white/85 hover:brightness-110"
        title="Login"
      >
        Login
      </button>

      {open ? (
        <div
          className={[
            "absolute z-50 mt-2 w-[calc(100vw-24px)] max-w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[rgb(var(--panel))] shadow-[0_0_30px_rgba(0,0,0,0.55)]",
            "left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 sm:max-w-none",
            compact ? "sm:w-[300px]" : "sm:w-[320px]",
          ].join(" ")}
        >
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white/85">
                {mode === "signup" ? "Create account" : "Sign in"}
              </p>
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setNotice(null);
                    setError(null);
                  }}
                  className={[
                    "h-7 rounded-full px-3 text-xs font-semibold transition-colors",
                    mode === "login"
                      ? "bg-white/10 text-white/85"
                      : "text-white/55 hover:text-white/75",
                  ].join(" ")}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setNotice(null);
                    setError(null);
                  }}
                  className={[
                    "h-7 rounded-full px-3 text-xs font-semibold transition-colors",
                    mode === "signup"
                      ? "bg-white/10 text-white/85"
                      : "text-white/55 hover:text-white/75",
                  ].join(" ")}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 placeholder:text-white/35 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />

              {mode === "magic" ? null : (
                <>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    type="password"
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 placeholder:text-white/35 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  />
                  {mode === "signup" ? (
                    <input
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      type="password"
                      className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 placeholder:text-white/35 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                    />
                  ) : null}
                </>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              {mode === "magic" ? (
                <button
                  type="button"
                  onClick={sendMagicLink}
                  disabled={busy}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-white/10 px-4 text-sm font-semibold text-white/85 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/14 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Send magic link"
                >
                  Send magic link
                </button>
              ) : mode === "signup" ? (
                <button
                  type="button"
                  onClick={signUpWithPassword}
                  disabled={busy}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-white/10 px-4 text-sm font-semibold text-white/85 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/14 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Create account"
                >
                  Create account
                </button>
              ) : (
                <button
                  type="button"
                  onClick={loginWithPassword}
                  disabled={busy}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-white/10 px-4 text-sm font-semibold text-white/85 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/14 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Login"
                >
                  Login
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === "magic" ? "login" : "magic"));
                  setNotice(null);
                  setError(null);
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="text-xs font-semibold text-white/60 transition-colors hover:text-white/80"
              >
                {mode === "magic" ? "Use password instead" : "Use magic link instead"}
              </button>
              <span className="text-[11px] text-white/35">Guest mode stays available</span>
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
            >
              Close
            </button>
            <span className="text-[11px] text-white/35">UI-only. No DB yet.</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

