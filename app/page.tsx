import Link from "next/link";
import { ArrowRight, CalendarDays, Camera, ChefHat, Flame, Leaf, Utensils } from "lucide-react";
import Hero from "./_component/Hero";

const BOWL_PHOTO =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";
const VEGGIES_PHOTO =
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=2000&q=80";

const FEATURES = [
  {
    icon: ChefHat,
    title: "Recipes for you",
    text: "Recipes made from the food you already have, with easy step-by-step cooking.",
    href: "/recipes",
    cta: "See recipes",
  },
  {
    icon: CalendarDays,
    title: "Plan your week",
    text: "Put meals on any day. Anything you're missing goes on your grocery list.",
    href: "/meal-plan",
    cta: "Open meal plan",
  },
  {
    icon: Flame,
    title: "Know your nutrition",
    text: "See the calories, protein, carbs and fat of everything you planned.",
    href: "/nutrition",
    cta: "View nutrition",
  },
];

export default function Home() {
  return (
    <main className="w-full flex-1">
      <Hero />

      {/* ===== Intro ===== */}
      <section id="how-it-works" className="scroll-mt-16 bg-white px-6 py-20 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E6F4EA] text-[#1F8A4C]">
          <Utensils className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-3xl font-bold tracking-tight text-[#101814] sm:text-4xl">
          Healthy living starts in your kitchen
        </h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-[#101814]/60">
          NutriGo helps you eat well without the stress. Take one photo of your fridge, and we find the
          ingredients, suggest wholesome recipes, and help you plan meals for the whole week. Less food
          waste, fewer trips to the shop, and better meals every day.
        </p>
      </section>

      {/* ===== Photo + green panel ===== */}
      <section className="grid bg-white lg:grid-cols-2">
        <div className="relative min-h-[320px] lg:min-h-[480px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BOWL_PHOTO} alt="A healthy bowl with salmon, eggs and vegetables" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="relative flex items-center overflow-hidden bg-[#1F8A4C] px-8 py-16 sm:px-14">
          <Leaf className="absolute -right-10 -top-10 h-56 w-56 rotate-12 text-white/10" aria-hidden />
          <div className="relative max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#BFEFD0]">Eating well, every season</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your fridge already has a great meal in it
            </h2>
            <p className="mt-4 leading-relaxed text-white/80">
              Our AI looks at your photo and names every ingredient: vegetables, eggs, meat, and more. Then it
              writes recipes that use what you have, so nothing goes to waste.
            </p>
            <Link
              href="/scan"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1F8A4C] transition hover:bg-[#E6F4EA]"
            >
              <Camera className="h-4 w-4" />
              Scan your fridge
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Three features ===== */}
      <section className="bg-[#F1F8F3] px-6 py-20">
        <div className="mx-auto grid max-w-6xl divide-y divide-[#1F8A4C]/20 md:grid-cols-3 md:divide-x md:divide-y-0">
          {FEATURES.map(({ icon: Icon, title, text, href, cta }) => (
            <div key={title} className="flex flex-col items-center px-8 py-10 text-center md:py-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#1F8A4C] shadow-sm ring-1 ring-[#1F8A4C]/10">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-[#101814]">{title}</h3>
              <p className="mt-2 max-w-xs flex-1 text-sm leading-relaxed text-[#101814]/60">{text}</p>
              <Link
                href={href}
                className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#1F8A4C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#176F3C]"
              >
                {cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Dark photo band ===== */}
      <section className="relative isolate overflow-hidden px-6 py-24 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={VEGGIES_PHOTO} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[#0B2A1A]/80" aria-hidden />
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">What&apos;s in your fridge today?</h2>
        <p className="mx-auto mt-4 max-w-md text-white/70">One photo is all it takes to find your next healthy meal.</p>
        <Link
          href="/scan"
          className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#1F8A4C] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:bg-[#25A35A]"
        >
          <Camera className="h-4 w-4" />
          Start scanning
        </Link>
      </section>
    </main>
  );
}
