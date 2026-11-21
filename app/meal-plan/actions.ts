"use server";

// Server Actions for the meal plan and grocery list.
// They run on the server, so every one checks who is signed in first.
import { auth } from "@clerk/nextjs/server";
import { refresh } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { groceryItems, mealPlan, recipes } from "@/db/schema";
import { WEEK_DAYS, type WeekDay } from "@/lib/weekDays";

const MAX_ITEMS = 50;

async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Please sign in first.");
  return userId;
}

function cleanName(name: string) {
  return name.trim().toLowerCase().slice(0, 80);
}

// ---------------- Meal plan ----------------

// Put a recipe on a day, and (optionally) put the ingredients the user doesn't have on the grocery list
export async function addToMealPlan(recipeId: string, day: WeekDay, toBuy: string[] = []) {
  const userId = await requireUser();
  if (!WEEK_DAYS.includes(day)) throw new Error("Unknown day.");

  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) });
  if (!recipe || (recipe.createdBy && recipe.createdBy !== userId)) throw new Error("Recipe not found.");

  await db.insert(mealPlan).values({ userId, recipeId, day });
  if (toBuy.length > 0) await addItems(userId, toBuy, recipe.title);
  refresh();
}

export async function removeFromMealPlan(mealId: string) {
  const userId = await requireUser();
  await db.delete(mealPlan).where(and(eq(mealPlan.id, mealId), eq(mealPlan.userId, userId)));
  refresh();
}

export async function clearMealPlan() {
  const userId = await requireUser();
  await db.delete(mealPlan).where(eq(mealPlan.userId, userId));
  refresh();
}

// ---------------- Grocery list ----------------

// Add items to the list. An item already on the list gets the recipe added to its "for" list
// and is marked as not bought again.
async function addItems(userId: string, names: string[], recipeTitle?: string) {
  const clean = [...new Set(names.map(cleanName).filter(Boolean))].slice(0, MAX_ITEMS);
  if (clean.length === 0) return [];

  const existing = await db
    .select()
    .from(groceryItems)
    .where(and(eq(groceryItems.userId, userId), inArray(groceryItems.name, clean)));
  const byName = new Map(existing.map((row) => [row.name, row]));

  for (const name of clean) {
    const row = byName.get(name);
    const forRecipes = [...new Set([...(row?.forRecipes ?? []), ...(recipeTitle ? [recipeTitle] : [])])];
    await db
      .insert(groceryItems)
      .values({ userId, name, forRecipes })
      .onConflictDoUpdate({
        target: [groceryItems.userId, groceryItems.name],
        set: { forRecipes, checked: false },
      });
  }

  return db
    .select()
    .from(groceryItems)
    .where(and(eq(groceryItems.userId, userId), inArray(groceryItems.name, clean)));
}

// From a recipe page: "add these missing ingredients to my grocery list"
export async function addToGroceryList(recipeId: string, names: string[]) {
  const userId = await requireUser();
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) });
  if (!recipe || (recipe.createdBy && recipe.createdBy !== userId)) throw new Error("Recipe not found.");

  await addItems(userId, names, recipe.title);
  refresh();
}

// From the grocery list: the user typed an item themselves. Returns the saved row.
export async function addGroceryItem(name: string) {
  const userId = await requireUser();
  const [row] = await addItems(userId, [name]);
  return row ?? null;
}

export async function setGroceryChecked(itemId: string, checked: boolean) {
  const userId = await requireUser();
  await db
    .update(groceryItems)
    .set({ checked })
    .where(and(eq(groceryItems.id, itemId), eq(groceryItems.userId, userId)));
}

export async function removeGroceryItem(itemId: string) {
  const userId = await requireUser();
  await db
    .delete(groceryItems)
    .where(and(eq(groceryItems.id, itemId), eq(groceryItems.userId, userId)));
}

// Remove everything that is ticked as bought
export async function clearBoughtItems() {
  const userId = await requireUser();
  await db
    .delete(groceryItems)
    .where(and(eq(groceryItems.userId, userId), eq(groceryItems.checked, true)));
}
