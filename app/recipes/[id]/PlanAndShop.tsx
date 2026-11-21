"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { CalendarPlus, Check, ListChecks, ShoppingCart } from "lucide-react";
import { addToGroceryList, addToMealPlan } from "@/app/meal-plan/actions";
import { WEEK_DAYS, thisWeekDates, todayWeekDay, type WeekDay } from "@/lib/weekDays";

const noSubscribe = () => () => {};
// Today's date as text: only changes once a day, so React can compare it safely
const todayKey = () => new Date().toDateString();

type Done = { day: WeekDay | null; items: number };

export default function PlanAndShop({
  recipeId,
  ingredients,
  missing,
  plannedDays,
  onListAlready,
}: {
  recipeId: string;
  ingredients: { name: string; measure: string }[];
  missing: string[]; // lowercase names Gemini said the user doesn't have
  plannedDays: WeekDay[];
  onListAlready: string[]; // lowercase names already on the grocery list
}) {
  // ---- Ingredient checklist: ticked = "I have it" ----
  const [have, setHave] = useState<Set<string>>(
    () => new Set(ingredients.map((i) => i.name.toLowerCase()).filter((n) => !missing.includes(n))),
  );
  const toBuy = ingredients.map((i) => i.name.toLowerCase()).filter((n) => !have.has(n));
  const newToBuy = toBuy.filter((n) => !onListAlready.includes(n));

  function toggleHave(name: string) {
    setHave((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // ---- Day picker (starts on today, in the user's own time zone) ----
  const today = useSyncExternalStore(noSubscribe, todayWeekDay, () => null);
  const dateKey = useSyncExternalStore(noSubscribe, todayKey, () => null);
  const dates = useMemo(() => (dateKey ? thisWeekDates() : null), [dateKey]);
  const [picked, setPicked] = useState<WeekDay | null>(null);
  const day = picked ?? today ?? "monday";

  // ---- Saving ----
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function planAndShop() {
    setError("");
    startTransition(async () => {
      try {
        await addToMealPlan(recipeId, day, newToBuy);
        setDone({ day, items: newToBuy.length });
      } catch {
        setError("Could not save, try again.");
      }
    });
  }

  function shopOnly() {
    setError("");
    startTransition(async () => {
      try {
        await addToGroceryList(recipeId, newToBuy);
        setDone({ day: null, items: newToBuy.length });
      } catch {
        setError("Could not save, try again.");
      }
    });
  }

  const haveCount = ingredients.length - toBuy.length;

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#1e3226]/5">
      {/* ===== Step 1: ingredient checklist ===== */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6b8f5e]">Step 1</p>
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-[#1e3226]">
              <ListChecks className="h-5 w-5 text-[#6b8f5e]" />
              What do you have?
            </h2>
            <p className="mt-1 text-sm text-[#1e3226]/60">Tick what&apos;s in your kitchen. The rest goes on your grocery list.</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#cfe3c4]/60 px-3 py-1 text-xs font-semibold text-[#1e3226]">
            {haveCount}/{ingredients.length}
          </span>
        </div>

        {/* progress bar */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#ECECE6]">
          <div
            className="h-full rounded-full bg-[#6b8f5e] transition-all"
            style={{ width: `${ingredients.length ? (haveCount / ingredients.length) * 100 : 0}%` }}
          />
        </div>

        <ul className="mt-4 space-y-1.5">
          {ingredients.map(({ name, measure }) => {
            const key = name.toLowerCase();
            const isHave = have.has(key);
            const onList = !isHave && onListAlready.includes(key);
            return (
              <li key={key}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 transition ${
                    isHave
                      ? "bg-[#cfe3c4]/30 ring-[#6b8f5e]/20 hover:bg-[#cfe3c4]/50"
                      : "bg-amber-50/60 ring-amber-200 hover:bg-amber-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isHave}
                    onChange={() => toggleHave(key)}
                    className="peer sr-only"
                  />
                  {/* custom checkbox */}
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#6b8f5e] ${
                      isHave ? "border-[#1e3226] bg-[#1e3226]" : "border-amber-400 bg-white"
                    }`}
                  >
                    {isHave && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 text-sm capitalize text-[#1e3226]">
                    {name}
                    {measure && <span className="ml-1 text-[#1e3226]/50">· {measure}</span>}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isHave
                        ? "text-[#1e3226]/50"
                        : onList
                          ? "bg-[#1e3226]/5 text-[#1e3226]/60"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {isHave ? "have it" : onList ? "on list" : "to buy"}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ===== Step 2: pick a day ===== */}
      <div className="border-t border-[#1e3226]/5 bg-[#ECECE6]/40 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6b8f5e]">Step 2</p>
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-[#1e3226]">
          <CalendarPlus className="h-5 w-5 text-[#6b8f5e]" />
          When will you cook it?
        </h2>

        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {WEEK_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPicked(d)}
              aria-pressed={day === d}
              className={`relative flex flex-col items-center rounded-2xl py-2 transition ${
                day === d
                  ? "bg-[#1e3226] text-white shadow"
                  : "bg-white text-[#1e3226]/70 ring-1 ring-[#1e3226]/5 hover:bg-[#1e3226]/5"
              }`}
            >
              <span className="text-[11px] font-semibold uppercase">{d.slice(0, 3)}</span>
              <span className="text-base font-semibold">{dates ? dates[d] : " "}</span>
              {today === d && (
                <span className={`text-[9px] font-semibold uppercase ${day === d ? "text-[#cfe3c4]" : "text-[#6b8f5e]"}`}>
                  today
                </span>
              )}
              {plannedDays.includes(d) && (
                <span title="Already planned this day" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#6b8f5e]" />
              )}
            </button>
          ))}
        </div>
        {plannedDays.length > 0 && (
          <p className="mt-2 text-xs text-[#1e3226]/50">● Already on your plan for: {plannedDays.map((d) => d.slice(0, 3)).join(", ")}</p>
        )}

        {/* ===== Buttons ===== */}
        <button
          type="button"
          onClick={planAndShop}
          disabled={pending}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1e3226] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2c4636] disabled:opacity-60"
        >
          <CalendarPlus className="h-4 w-4 shrink-0" />
          {pending ? (
            "Saving…"
          ) : (
            <span>
              Add to <span className="capitalize">{day}</span>
              {newToBuy.length > 0 && ` + ${newToBuy.length} item${newToBuy.length > 1 ? "s" : ""} to grocery list`}
            </span>
          )}
        </button>

        {newToBuy.length > 0 && (
          <button
            type="button"
            onClick={shopOnly}
            disabled={pending}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-medium text-[#1e3226] ring-1 ring-[#1e3226]/15 transition hover:bg-[#1e3226]/5 disabled:opacity-60"
          >
            <ShoppingCart className="h-4 w-4" />
            Only add {newToBuy.length} item{newToBuy.length > 1 ? "s" : ""} to grocery list
          </button>
        )}

        {/* ===== Result ===== */}
        {done && !pending && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#cfe3c4]/50 p-4 text-sm text-[#1e3226]">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1e3226]">
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </span>
            <div>
              <p className="font-semibold">
                {done.day ? (
                  <>
                    Planned for <span className="capitalize">{done.day}</span>
                  </>
                ) : (
                  "Saved to your grocery list"
                )}
              </p>
              <p className="text-[#1e3226]/70">
                {done.items > 0
                  ? `${done.items} item${done.items > 1 ? "s" : ""} added to your grocery list.`
                  : "Nothing new to buy."}{" "}
                <Link href="/meal-plan" className="font-semibold underline underline-offset-2">
                  Open meal plan
                </Link>
              </p>
            </div>
          </div>
        )}
        {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
