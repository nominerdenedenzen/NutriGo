// Works out which recipe ingredients a user is missing, by comparing them with
// what NutriGo saw in their most recent fridge scan.
import "server-only";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { scans } from "@/db/schema";

// Things almost every kitchen has, so we never send people shopping for them
export const STAPLES = ["salt", "pepper", "black pepper", "water", "ice"];

export type Pantry = { items: string[]; scannedAt: Date };

// The ingredients from the user's latest scan that found something, or null if they never scanned
export async function getPantry(userId: string): Promise<Pantry | null> {
  const rows = await db
    .select({ ingredients: scans.ingredients, createdAt: scans.createdAt })
    .from(scans)
    .where(and(eq(scans.userId, userId), isNotNull(scans.ingredients)))
    .orderBy(desc(scans.createdAt))
    .limit(5);

  const latest = rows.find((r) => (r.ingredients ?? []).length > 0);
  if (!latest) return null;
  return { items: latest.ingredients ?? [], scannedAt: latest.createdAt };
}

// "2 Large Tomatoes (diced)" -> ["tomato"] style word list, so small wording differences still match
function words(text: string) {
  return text
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !FILLER.has(w))
    .map(singular);
}

const FILLER = new Set([
  "fresh", "chopped", "diced", "minced", "sliced", "large", "small", "medium", "ripe", "of", "and",
  "or", "to", "taste", "cup", "cups", "tbsp", "tsp", "tablespoon", "tablespoons", "teaspoon",
  "teaspoons", "g", "kg", "ml", "oz", "lb", "pinch", "handful", "clove", "cloves", "optional",
  "grated", "peeled", "cooked", "raw", "whole", "piece", "pieces", "some", "few", "for", "serving",
]);

function singular(word: string) {
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y"; // berries -> berry
  if (word.endsWith("oes")) return word.slice(0, -2); // tomatoes -> tomato
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1); // eggs -> egg
  return word;
}

// True when every word of the shorter name appears in the longer one
// ("onion" matches "red onion", "chicken breast" matches "chicken breasts")
function sameIngredient(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.every((w) => long.includes(w));
}

// The recipe ingredients (lowercase) that are not in the pantry
export function findMissing(recipeIngredients: string[], pantry: string[]): string[] {
  const have = [...pantry, ...STAPLES].map(words);
  return recipeIngredients
    .map((name) => name.trim().toLowerCase())
    .filter((name) => {
      const w = words(name);
      if (w.length === 0) return false;
      return !have.some((h) => sameIngredient(w, h));
    });
}
