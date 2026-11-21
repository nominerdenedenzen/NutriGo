import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { CalendarDays, ChefHat, Clock, Flame, Gauge, Lightbulb, ShoppingCart, Users } from "lucide-react";
import { db } from "@/db";
import { groceryItems, mealPlan, recipes } from "@/db/schema";
import type { WeekDay } from "@/lib/weekDays";
import BackButton from "./BackButton";
import CookingSteps from "./CookingSteps";
import PlanAndShop from "./PlanAndShop";

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="flex-1 bg-[#ECECE6]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Suspense fallback={<RecipeSkeleton />}>
          <RecipeDetail params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function RecipeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, id) });

  // AI recipes are private to the person who asked Gemini for them
  if (!recipe || (recipe.createdBy && recipe.createdBy !== userId)) notFound();

  const [planned, onList] = await Promise.all([
    // Which days is this recipe already on?
    db
      .select({ day: mealPlan.day })
      .from(mealPlan)
      .where(and(eq(mealPlan.userId, userId), eq(mealPlan.recipeId, id))),
    // What is already on the grocery list (and not bought yet)?
    db
      .select({ name: groceryItems.name })
      .from(groceryItems)
      .where(and(eq(groceryItems.userId, userId), eq(groceryItems.checked, false))),
  ]);
  const plannedDays = [...new Set(planned.map((p) => p.day as WeekDay))];

  const ingredients = recipe.ingredients ?? [];
  const missing = (recipe.missingIngredients ?? []).map((m) => m.toLowerCase());
  const steps = (recipe.instructions ?? "").split("\n").filter((s) => s.trim() !== "");
  const tips = recipe.tips ?? [];
  const nutrition = recipe.nutrition;

  const facts = [
    { icon: Clock, label: "Time", value: recipe.cookingTime ?? "—" },
    { icon: Users, label: "Serves", value: recipe.servings ? `${recipe.servings}` : "—" },
    { icon: Gauge, label: "Level", value: recipe.difficulty ?? "—" },
    { icon: Flame, label: "Calories", value: nutrition ? `${nutrition.calories} kcal` : "—" },
  ];

  return (
    <>
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <BackButton />
        <Link
          href="/meal-plan"
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#1e3226] shadow-sm ring-1 ring-[#1e3226]/5 transition hover:bg-[#1e3226]/5"
        >
          <CalendarDays className="h-4 w-4" />
          My meal plan
        </Link>
      </div>

      {/* ===== Hero: big photo with the title on top ===== */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#1e3226] shadow-sm">
        {recipe.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="h-[340px] w-full object-cover opacity-90 sm:h-[420px]"
          />
        ) : (
          <div className="flex h-[340px] items-center justify-center bg-gradient-to-br from-[#6b8f5e] to-[#1e3226] sm:h-[420px]">
            <ChefHat className="h-20 w-20 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e3226] via-[#1e3226]/50 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              missing.length === 0 ? "bg-[#cfe3c4] text-[#1e3226]" : "bg-amber-100 text-amber-900"
            }`}
          >
            {missing.length === 0 ? (
              "✓ You can cook this now"
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                Missing {missing.length} ingredient{missing.length > 1 ? "s" : ""}
              </>
            )}
          </span>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight text-white sm:text-6xl">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
              {recipe.description}
            </p>
          )}
        </div>
      </section>

      {/* Quick facts */}
      <dl className="relative z-10 mx-4 -mt-6 grid grid-cols-2 gap-3 sm:mx-10 sm:grid-cols-4">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-md ring-1 ring-[#1e3226]/5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#cfe3c4]/60">
              <Icon className="h-5 w-5 text-[#1e3226]" />
            </span>
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1e3226]/50">{label}</dt>
              <dd className="truncate text-sm font-semibold capitalize text-[#1e3226]">{value}</dd>
            </div>
          </div>
        ))}
      </dl>

      {/* ===== Main: plan & shop (left) + steps, nutrition, tips (right) ===== */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <PlanAndShop
            recipeId={recipe.id}
            ingredients={ingredients}
            missing={missing}
            plannedDays={plannedDays}
            onListAlready={onList.map((i) => i.name)}
          />
        </div>

        <div className="space-y-8">
          <CookingSteps steps={steps} />

          {nutrition && (
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#1e3226]/5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-2xl font-semibold text-[#1e3226]">Nutrition</h2>
                <span className="text-xs text-[#1e3226]/50">per serving · AI estimate</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <NutritionBox label="Calories" value={nutrition.calories} unit="kcal" color="bg-[#1e3226] text-white" />
                <NutritionBox label="Protein" value={nutrition.protein} unit="g" color="bg-[#cfe3c4] text-[#1e3226]" />
                <NutritionBox label="Carbs" value={nutrition.carbs} unit="g" color="bg-amber-100 text-amber-900" />
                <NutritionBox label="Fat" value={nutrition.fat} unit="g" color="bg-orange-100 text-orange-900" />
              </div>
            </div>
          )}

          {tips.length > 0 && (
            <div className="rounded-3xl bg-[#cfe3c4]/50 p-6 ring-1 ring-[#6b8f5e]/20">
              <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-[#1e3226]">
                <Lightbulb className="h-5 w-5 text-[#6b8f5e]" />
                Chef&apos;s tips
              </h2>
              <ul className="mt-4 space-y-3">
                {tips.map((tip, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-[#1e3226]/80">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6b8f5e]" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function NutritionBox({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className={`rounded-2xl p-4 ${color}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold">
        {value}
        <span className="ml-1 text-sm font-medium opacity-70">{unit}</span>
      </p>
    </div>
  );
}

function RecipeSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-[340px] rounded-[2rem] bg-white sm:h-[420px]" />
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="h-96 rounded-3xl bg-white" />
        <div className="h-96 rounded-3xl bg-white" />
      </div>
    </div>
  );
}
