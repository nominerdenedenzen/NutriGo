import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { CalendarDays, Flame } from "lucide-react";
import { db } from "@/db";
import { mealPlan, recipes, type Nutrition } from "@/db/schema";
import { WEEK_DAYS, type WeekDay } from "@/lib/weekDays";

export default function NutritionPage() {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}>
          <NutritionSummary />
        </Suspense>
      </div>
    </main>
  );
}

const EMPTY: Nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };

function add(a: Nutrition, b: Nutrition): Nutrition {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

async function NutritionSummary() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Every planned meal + its nutrition (per serving, Gemini's estimate)
  const meals = await db
    .select({ day: mealPlan.day, title: recipes.title, recipeId: recipes.id, nutrition: recipes.nutrition })
    .from(mealPlan)
    .innerJoin(recipes, eq(mealPlan.recipeId, recipes.id))
    .where(eq(mealPlan.userId, userId));

  // Add up each day, and the whole week
  const byDay = new Map<WeekDay, Nutrition>(WEEK_DAYS.map((d) => [d, EMPTY]));
  let week = EMPTY;
  for (const meal of meals) {
    if (!meal.nutrition) continue;
    byDay.set(meal.day as WeekDay, add(byDay.get(meal.day as WeekDay) ?? EMPTY, meal.nutrition));
    week = add(week, meal.nutrition);
  }
  const noEstimate = meals.filter((m) => !m.nutrition);
  const plannedDays = WEEK_DAYS.filter((d) => (byDay.get(d)?.calories ?? 0) > 0).length;
  const maxCalories = Math.max(1, ...WEEK_DAYS.map((d) => byDay.get(d)?.calories ?? 0));

  const boxes = [
    { label: "Calories", value: week.calories, unit: "kcal", color: "bg-[#101814] text-white" },
    { label: "Protein", value: week.protein, unit: "g", color: "bg-[#E6F4EA] text-[#101814]" },
    { label: "Carbs", value: week.carbs, unit: "g", color: "bg-amber-100 text-amber-900" },
    { label: "Fat", value: week.fat, unit: "g", color: "bg-orange-100 text-orange-900" },
  ];

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#1F8A4C]">This week</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[#101814] sm:text-5xl">Nutrition</h1>
          <p className="mt-1 text-sm text-[#101814]/60">
            From the meals on your meal plan · one serving each · AI estimate
          </p>
        </div>
        <Link
          href="/meal-plan"
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#101814] border border-black/5 shadow-sm transition hover:bg-[#101814]/5"
        >
          <CalendarDays className="h-4 w-4" />
          My meal plan
        </Link>
      </div>

      {meals.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center border border-black/5 shadow-sm">
          <Flame className="mx-auto h-10 w-10 text-[#101814]/30" />
          <p className="mt-3 font-medium text-[#101814]">No meals planned yet.</p>
          <p className="mt-1 text-sm text-[#101814]/60">Add recipes to your meal plan to see their nutrition here.</p>
          <Link
            href="/recipes"
            className="mt-5 inline-flex rounded-full bg-[#1F8A4C] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#176F3C]"
          >
            Browse recipes
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Week totals */}
          <section className="rounded-2xl bg-white p-6 border border-black/5 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-[#101814]">Week total</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {boxes.map((b) => (
                <div key={b.label} className={`rounded-xl p-4 ${b.color}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{b.label}</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {b.value.toLocaleString()}
                    <span className="ml-1 text-sm font-medium opacity-70">{b.unit}</span>
                  </p>
                </div>
              ))}
            </div>
            {plannedDays > 0 && (
              <p className="mt-4 text-sm text-[#101814]/60">
                About <b>{Math.round(week.calories / plannedDays).toLocaleString()} kcal</b> per planned day.
              </p>
            )}
          </section>

          {/* Calories per day */}
          <section className="rounded-2xl bg-white p-6 border border-black/5 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-[#101814]">Calories per day</h2>
            <ul className="mt-5 space-y-3">
              {WEEK_DAYS.map((day) => {
                const n = byDay.get(day) ?? EMPTY;
                return (
                  <li key={day} className="grid grid-cols-[90px_1fr_auto] items-center gap-3 text-sm">
                    <span className="font-medium capitalize text-[#101814]">{day}</span>
                    <span className="h-3 overflow-hidden rounded-full bg-[#FAFAF8]">
                      <span
                        className="block h-full rounded-full bg-[#1F8A4C]"
                        style={{ width: `${(n.calories / maxCalories) * 100}%` }}
                      />
                    </span>
                    <span className="w-36 text-right text-[#101814]/70">
                      {n.calories > 0 ? `${n.calories} kcal · ${n.protein}g protein` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {noEstimate.length > 0 && (
            <p className="text-sm text-[#101814]/60">
              Not counted (no nutrition estimate):{" "}
              {noEstimate.map((m, i) => (
                <span key={`${m.recipeId}-${i}`}>
                  {i > 0 && ", "}
                  <Link href={`/recipes/${m.recipeId}`} className="underline underline-offset-2">
                    {m.title}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </>
  );
}
