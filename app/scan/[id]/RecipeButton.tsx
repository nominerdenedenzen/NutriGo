"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChefHat, TimerIcon } from "lucide-react";

type Recipe = {
  id: string;
  name: string;
  cookingTime: string;
  ingredients: string[];
  instructions: string[];
  imageUrl: string; // "" when no photo was found
};

export default function RecipeButton({
  ingredients,
  photo,
}: {
  ingredients: string[];
  photo?: ReactNode;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function findRecipes() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setRecipes(data.recipes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-md space-y-4">
      {photo}

      <Button className="h-12 w-full rounded-full text-sm font-semibold" onClick={findRecipes} disabled={loading || ingredients.length === 0}>
        {loading ? "Finding recipes…" : "Find recipes"}
      </Button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {recipes.length > 0 && (
        <div className="space-y-4">
          {recipes.map((recipe) => {
            const { id, name, cookingTime, ingredients, instructions, imageUrl } = recipe;
            return (
              <div key={id} className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt={name} className="h-44 w-full object-cover" />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-gradient-to-br from-[#E6F4EA] to-[#1F8A4C]/60">
                    <ChefHat className="h-10 w-10 text-[#101814]/30" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[#101814]">{name}</h3>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#E6F4EA] px-3 py-1 text-xs text-[#101814]">
                      <TimerIcon className="h-3.5 w-3.5" />
                      {cookingTime}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#101814]/70">{ingredients.join(", ")}</p>
                  <p className="mt-1 text-xs text-[#101814]/50">{instructions.length} steps</p>
                  <Link href={`/recipes/${id}`} className="mt-4 inline-flex text-sm font-semibold text-[#1F8A4C] hover:underline">
                    View recipe
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
