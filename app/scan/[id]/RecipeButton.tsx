"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function RecipeButton({ ingredients }: { ingredients: string[] }) {
  const [recipes, setRecipes] = useState("");
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
    <section className="w-full max-w-md">
      <Button onClick={findRecipes} disabled={loading || ingredients.length === 0}>
        {loading ? "Finding recipes…" : "Find recipes"}
      </Button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {recipes && (
        <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm shadow">
          {recipes}
        </div>
      )}
    </section>
  );
}
