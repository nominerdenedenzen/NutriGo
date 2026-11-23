"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { clearMealPlan } from "./actions";

export default function ClearWeekButton() {
  const [pending, startTransition] = useTransition();

  function clear() {
    if (!window.confirm("Remove every meal from this week's plan?")) return;
    startTransition(() => clearMealPlan());
  }

  return (
    <button
      type="button"
      onClick={clear}
      disabled={pending}
      className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#101814]/70 border border-black/5 shadow-sm transition hover:text-red-600 disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" />
      {pending ? "Clearing…" : "Clear week"}
    </button>
  );
}
