import Link from "next/link";
import { AuthNavbarArea } from "@/components/AuthNavbarArea";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[rgb(var(--bg))]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 max-sm:h-auto max-sm:flex-wrap max-sm:py-2">
        <Link
          href="/"
          className="group relative inline-flex min-w-0 max-w-full items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-white/5"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-y-3 -left-2 -right-10 -z-10 rounded-full bg-[radial-gradient(70%_120%_at_30%_50%,rgba(99,102,241,0.14),transparent_62%)] blur-2xl"
          />
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-neutral-900/60 via-neutral-900/30 to-indigo-500/10 ring-1 ring-white/10 shadow-[inset_0_-10px_18px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.10),0_0_22px_rgba(99,102,241,0.14)] transition-all duration-200 group-hover:brightness-110 group-hover:shadow-[inset_0_-10px_18px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12),0_0_28px_rgba(99,102,241,0.18)]">
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(var(--accent),0.18),transparent_62%)]" />
            <span className="relative flex h-4 w-4 flex-col items-center justify-center">
              <span className="flex w-full items-center justify-between px-[1px]">
                <span className="h-1 w-1 rounded-full bg-white/90 shadow-[0_0_10px_rgba(99,102,241,0.16)]" />
                <span className="h-1 w-1 rounded-full bg-white/90 shadow-[0_0_10px_rgba(99,102,241,0.16)]" />
              </span>
              <span className="mt-1 h-[6px] w-3 rounded-b-full border-b border-white/70 opacity-60" />
            </span>
          </span>
          <span className="text-sm font-semibold tracking-tight text-white/90">
            CallAI
          </span>
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/60 sm:inline">
            Premium companion UI
          </span>
        </Link>

        <nav className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-2 max-sm:w-full max-sm:justify-start">
          <Link
            href="/chat"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white/90 sm:inline-flex"
          >
            Chat
          </Link>
          <AuthNavbarArea />
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 ring-1 ring-white/10 transition-all hover:bg-white/14 hover:ring-white/20"
          >
            Start Chatting
          </Link>
        </nav>
      </div>
    </header>
  );
}

