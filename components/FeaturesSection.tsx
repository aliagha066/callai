const features = [
  {
    title: "Natural Conversation",
    description:
      "A calm interface built for real dialogue — focused, readable, and emotionally aware.",
  },
  {
    title: "Voice & Video Ready",
    description:
      "Designed to grow into voice calls, video presence, and avatar experiences without redesign.",
  },
  {
    title: "Personalized Companion Modes",
    description:
      "Caring companion, fitness coach, relationship-style, motivational support — coming soon.",
  },
  {
    title: "Designed for Real Connection",
    description:
      "Soft hierarchy, warm tone, and premium spacing — intimate without being childish.",
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white/90 sm:text-2xl">
            Built for today. Ready for what’s next.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
            The UI you’re building now should already feel compatible with future
            features — without adding any complexity yet.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.title}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[rgb(var(--panel))] p-6 transition-all hover:border-white/16 hover:bg-[rgb(var(--panel-2))]"
          >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="absolute -top-20 left-10 h-48 w-48 rounded-full bg-[rgba(var(--accent),0.10)] blur-3xl" />
              <div className="absolute -bottom-20 right-10 h-48 w-48 rounded-full bg-[rgba(34,211,238,0.05)] blur-3xl" />
            </div>
            <div className="relative">
              <h3 className="text-base font-semibold text-white/90">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                {f.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

