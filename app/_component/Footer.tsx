import Link from "next/link";
import { Leaf } from "lucide-react";

const LINKS = [
  {
    title: "Cook",
    items: [
      { label: "Scan Fridge", href: "/scan" },
      { label: "Recipes", href: "/recipes" },
      { label: "How it works", href: "/#how-it-works" },
    ],
  },
  {
    title: "Plan",
    items: [
      { label: "Meal Plans", href: "/meal-plan" },
      { label: "Grocery List", href: "/meal-plan#grocery-list" },
      { label: "Nutrition", href: "/nutrition" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Sign in", href: "/sign-in" },
      { label: "Create account", href: "/sign-up" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-auto bg-[#0B2A1A] text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        {/* Brand */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F8A4C]">
              <Leaf className="h-4 w-4 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              Nutri<span className="text-[#7BE0A0]">Go</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
            Snap your fridge, cook something healthy today, and plan a better week.
          </p>
        </div>

        {/* Link columns */}
        {LINKS.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="text-sm font-semibold text-[#7BE0A0]">{group.title}</p>
            <ul className="mt-4 space-y-3">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-white/70 transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-white/40">
          <span>© NutriGo</span>
          <span>Fuel a healthier you</span>
        </div>
      </div>
    </footer>
  );
}
