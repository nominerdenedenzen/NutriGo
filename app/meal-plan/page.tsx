import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { asc, eq } from "drizzle-orm";
import { Camera, ChefHat, Clock, Plus, X } from "lucide-react";
import { db } from "@/db";
import { groceryItems, mealPlan, recipes } from "@/db/schema";
import { WEEK_DAYS, type WeekDay } from "@/lib/weekDays";
import { removeFromMealPlan } from "./actions";
import ClearWeekButton from "./ClearWeekButton";
import GroceryList from "./GroceryList";
import TodayBadge from "./TodayBadge";

export default function MealPlanPage() {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <Suspense fallback={<PlanSkeleton />}>
          <MealPlan />
        </Suspense>
      </div>
    </main>
  );
}

async function MealPlan() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Every planned meal + its recipe, oldest first
  const meals = await db
    .select({
      id: mealPlan.id,
      day: mealPlan.day,
      recipeId: recipes.id,
      title: recipes.title,
      imageUrl: recipes.imageUrl,
      cookingTime: recipes.cookingTime,
    })
    .from(mealPlan)
    .innerJoin(recipes, eq(mealPlan.recipeId, recipes.id))
    .where(eq(mealPlan.userId, userId))
    .orderBy(asc(mealPlan.createdAt));

  const grocery = await db
    .select({
      id: groceryItems.id,
      name: groceryItems.name,
      forRecipes: groceryItems.forRecipes,
      checked: groceryItems.checked,
    })
    .from(groceryItems)
    .where(eq(groceryItems.userId, userId))
    .orderBy(asc(groceryItems.createdAt));

  // Group meals by day
  const byDay = new Map<WeekDay, typeof meals>(WEEK_DAYS.map((d) => [d, []]));
  for (const meal of meals) byDay.get(meal.day as WeekDay)?.push(meal);

  const toBuyCount = grocery.filter((g) => !g.checked).length;

  return (
    <>
      {/* Page header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#1F8A4C]">This week</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[#101814] sm:text-5xl">
            Your meal plan
          </h1>
          <p className="mt-1 text-sm text-[#101814]/60">
            {meals.length === 0
              ? "No meals planned yet."
              : `${meals.length} meal${meals.length > 1 ? "s" : ""} planned · ${toBuyCount} item${toBuyCount === 1 ? "" : "s"} to buy`}
          </p>
        </div>
        <div className="flex gap-2">
          {meals.length > 0 && <ClearWeekButton />}
          <Link
            href="/scan"
            className="flex items-center gap-2 rounded-full bg-[#1F8A4C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#176F3C]"
          >
            <Camera className="h-4 w-4" />
            Find more recipes
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        {/* ===== The week ===== */}
        <section className="space-y-3">
          {WEEK_DAYS.map((day) => {
            const dayMeals = byDay.get(day) ?? [];
            return (
              <div
                key={day}
                className="rounded-2xl bg-white p-4 border border-black/5 shadow-sm sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight capitalize text-[#101814]">
                    {day}
                    <TodayBadge day={day} />
                  </h2>
                  <span className="text-xs text-[#101814]/50">
                    {dayMeals.length === 0 ? "" : `${dayMeals.length} meal${dayMeals.length > 1 ? "s" : ""}`}
                  </span>
                </div>

                {dayMeals.length === 0 ? (
                  <Link
                    href="/scan"
                    className="mt-3 flex items-center gap-2 rounded-xl border-2 border-dashed border-[#101814]/10 px-4 py-3 text-sm text-[#101814]/50 transition hover:border-[#1F8A4C]/40 hover:text-[#101814]"
                  >
                    <Plus className="h-4 w-4" />
                    Nothing planned. Scan your fridge to find a meal.
                  </Link>
                ) : (
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {dayMeals.map((meal) => (
                      <li
                        key={meal.id}
                        className="group relative flex items-center gap-3 rounded-xl bg-[#FAFAF8]/60 p-2 pr-10 transition hover:bg-[#FAFAF8]"
                      >
                        <Link href={`/recipes/${meal.recipeId}`} className="flex min-w-0 flex-1 items-center gap-3">
                          {meal.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={meal.imageUrl}
                              alt=""
                              className="h-16 w-16 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#E6F4EA]">
                              <ChefHat className="h-6 w-6 text-[#101814]/40" />
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-[#101814]">{meal.title}</span>
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-[#101814]/60">
                              <Clock className="h-3 w-3" />
                              {meal.cookingTime ?? "—"}
                            </span>
                          </span>
                        </Link>

                        {/* Remove from plan (works even before JavaScript loads) */}
                        <form action={removeFromMealPlan.bind(null, meal.id)} className="absolute right-2 top-1/2 -translate-y-1/2">
                          <button
                            type="submit"
                            aria-label={`Remove ${meal.title} from ${day}`}
                            className="rounded-full p-1.5 text-[#101814]/40 transition hover:bg-white hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>

        {/* ===== Grocery list ===== */}
        <aside id="grocery-list" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <GroceryList initialItems={grocery} />
        </aside>
      </div>
    </>
  );
}

function PlanSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-12 w-72 rounded-full bg-white" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-white" />
      </div>
    </div>
  );
}
