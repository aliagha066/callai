import { FeaturesSection } from "@/components/FeaturesSection";
import { HeroSection } from "@/components/HeroSection";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-[100svh] w-full min-w-0 max-w-[100vw] overflow-x-clip bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,rgba(var(--accent),0.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40rem_28rem_at_10%_110%,rgba(34,211,238,0.06),transparent_55%)]" />
      </div>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
      </main>
      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/55">
            © {new Date().getFullYear()} CallAI. Built for calm, human connection.
          </p>
          <p className="text-sm text-white/40">
            Video calls are planned next; chat, voice, accounts, and saved history
            already work in the app.
          </p>
        </div>
      </footer>
    </div>
  );
}
