import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { CalendarDays, Droplets, Flame, Pencil } from "lucide-react";
import { db } from "@/db";
import { mealPlan, profiles, recipes, type Nutrition } from "@/db/schema";
import { WEEK_DAYS, type WeekDay } from "@/lib/weekDays";
import { ACTIVITIES, GOALS, dailyPlan, type DailyPlan, type Profile } from "@/lib/nutritionPlan";
import ProfileForm from "./ProfileForm";

type SearchParams = Promise<{ edit?: string }>;

export default function NutritionPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}>
          <NutritionSummary searchParams={searchParams} />
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

async function NutritionSummary({ searchParams }: { searchParams: SearchParams }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const { edit } = await searchParams;

  const [row, meals] = await Promise.all([
    // The user's body details (null if they never filled in the form)
    db.query.profiles.findFirst({ where: eq(profiles.userId, userId) }),
    // Every planned meal + its nutrition (per serving, Gemini's estimate)
    db
      .select({ day: mealPlan.day, title: recipes.title, recipeId: recipes.id, nutrition: recipes.nutrition })
      .from(mealPlan)
      .innerJoin(recipes, eq(mealPlan.recipeId, recipes.id))
      .where(eq(mealPlan.userId, userId)),
  ]);

  const profile: Profile | null = row
    ? { sex: row.sex, age: row.age, weightKg: row.weightKg, heightCm: row.heightCm, activity: row.activity, goal: row.goal }
    : null;
  const plan = profile ? dailyPlan(profile) : null;
  const showForm = !profile || edit !== undefined;

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
  // Bars are scaled so both the biggest day and the daily target fit
  const barMax = Math.max(1, plan?.calories ?? 0, ...WEEK_DAYS.map((d) => byDay.get(d)?.calories ?? 0));

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
          <p className="text-sm font-semibold text-[#1F8A4C]">Your plan</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[#101814] sm:text-5xl">Nutrition</h1>
        </div>
        <Link
          href="/meal-plan"
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#101814] border border-black/5 shadow-sm transition hover:bg-[#101814]/5"
        >
          <CalendarDays className="h-4 w-4" />
          My meal plan
        </Link>
      </div>

      <div className="space-y-8">
        {/* ===== Step 1: about you, or your daily plan ===== */}
        {showForm ? (
          <ProfileForm initial={profile} />
        ) : (
          plan && profile && <DailyPlanCard plan={plan} profile={profile} />
        )}

        {/* ===== Step 2: this week's meal plan compared with the target ===== */}
        {meals.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center border border-black/5 shadow-sm">
            <Flame className="mx-auto h-10 w-10 text-[#101814]/30" />
            <p className="mt-3 font-medium text-[#101814]">No meals planned yet.</p>
            <p className="mt-1 text-sm text-[#101814]/60">
              Add recipes to your meal plan to compare them with your daily target.
            </p>
            <Link
              href="/recipes"
              className="mt-5 inline-flex rounded-full bg-[#1F8A4C] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#176F3C]"
            >
              Browse recipes
            </Link>
          </div>
        ) : (
          <>
            {/* Calories per day vs. target */}
            <section className="rounded-2xl bg-white p-6 border border-black/5 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-[#101814]">This week, day by day</h2>
                <p className="text-xs text-[#101814]/50">From your meal plan · one serving each · AI estimate</p>
              </div>
              {plan && (
                <p className="mt-1 flex items-center gap-2 text-sm text-[#101814]/60">
                  <span className="inline-block h-3 w-0.5 bg-[#101814]" /> = your target of {plan.calories.toLocaleString()} kcal
                </p>
              )}
              <ul className="mt-5 space-y-3">
                {WEEK_DAYS.map((day) => {
                  const n = byDay.get(day) ?? EMPTY;
                  const over = plan && n.calories > plan.calories * 1.1;
                  return (
                    <li key={day} className="grid grid-cols-[84px_1fr] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[90px_1fr_auto]">
                      <span className="font-medium capitalize text-[#101814]">{day}</span>
                      <span className="relative h-3 rounded-full bg-[#FAFAF8]">
                        <span
                          className={`block h-full rounded-full ${over ? "bg-orange-400" : "bg-[#1F8A4C]"}`}
                          style={{ width: `${(n.calories / barMax) * 100}%` }}
                        />
                        {plan && (
                          <span
                            className="absolute -top-1 h-5 w-0.5 bg-[#101814]"
                            style={{ left: `${(plan.calories / barMax) * 100}%` }}
                            aria-hidden
                          />
                        )}
                      </span>
                      <span className="col-start-2 text-[#101814]/70 sm:col-start-auto sm:w-44 sm:text-right">
                        {n.calories > 0
                          ? plan
                            ? `${n.calories} / ${plan.calories} kcal`
                            : `${n.calories} kcal · ${n.protein}g protein`
                          : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

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
                  About <b>{Math.round(week.calories / plannedDays).toLocaleString()} kcal</b> per planned day
                  {plan && <> (your target is {plan.calories.toLocaleString()} kcal)</>}.
                </p>
              )}
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
          </>
        )}
      </div>
    </>
  );
}

// The user's daily targets, worked out from their profile
function DailyPlanCard({ plan, profile }: { plan: DailyPlan; profile: Profile }) {
  const activity = ACTIVITIES.find((a) => a.value === profile.activity);
  const goal = GOALS.find((g) => g.value === profile.goal);
  const macros = [
    { label: "Protein", grams: plan.protein, kcal: plan.protein * 4, color: "bg-[#1F8A4C]" },
    { label: "Carbs", grams: plan.carbs, kcal: plan.carbs * 4, color: "bg-amber-400" },
    { label: "Fat", grams: plan.fat, kcal: plan.fat * 9, color: "bg-orange-400" },
  ];
  const macroTotal = macros.reduce((sum, m) => sum + m.kcal, 0) || 1;

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#101814]">Your daily plan</h2>
          <p className="mt-1 text-sm capitalize text-[#101814]/60">
            {profile.sex} · {profile.age} y · {profile.weightKg} kg · {profile.heightCm} cm · {activity?.label} activity ·{" "}
            {goal?.label}
          </p>
        </div>
        <Link
          href="/nutrition?edit"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[#1F8A4C] ring-1 ring-[#1F8A4C]/30 transition hover:bg-[#E6F4EA]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit my details
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Calories */}
        <div className="rounded-2xl bg-[#101814] p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Eat each day</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">
            {plan.calories.toLocaleString()}
            <span className="ml-2 text-lg font-medium opacity-70">kcal</span>
          </p>
          <p className="mt-3 text-sm text-white/60">
            Your body burns about {plan.tdee.toLocaleString()} kcal a day ({plan.bmr.toLocaleString()} at rest).
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm text-white/80">
            <Droplets className="h-4 w-4 text-sky-300" />
            Drink about <b>{plan.waterL} L</b> of water
          </p>
        </div>

        {/* Macros + meals */}
        <div className="space-y-6">
          <div>
            <div className="flex h-3 overflow-hidden rounded-full">
              {macros.map((m) => (
                <span key={m.label} className={m.color} style={{ width: `${(m.kcal / macroTotal) * 100}%` }} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {macros.map((m) => (
                <div key={m.label}>
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#101814]/60">
                    <span className={`h-2 w-2 rounded-full ${m.color}`} />
                    {m.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[#101814]">
                    {m.grams}
                    <span className="ml-1 text-sm font-medium text-[#101814]/50">g</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#101814]/60">Split over the day</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {plan.meals.map((meal) => (
                <li key={meal.name} className="rounded-xl bg-[#F1F8F3] px-3 py-2.5">
                  <p className="text-xs text-[#101814]/60">{meal.name}</p>
                  <p className="font-semibold text-[#101814]">{meal.calories} kcal</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-[#101814]/45">
        A general estimate (Mifflin-St Jeor formula), not medical advice. If you are pregnant, have a health
        condition or are under 18, ask a doctor or dietitian.
      </p>
    </section>
  );
}
