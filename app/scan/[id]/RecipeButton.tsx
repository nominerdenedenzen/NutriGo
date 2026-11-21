"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChefHat, Clock, Plus, ShoppingBasket, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Recipe = {
  id: string | null; // null if it could not be saved (then there is no detail page)
  name: string;
  cookingTime: string;
  ingredients: string[];
  missingIngredients: string[];
  instructions: string[];
  image: string | null;
};

type Filter = "all" | "ready" | "missing";

export default function RecipeButton({
  ingredients,
  photo,
}: {
  ingredients: string[];
  photo: ReactNode; // the uploaded photo card, made on the server in page.tsx
}) {
  // Ingredients from the photo + ones the user typed in
  const [myIngredients, setMyIngredients] = useState<string[]>(ingredients);
  const [newIngredient, setNewIngredient] = useState("");

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------- Ingredient list ----------
  function addIngredient() {
    // "rice, eggs" adds two ingredients at once
    const typed = newIngredient
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && !myIngredients.includes(s));
    if (typed.length > 0) setMyIngredients([...myIngredients, ...new Set(typed)]);
    setNewIngredient("");
  }

  function removeIngredient(item: string) {
    setMyIngredients(myIngredients.filter((i) => i !== item));
  }

  // ---------- Recipes ----------
  async function findRecipes() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: myIngredients }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setRecipes(data.recipes);
      setFilter("all");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Double-check Gemini's answer: anything the user already has is not "missing"
  function missingFor(recipe: Recipe) {
    return recipe.missingIngredients.filter((m) => !myIngredients.includes(m.toLowerCase()));
  }

  const readyCount = recipes.filter((r) => missingFor(r).length === 0).length;

  const shownRecipes = recipes.filter((r) => {
    if (filter === "ready") return missingFor(r).length === 0;
    if (filter === "missing") return missingFor(r).length > 0;
    return true;
  });

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All recipes", count: recipes.length },
    { id: "ready", label: "Ready to cook", count: readyCount },
    { id: "missing", label: "Need a few more", count: recipes.length - readyCount },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      {/* ================= LEFT: photo + ingredients ================= */}
      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        {photo}

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#1e3226]/5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1e3226]">
              <ShoppingBasket className="h-5 w-5 text-[#6b8f5e]" />
              Your ingredients
            </h2>
            <span className="rounded-full bg-[#cfe3c4]/60 px-2.5 py-0.5 text-xs font-medium text-[#1e3226]">
              {myIngredients.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#1e3226]/60">
            Remove anything wrong, or add what the photo missed.
          </p>

          {myIngredients.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {myIngredients.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-1 rounded-full bg-[#ECECE6] py-1 pl-3 pr-1 text-sm text-[#1e3226]"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeIngredient(item)}
                    aria-label={`Remove ${item}`}
                    className="rounded-full p-1 text-[#1e3226]/50 transition hover:bg-[#1e3226]/10 hover:text-[#1e3226]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl bg-[#ECECE6] p-4 text-center text-sm text-[#1e3226]/60">
              No ingredients yet. Type some below.
            </p>
          )}

          {/* Type extra ingredients */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addIngredient();
            }}
            className="mt-4 flex gap-2"
          >
            <input
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              placeholder="Add more, e.g. rice, eggs"
              maxLength={80}
              className="min-w-0 flex-1 rounded-full border border-[#1e3226]/15 bg-white px-4 py-2 text-sm outline-none transition placeholder:text-[#1e3226]/40 focus:border-[#6b8f5e] focus:ring-2 focus:ring-[#cfe3c4]"
            />
            <button
              type="submit"
              disabled={!newIngredient.trim()}
              aria-label="Add ingredient"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#cfe3c4] text-[#1e3226] transition hover:bg-[#b9d6ab] disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>

          <Button
            onClick={findRecipes}
            disabled={loading || myIngredients.length === 0}
            className="mt-5 h-11 w-full rounded-full bg-[#1e3226] text-white hover:bg-[#2c4636]"
          >
            <ChefHat className="h-4 w-4" />
            {loading ? "Finding recipes…" : recipes.length > 0 ? "Find new recipes" : "Find recipes"}
          </Button>

          {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
        </div>
      </aside>

      {/* ================= RIGHT: recipes ================= */}
      <section className="min-w-0">
        {loading ? (
          <LoadingCards />
        ) : recipes.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Title + filter tabs */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-script text-2xl text-[#6b8f5e]">Made for you</p>
                <h2 className="font-display text-3xl font-semibold text-[#1e3226]">
                  {recipes.length} recipe ideas
                </h2>
              </div>
            </div>

            <div className="mt-4 flex gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-sm ring-1 ring-[#1e3226]/5 no-scrollbar sm:inline-flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === tab.id
                      ? "bg-[#1e3226] text-white"
                      : "text-[#1e3226]/70 hover:bg-[#ECECE6]"
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 ${filter === tab.id ? "text-white/60" : "text-[#1e3226]/40"}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {shownRecipes.length === 0 && (
              <p className="mt-8 rounded-3xl bg-white p-8 text-center text-sm text-[#1e3226]/60">
                No recipes in this group. Try another tab.
              </p>
            )}

            {/* Recipe cards */}
            <div className="mt-6 grid items-start gap-6 sm:grid-cols-2">
              {shownRecipes.map((recipe, index) => (
                <RecipeCard
                  key={`${recipe.name}-${index}`}
                  recipe={recipe}
                  missing={missingFor(recipe)}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* ---------------- One recipe card ---------------- */
function RecipeCard({ recipe, missing }: { recipe: Recipe; missing: string[] }) {
  // catch each piece of this recipe into its own const
  const { id, name, cookingTime, ingredients, instructions, image } = recipe;
  const isReady = missing.length === 0;
  const isMissing = (item: string) => missing.some((m) => m.toLowerCase() === item.toLowerCase());

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#1e3226]/5 transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Food image with badges on top */}
      <div className="relative">
        {/* Clicking the photo opens the dish page */}
        {id ? (
          <Link href={`/recipes/${id}`} aria-label={`Open ${name}`} className="block overflow-hidden">
            <span className="block transition duration-300 hover:scale-105">
              <FoodImage src={image} alt={name} />
            </span>
          </Link>
        ) : (
          <FoodImage src={image} alt={name} />
        )}
        <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-[#1e3226] backdrop-blur">
          <Clock className="h-3.5 w-3.5" />
          {cookingTime}
        </span>
        <span
          className={`pointer-events-none absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isReady ? "bg-[#1e3226] text-[#cfe3c4]" : "bg-amber-100 text-amber-900"
          }`}
        >
          {isReady ? "Ready to cook" : `+${missing.length} needed`}
        </span>
      </div>

      <div className="p-5">
        <h3 className="font-display text-2xl font-semibold leading-tight text-[#1e3226]">
          {id ? (
            <Link href={`/recipes/${id}`} className="transition hover:text-[#6b8f5e]">
              {name}
            </Link>
          ) : (
            name
          )}
        </h3>

        {/* Ingredients: check = have, plus = need to buy */}
        <h4 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1e3226]/50">
          Ingredients
        </h4>
        <ul className="mt-2 space-y-1.5">
          {ingredients.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {isMissing(item) ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <Plus className="h-3 w-3 text-amber-700" />
                </span>
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#cfe3c4]">
                  <Check className="h-3 w-3 text-[#1e3226]" />
                </span>
              )}
              <span className={isMissing(item) ? "text-amber-800" : "text-[#1e3226]"}>
                {item}
                {isMissing(item) && <span className="ml-1 text-xs text-amber-600">(need)</span>}
              </span>
            </li>
          ))}
        </ul>

        {/* Instructions (click to open) */}
        <details className="group mt-5 border-t border-[#1e3226]/10 pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-[#1e3226]">
            <span>How to cook it</span>
            <span className="rounded-full bg-[#ECECE6] px-2.5 py-0.5 text-xs font-medium text-[#1e3226]/70 group-open:hidden">
              {instructions.length} steps
            </span>
            <span className="hidden text-xs font-medium text-[#1e3226]/50 group-open:inline">Hide</span>
          </summary>
          <ol className="mt-4 space-y-3">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-[#1e3226]/80">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1e3226] text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </details>

        {/* Go to this recipe's own page */}
        {id && (
          <Link
            href={`/recipes/${id}`}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#1e3226] text-sm font-medium text-white transition hover:bg-[#2c4636]"
          >
            Open recipe · plan & shop
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  );
}

/* ---------------- Food photo (with a placeholder if there is none) ---------------- */
function FoodImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-[#cfe3c4] to-[#ECECE6]">
        <ChefHat className="h-12 w-12 text-[#1e3226]/30" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="aspect-[4/3] w-full object-cover"
    />
  );
}

/* ---------------- Before the user clicks "Find recipes" ---------------- */
function EmptyState() {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#1e3226]/15 bg-white/50 p-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#cfe3c4]">
        <Sparkles className="h-7 w-7 text-[#1e3226]" />
      </span>
      <h2 className="mt-5 font-display text-3xl font-semibold text-[#1e3226]">Ready when you are</h2>
      <p className="mt-2 max-w-sm text-sm text-[#1e3226]/60">
        Check your ingredients on the left, add anything missing, then press{" "}
        <span className="font-semibold text-[#1e3226]">Find recipes</span> to see what you can cook.
      </p>
    </div>
  );
}

/* ---------------- While Gemini is thinking ---------------- */
function LoadingCards() {
  return (
    <div>
      <div className="h-8 w-48 animate-pulse rounded-full bg-white" />
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="aspect-[4/3] animate-pulse bg-[#ECECE6]" />
            <div className="space-y-3 p-5">
              <div className="h-6 w-3/4 animate-pulse rounded-full bg-[#ECECE6]" />
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-[#ECECE6]" />
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-[#ECECE6]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
