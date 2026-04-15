"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState<string>("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // For PKCE / code-based magic links, exchange the code for a session.
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        if (cancelled) return;
        router.replace("/chat");
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Login failed";
        setStatus("error");
        setMessage(msg);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-[100svh] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-16">
        <div className="rounded-3xl border border-white/10 bg-[rgb(var(--panel))] p-6">
          <p className="text-sm font-semibold text-white/85">
            {status === "working" ? "One moment" : "Couldn’t sign you in"}
          </p>
          <p className="mt-2 text-sm text-white/60">{message}</p>
          {status === "error" ? (
            <button
              type="button"
              onClick={() => router.replace("/chat")}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80 transition-all duration-200 hover:bg-white/8 hover:brightness-110"
            >
              Back to chat
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

