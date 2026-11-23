"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";

// Cooking steps the user can tick off while cooking
export default function CookingSteps({ steps }: { steps: string[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const allDone = steps.length > 0 && done.size === steps.length;

  return (
    <div className="rounded-2xl bg-white p-6 border border-black/5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-[#101814]">How to cook it</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#101814]/60">
            {done.size} of {steps.length} done
          </span>
          {done.size > 0 && (
            <button
              type="button"
              onClick={() => setDone(new Set())}
              aria-label="Reset steps"
              className="rounded-full p-1.5 text-[#101814]/50 transition hover:bg-[#FAFAF8] hover:text-[#101814]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-[#101814]/60">Tap a step when you finish it.</p>

      <ol className="mt-5 space-y-3">
        {steps.map((step, i) => {
          const isDone = done.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={isDone}
                className={`flex w-full gap-4 rounded-xl p-3 text-left transition ${
                  isDone ? "bg-[#E6F4EA]/30" : "hover:bg-[#FAFAF8]/60"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                    isDone ? "bg-[#1F8A4C] text-white" : "bg-[#101814] text-white"
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={`pt-1 leading-relaxed transition ${
                    isDone ? "text-[#101814]/40 line-through" : "text-[#101814]/80"
                  }`}
                >
                  {step}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {allDone && (
        <p className="mt-5 rounded-xl bg-[#101814] p-4 text-center font-display text-xl text-[#E6F4EA]">
          All done. Enjoy your meal! 🍽️
        </p>
      )}
    </div>
  );
}
