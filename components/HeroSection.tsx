import Link from "next/link";

export function HeroSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:pt-20 sm:pb-14">
      <div className="grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_20px_rgba(var(--accent),0.45)]" />
            Calm, premium companion experience
          </p>

          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-white/95 sm:text-5xl">
            Talk to an AI that feels human
          </h1>

          <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-white/65 sm:text-lg">
            Natural conversation with emotional intelligence — designed for real
            connection today, and ready for voice, video, and personalized
            companion modes tomorrow.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/chat"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[rgb(var(--accent-2))] px-6 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_40px_rgba(79,70,229,0.22)] transition-all hover:brightness-110 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_22px_60px_rgba(79,70,229,0.30)]"
            >
              Start Chatting
            </Link>
            <a
              href="#experience"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/5 px-6 text-sm font-semibold text-white/80 transition-colors hover:bg-white/8 hover:text-white/90"
            >
              See Experience
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/55">
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-white/35" />
              Private by design (future-ready)
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-white/35" />
              Companion modes coming soon
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-white/35" />
              Voice & video ready
            </span>
          </div>
        </div>

        <div className="lg:col-span-5" id="experience">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[rgb(var(--panel))] p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_20px_60px_rgba(0,0,0,0.55)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_18rem_at_20%_10%,rgba(var(--accent),0.20),transparent_55%)]" />
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white/80">Preview</p>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/55">
                  UI only
                </span>
              </div>

              <div className="space-y-3">
                <div className="max-w-[88%] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  Hey. I’m here. What’s been on your mind lately?
                </div>
                <div className="ml-auto max-w-[88%] rounded-2xl bg-[rgba(var(--accent),0.12)] px-4 py-3 text-sm text-white/90 ring-1 ring-[rgba(var(--accent),0.22)]">
                  I want something that feels calm and real — not noisy.
                </div>
                <div className="max-w-[88%] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  Then we’ll keep it simple. One thought at a time.
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-[rgb(var(--panel-2))] p-2">
                <div className="h-10 flex-1 rounded-xl bg-black/20 px-3 py-2 text-sm text-white/50 ring-1 ring-white/5">
                  Type a message…
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                  <span className="text-sm font-semibold text-white/80">↵</span>
                </div>
              </div>
              <p className="text-xs text-white/45">
                Future: voice calls, video, avatar, and modes live here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

