// Finds a photo for a dish using TheMealDB's free API (no key needed, "1" is the free test key).
// Every image there is a real, plated dish, so we never show something unrelated.
// Example: "Garlic Butter Salmon" -> searches "salmon" -> a salmon dish photo.
import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { recipes } from '@/db/schema';

const MEALDB_SEARCH = 'https://www.themealdb.com/api/json/v1/1/search.php';

type Meal = { strMeal: string; strMealThumb: string | null };

// Lowercase words of a name, without short filler words ("with", "and", ...)
function words(text: string) {
  return text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3 && !['with', 'and', 'the'].includes(w));
}

async function searchMealDb(query: string): Promise<Meal[]> {
  try {
    const res = await fetch(`${MEALDB_SEARCH}?s=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(5000), // don't make the user wait forever
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.meals) ? data.meals : [];
  } catch {
    return [];
  }
}

// dishName: the recipe title, e.g. "Creamy Mushroom Pasta"
// hint:     a short common dish name from Gemini, e.g. "pasta" (optional)
// Returns an image URL, or null if nothing fits (the page then shows a placeholder).
export async function findRecipeImage(dishName: string, hint?: string): Promise<string | null> {
  const titleWords = words(dishName);

  // What to search, best guess first:
  // the hint, the full title, then single words from the END of the title
  // (the main food is usually last: "Lemon Herb CHICKEN", "Spinach OMELETTE").
  const queries = [...new Set([hint?.trim().toLowerCase(), dishName.toLowerCase(), ...[...titleWords].reverse()])]
    .filter((q): q is string => Boolean(q))
    .slice(0, 5);

  for (const query of queries) {
    const meals = (await searchMealDb(query)).filter((m) => m.strMealThumb);
    if (meals.length === 0) continue;

    // Pick the meal whose name shares the most words with our title
    const score = (m: Meal) => words(m.strMeal).filter((w) => titleWords.includes(w)).length;
    const best = meals.reduce((a, b) => (score(b) > score(a) ? b : a));
    return best.strMealThumb;
  }
  return null;
}

// Recipes without a picture get one looked up and saved.
// "" in the database means "we looked, nothing found", so we don't search again.
// Returns the same list with imageUrl filled in.
export async function ensureRecipeImages<T extends { id: string; title: string; imageUrl: string | null }>(
  list: T[],
): Promise<T[]> {
  const missing = list.filter((r) => r.imageUrl === null).slice(0, 12); // a few per page load, so it stays fast
  if (missing.length === 0) return list;

  const found = new Map<string, string>();
  await Promise.all(
    missing.map(async (recipe) => {
      const url = (await findRecipeImage(recipe.title)) ?? '';
      found.set(recipe.id, url);
      await db.update(recipes).set({ imageUrl: url }).where(eq(recipes.id, recipe.id));
    }),
  );

  return list.map((r) => (found.has(r.id) ? { ...r, imageUrl: found.get(r.id)! } : r));
}
