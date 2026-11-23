"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

// Goes back to the page the user came from (usually their scan)
export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/scan"))}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#101814]/70 transition hover:bg-[#101814]/5 hover:text-[#101814]"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to recipes
    </button>
  );
}
