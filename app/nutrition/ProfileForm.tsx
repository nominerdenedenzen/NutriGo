"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { ACTIVITIES, GOALS, dailyPlan, type Activity, type Goal, type Profile, type Sex } from "@/lib/nutritionPlan";
import { saveProfile } from "./actions";

// The "About you" form. Shows a live calorie estimate while you type,
// then saves on the server with the saveProfile Server Action.
export default function ProfileForm({ initial }: { initial: Profile | null }) {
  const [state, formAction, pending] = useActionState(saveProfile, null);

  // Kept in state only for the live preview; the form still sends the inputs by their "name"
  const [sex, setSex] = useState<Sex>(initial?.sex ?? "female");
  const [age, setAge] = useState(initial ? String(initial.age) : "");
  const [weight, setWeight] = useState(initial ? String(initial.weightKg) : "");
  const [height, setHeight] = useState(initial ? String(initial.heightCm) : "");
  const [activity, setActivity] = useState<Activity>(initial?.activity ?? "moderate");
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? "maintain");

  const filledIn = Number(age) >= 13 && Number(weight) >= 30 && Number(height) >= 120;
  const preview = filledIn
    ? dailyPlan({ sex, age: Number(age), weightKg: Number(weight), heightCm: Number(height), activity, goal })
    : null;

  const input =
    "h-12 w-full rounded-xl bg-[#FAFAF8] px-4 text-sm text-[#101814] outline-none ring-1 ring-[#101814]/10 focus:ring-2 focus:ring-[#1F8A4C]";
  const choice = (selected: boolean) =>
    `cursor-pointer rounded-xl px-4 py-3 text-sm ring-1 transition ${
      selected ? "bg-[#E6F4EA] ring-2 ring-[#1F8A4C] text-[#101814]" : "bg-white ring-[#101814]/10 text-[#101814]/70 hover:ring-[#1F8A4C]/50"
    }`;

  return (
    <form action={formAction} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-semibold tracking-tight text-[#101814]">About you</h2>
      <p className="mt-1 text-sm text-[#101814]/60">We use this to work out how much you should eat each day.</p>

      {/* Sex */}
      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-[#101814]">Sex</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["female", "male"] as const).map((value) => (
            <label key={value} className={choice(sex === value)}>
              <input type="radio" name="sex" value={value} checked={sex === value} onChange={() => setSex(value)} className="sr-only" />
              <span className="font-medium capitalize">{value}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Age, weight, height */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium text-[#101814]">
          Age <span className="font-normal text-[#101814]/50">(years)</span>
          <input name="age" type="number" inputMode="numeric" min={13} max={100} required value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" className={`mt-2 ${input}`} />
        </label>
        <label className="text-sm font-medium text-[#101814]">
          Weight <span className="font-normal text-[#101814]/50">(kg)</span>
          <input name="weightKg" type="number" inputMode="decimal" min={30} max={300} step="0.1" required value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="65" className={`mt-2 ${input}`} />
        </label>
        <label className="text-sm font-medium text-[#101814]">
          Height <span className="font-normal text-[#101814]/50">(cm)</span>
          <input name="heightCm" type="number" inputMode="numeric" min={120} max={230} required value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" className={`mt-2 ${input}`} />
        </label>
      </div>

      {/* Activity */}
      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-[#101814]">How much do you exercise?</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ACTIVITIES.map((a) => (
            <label key={a.value} className={choice(activity === a.value)}>
              <input type="radio" name="activity" value={a.value} checked={activity === a.value} onChange={() => setActivity(a.value)} className="sr-only" />
              <span className="block font-medium">{a.label}</span>
              <span className="mt-0.5 block text-xs text-[#101814]/55">{a.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Goal */}
      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-[#101814]">Your goal</legend>
        <div className="grid grid-cols-3 gap-3">
          {GOALS.map((g) => (
            <label key={g.value} className={choice(goal === g.value)}>
              <input type="radio" name="goal" value={g.value} checked={goal === g.value} onChange={() => setGoal(g.value)} className="sr-only" />
              <span className="font-medium">{g.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Live preview + save */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-black/5 pt-6">
        <p className="flex items-center gap-2 text-sm text-[#101814]/70">
          <Flame className="h-4 w-4 text-[#1F8A4C]" />
          {preview ? (
            <span>
              About <b className="text-[#101814]">{preview.calories.toLocaleString()} kcal</b> a day
            </span>
          ) : (
            "Fill in your details to see your daily calories"
          )}
        </p>
        <div className="flex items-center gap-3">
          {initial && (
            <Link href="/nutrition" className="rounded-full px-4 py-2.5 text-sm font-medium text-[#101814]/60 hover:text-[#101814]">
              Cancel
            </Link>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[#1F8A4C] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#176F3C] disabled:opacity-60"
          >
            {pending ? "Saving…" : initial ? "Update my plan" : "Make my plan"}
          </button>
        </div>
      </div>

      {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
