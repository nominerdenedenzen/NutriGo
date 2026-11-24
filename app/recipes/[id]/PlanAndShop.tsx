"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { CalendarPlus, Check, ListChecks, ShoppingCart, X } from "lucide-react";
import { addToGroceryList, addToMealPlan } from "@/app/meal-plan/actions";
import { WEEK_DAYS, thisWeekDates, todayWeekDay, type WeekDay } from "@/lib/weekDays";

const noSubscribe = () => () => {};
// Today's date as text: only changes once a day, so React can compare it safely
const todayKey = () => new Date().toDateString();

type Done = { day: WeekDay | null; items: number; skipped: number };

export default function PlanAndShop({
  recipeId,
  ingredients,
  missing,
  plannedDays,
  onListAlready,
}: {
  recipeId: string;
  ingredients: { name: string; measure: string }[];
  missing: string[] | null; // lowercase names the user doesn't have (null = unknown, never scanned)
  plannedDays: WeekDay[];
  onListAlready: string[]; // lowercase names already on the grocery list
}) {
  // ---- Ingredient checklist: ticked = "I have it" ----
  const [have, setHave] = useState<Set<string>>(
    () => new Set(missing ? ingredients.map((i) => i.name.toLowerCase()).filter((n) => !missing.includes(n)) : []),
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
  // While this is set, we are asking "add these missing items to your grocery list?"
  const [asking, setAsking] = useState<Set<string> | null>(null);

  // "Add to Monday": if something is missing, ask before touching the grocery list
  function plan() {
    setDone(null);
    if (newToBuy.length > 0) setAsking(new Set(newToBuy));
    else savePlan([]);
  }

  function savePlan(items: string[]) {
    setAsking(null);
    setError("");
    startTransition(async () => {
      try {
        await addToMealPlan(recipeId, day, items);
        setDone({ day, items: items.length, skipped: newToBuy.length - items.length });
      } catch {
        setError("Could not save, try again.");
      }
    });
  }

  function toggleAsk(name: string) {
    setAsking((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function shopOnly() {
    setError("");
    startTransition(async () => {
      try {
        await addToGroceryList(recipeId, newToBuy);
        setDone({ day: null, items: newToBuy.length, skipped: 0 });
      } catch {
        setError("Could not save, try again.");
      }
    });
  }

  const haveCount = ingredients.length - toBuy.length;

  return (
    <div className="overflow-hidden rounded-2xl bg-white border border-black/5 shadow-sm">
      {/* ===== Step 1: ingredient checklist ===== */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1F8A4C]">Step 1</p>
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#101814]">
              <ListChecks className="h-5 w-5 text-[#1F8A4C]" />
              What do you have?
            </h2>
            <p className="mt-1 text-sm text-[#101814]/60">
              {missing
                ? "We ticked what we saw in your last fridge scan. Change anything that's wrong."
                : "Tick what's already in your kitchen. Everything else is marked “to buy”."}
            </p>
          </div>
          <span className="shrink-0 rounded-xl bg-[#E6F4EA]/60 px-3 py-1 text-xs font-semibold text-[#101814]">
            {haveCount}/{ingredients.length}
          </span>
        </div>

        {/* progress bar */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#FAFAF8]">
          <div
            className="h-full rounded-full bg-[#1F8A4C] transition-all"
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
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition ${
                    isHave
                      ? "bg-[#E6F4EA]/30 ring-[#1F8A4C]/20 hover:bg-[#E6F4EA]/50"
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
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-xl border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#1F8A4C] ${
                      isHave ? "border-[#101814] bg-[#101814]" : "border-amber-400 bg-white"
                    }`}
                  >
                    {isHave && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 text-sm capitalize text-[#101814]">
                    {name}
                    {measure && <span className="ml-1 text-[#101814]/50">· {measure}</span>}
                  </span>
                  <span
                    className={`rounded-xl px-2 py-0.5 text-[11px] font-semibold ${
                      isHave
                        ? "text-[#101814]/50"
                        : onList
                          ? "bg-[#101814]/5 text-[#101814]/60"
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
      <div className="border-t border-[#101814]/5 bg-[#FAFAF8]/40 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1F8A4C]">Step 2</p>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#101814]">
          <CalendarPlus className="h-5 w-5 text-[#1F8A4C]" />
          When will you cook it?
        </h2>

        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {WEEK_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPicked(d)}
              aria-pressed={day === d}
              className={`relative flex flex-col items-center rounded-xl py-2 transition ${
                day === d
                  ? "bg-[#101814] text-white shadow"
                  : "bg-white text-[#101814]/70 ring-1 ring-[#101814]/5 hover:bg-[#101814]/5"
              }`}
            >
              <span className="text-[11px] font-semibold uppercase">{d.slice(0, 3)}</span>
              <span className="text-base font-semibold">{dates ? dates[d] : " "}</span>
              {today === d && (
                <span className={`text-[9px] font-semibold uppercase ${day === d ? "text-[#E6F4EA]" : "text-[#1F8A4C]"}`}>
                  today
                </span>
              )}
              {plannedDays.includes(d) && (
                <span title="Already planned this day" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#1F8A4C]" />
              )}
            </button>
          ))}
        </div>
        {plannedDays.length > 0 && (
          <p className="mt-2 text-xs text-[#101814]/50">● Already on your plan for: {plannedDays.map((d) => d.slice(0, 3)).join(", ")}</p>
        )}

        {/* ===== Buttons ===== */}
        <button
          type="button"
          onClick={plan}
          disabled={pending}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#101814] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#25332B] disabled:opacity-60"
        >
          <CalendarPlus className="h-4 w-4 shrink-0" />
          {pending ? (
            "Saving…"
          ) : (
            <span>
              Add to my meal plan on <span className="capitalize">{day}</span>
            </span>
          )}
        </button>

        {newToBuy.length > 0 && (
          <button
            type="button"
            onClick={shopOnly}
            disabled={pending}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-medium text-[#101814] ring-1 ring-[#101814]/15 transition hover:bg-[#101814]/5 disabled:opacity-60"
          >
            <ShoppingCart className="h-4 w-4" />
            Just add the {newToBuy.length} missing item{newToBuy.length > 1 ? "s" : ""} to my grocery list
          </button>
        )}

        {/* ===== Result ===== */}
        {done && !pending && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#E6F4EA]/50 p-4 text-sm text-[#101814]">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#101814]">
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
              <p className="text-[#101814]/70">
                {done.items > 0
                  ? `${done.items} item${done.items > 1 ? "s" : ""} added to your grocery list.`
                  : done.skipped > 0
                    ? "Your grocery list was not changed."
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

      {/* ===== "Add missing ingredients to your grocery list?" ===== */}
      {asking && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[#101814]/50 p-4 sm:items-center"
          onClick={() => setAsking(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ask-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && setAsking(null)}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 p-6 pb-0">
              <div>
                <h2 id="ask-title" className="flex items-center gap-2 text-lg font-semibold text-[#101814]">
                  <ShoppingCart className="h-5 w-5 text-amber-600" />
                  Add missing ingredients to your grocery list?
                </h2>
                <p className="mt-1 text-sm text-[#101814]/60">
                  You&apos;re missing {newToBuy.length} ingredient{newToBuy.length > 1 ? "s" : ""} for this recipe.
                  Untick anything you don&apos;t want on your list.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAsking(null)}
                aria-label="Cancel"
                className="rounded-full p-1.5 text-[#101814]/40 transition hover:bg-[#101814]/5 hover:text-[#101814]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="max-h-64 space-y-1.5 overflow-y-auto p-6">
              {newToBuy.map((name) => {
                const on = asking.has(name);
                return (
                  <li key={name}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-[#101814]/10 transition hover:bg-[#FAFAF8]">
                      <input type="checkbox" checked={on} onChange={() => toggleAsk(name)} className="peer sr-only" />
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#1F8A4C] ${
                          on ? "border-[#1F8A4C] bg-[#1F8A4C]" : "border-[#101814]/25 bg-white"
                        }`}
                      >
                        {on && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                      </span>
                      <span className="text-sm capitalize text-[#101814]">{name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>

            <div className="space-y-2 border-t border-[#101814]/5 bg-[#FAFAF8]/60 p-6">
              <button
                type="button"
                autoFocus
                onClick={() => savePlan([...asking])}
                disabled={asking.size === 0}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1F8A4C] px-4 text-sm font-semibold text-white transition hover:bg-[#176F3C] disabled:opacity-40"
              >
                <Check className="h-4 w-4" />
                Yes, plan it and add {asking.size} item{asking.size === 1 ? "" : "s"}
              </button>
              <button
                type="button"
                onClick={() => savePlan([])}
                className="flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-medium text-[#101814] ring-1 ring-[#101814]/15 transition hover:bg-[#101814]/5"
              >
                No thanks, only plan the meal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
