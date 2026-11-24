"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { setFavourite } from "./actions";

// Heart button: saves a recipe to "My favourites" (or removes it).
// "icon" = round button over a recipe photo, "pill" = labelled button for the recipe page.
export default function FavouriteButton({
  recipeId,
  initial,
  variant = "icon",
}: {
  recipeId: string;
  initial: boolean;
  variant?: "icon" | "pill";
}) {
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState(false);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !saved;
    setSaved(next); // change the screen right away
    setError(false);
    startTransition(async () => {
      try {
        await setFavourite(recipeId, next);
      } catch {
        setSaved(!next); // saving failed: put it back
        setError(true);
      }
    });
  }

  const label = saved ? "Remove from favourites" : "Add to favourites";

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        title={error ? "Could not save, try again." : label}
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border shadow-sm transition ${
          saved
            ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            : "border-black/5 bg-white text-[#101814] hover:bg-[#101814]/5"
        }`}
      >
        <Heart className={`h-4 w-4 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
        {saved ? "Saved to favourites" : "Add to favourites"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={label}
      title={error ? "Could not save, try again." : label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 hover:bg-white"
    >
      <Heart className={`h-4 w-4 ${saved ? "fill-rose-500 text-rose-500" : "text-[#101814]/70"}`} />
    </button>
  );
}
