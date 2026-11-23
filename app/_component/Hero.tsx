import Link from "next/link";
import { ArrowDown, Camera } from "lucide-react";

const HERO_PHOTO =
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=2000&q=80";

// Full-width food photo with the headline on top
export default function Hero() {
  return (
    <section className="relative isolate flex min-h-[560px] lg:min-h-[640px] items-center justify-center overflow-hidden px-6 py-24 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HERO_PHOTO} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      {/* Dark green overlay so the white text is easy to read */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0B2A1A]/75 via-[#0B2A1A]/60 to-[#0B2A1A]/85" aria-hidden />

      <div className="max-w-3xl">
        <span className="inline-flex rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
          Fresh · Healthy · Simple
        </span>
        <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-7xl">
          Cook better with what you <span className="text-[#7BE0A0]">already have</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/80">
          Snap your fridge. Get healthy recipes, a weekly plan and a grocery list in seconds.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 rounded-full bg-[#1F8A4C] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-[#25A35A]"
          >
            <Camera className="h-4 w-4" />
            Scan your fridge
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-white/40 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
          >
            How it works
            <ArrowDown className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
