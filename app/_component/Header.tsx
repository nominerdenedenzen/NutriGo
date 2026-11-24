"use client";

import { useState } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Leaf, Menu, Search, User, X } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Scan Fridge", href: "/scan" },
  { label: "Recipes", href: "/recipes" },
  { label: "Meal Plans", href: "/meal-plan" },
  { label: "Nutrition", href: "/nutrition" },
  { label: "Premium", href: "/premium" },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // Close the phone menu whenever the page changes
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F8A4C]">
            <Leaf className="h-4 w-4 text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight text-[#101814]">
            Nutri<span className="text-[#1F8A4C]">Go</span>
          </span>
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
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#E6F4EA] text-[#1F8A4C]"
                    : "text-[#101814]/60 hover:text-[#1F8A4C]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions (Search, CTA & Auth) */}
        <div className="flex items-center gap-2">
          <Link
            href="/recipes?search=1"
            aria-label="Search recipes"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#101814]/80 transition-colors hover:bg-[#101814]/10 hover:text-[#101814]"
          >
            <Search className="h-4 w-4" />
          </Link>

          <Link
            href="/scan"
            className="hidden sm:flex items-center gap-2 rounded-full bg-[#1F8A4C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#176F3C]"
          >
            <Camera className="h-4 w-4" />
            Upload Photo
          </Link>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                aria-label="Sign in"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[#101814] transition-colors hover:bg-[#101814]/5"
              >
                <User className="h-4 w-4" />
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>

          {/* Phone menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#101814] transition-colors hover:bg-[#101814]/10 md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Phone menu */}
      {menuOpen && (
        <nav aria-label="Mobile Navigation" className="border-t border-black/5 px-4 py-2 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-xl px-3 py-3 text-sm font-medium text-[#101814] hover:bg-[#101814]/5"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
