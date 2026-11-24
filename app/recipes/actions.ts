"use server";

// Server Actions for saving recipes to a user's favourites.
import { auth } from "@clerk/nextjs/server";
import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { favourites, recipes } from "@/db/schema";

// Save (on = true) or un-save (on = false) a recipe
export async function setFavourite(recipeId: string, on: boolean) {
  const { userId } = await auth();
  if (!userId) throw new Error("Please sign in first.");

  if (on) {
    const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) });
    // AI recipes are private to the person who asked Gemini for them
    if (!recipe || (recipe.createdBy && recipe.createdBy !== userId)) throw new Error("Recipe not found.");
    await db.insert(favourites).values({ userId, recipeId }).onConflictDoNothing();
  } else {
    await db
      .delete(favourites)
      .where(and(eq(favourites.userId, userId), eq(favourites.recipeId, recipeId)));
  }
  refresh();
}
