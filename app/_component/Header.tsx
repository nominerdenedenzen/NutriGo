"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Leaf, Search, User } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Scan Fridge", href: "/scan" },
  { label: "Recipes", href: "/recipes" },
  { label: "Meal Plans", href: "/meal-plan" },
  { label: "Nutrition", href: "/nutrition" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[#1e3226]/10 bg-[#ECECE6]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1e3226]">
            <Leaf className="h-4 w-4 text-[#cfe3c4]" />
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-semibold tracking-wide text-[#1e3226]">
              Nutri<span className="text-[#6b8f5e]">Go</span>
            </span>
            <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.2em] text-[#1e3226]/60">
              Fuel a healthier you
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#1e3226]/10 text-[#1e3226]"
                    : "text-[#1e3226]/70 hover:bg-[#1e3226]/5 hover:text-[#1e3226]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions (Search, CTA & Auth) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Search recipes"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#1e3226]/80 transition-colors hover:bg-[#1e3226]/10 hover:text-[#1e3226]"
          >
            <Search className="h-4 w-4" />
          </button>

          <Link
            href="/scan"
            className="hidden sm:flex items-center gap-2 rounded-full bg-[#1e3226] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2c4636]"
          >
            <Camera className="h-4 w-4" />
            Upload Photo
          </Link>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                aria-label="Sign in"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1e3226]/20 text-[#1e3226] transition-colors hover:bg-[#1e3226]/10"
              >
                <User className="h-4 w-4" />
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
