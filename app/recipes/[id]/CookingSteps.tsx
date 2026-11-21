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
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#1e3226]/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-[#1e3226]">How to cook it</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#1e3226]/60">
            {done.size} of {steps.length} done
          </span>
          {done.size > 0 && (
            <button
              type="button"
              onClick={() => setDone(new Set())}
              aria-label="Reset steps"
              className="rounded-full p-1.5 text-[#1e3226]/50 transition hover:bg-[#ECECE6] hover:text-[#1e3226]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-[#1e3226]/60">Tap a step when you finish it.</p>

      <ol className="mt-5 space-y-3">
        {steps.map((step, i) => {
          const isDone = done.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={isDone}
                className={`flex w-full gap-4 rounded-2xl p-3 text-left transition ${
                  isDone ? "bg-[#cfe3c4]/30" : "hover:bg-[#ECECE6]/60"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                    isDone ? "bg-[#6b8f5e] text-white" : "bg-[#1e3226] text-white"
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={`pt-1 leading-relaxed transition ${
                    isDone ? "text-[#1e3226]/40 line-through" : "text-[#1e3226]/80"
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
        <p className="mt-5 rounded-2xl bg-[#1e3226] p-4 text-center font-display text-xl text-[#cfe3c4]">
          All done. Enjoy your meal! 🍽️
        </p>
      )}
    </div>
  );
}
