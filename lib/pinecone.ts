// Search recipes by MEANING with Pinecone.
// Needs PINECONE_API_KEY and GEMINI_API_KEY in .env, and a Pinecone index called "recipes" (dimension 384, cosine).
import "server-only";
import { Pinecone } from "@pinecone-database/pinecone";
import { gemini } from "@/lib/gemini";

// Gemini's embedding model turns text into a list of numbers (a "vector").
// Texts with a similar meaning get similar numbers. We ask for 384 numbers to match the Pinecone index.
// (It runs on Google's servers, so nothing big has to be installed or deployed with the app.)
const MODEL_ID = "gemini-embedding-001";
const DIMENSIONS = 384;

// The Pinecone index, created the first time it is used (not when the file loads),
// so `next build` doesn't fail when PINECONE_API_KEY isn't set yet.
let pineconeIndex: ReturnType<Pinecone["index"]> | null = null;
function index() {
  if (!pineconeIndex) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) throw new Error("Missing PINECONE_API_KEY in the environment variables");
    pineconeIndex = new Pinecone({ apiKey }).index("recipes");
  }
  return pineconeIndex;
}

// Scale a vector to length 1, so similarity scores are comparable (Google asks for this below 3072 numbers)
function normalize(values: number[]) {
  const length = Math.hypot(...values) || 1;
  return values.map((v) => v / length);
}

// 1. Texts -> vectors (one list of 384 numbers per text).
//    "document" = a recipe we store, "query" = what the user typed in the search box.
export async function embedTexts(texts: string[], kind: "document" | "query"): Promise<number[][]> {
  const response = await gemini().models.embedContent({
    model: MODEL_ID,
    contents: texts,
    config: {
      outputDimensionality: DIMENSIONS,
      taskType: kind === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
    },
  });
  const embeddings = response.embeddings ?? [];
  if (embeddings.length !== texts.length) throw new Error("Gemini returned the wrong number of embeddings");
  return embeddings.map((e) => normalize(e.values ?? []));
}

// The text we turn into a vector for each recipe
export function recipeText(recipe: { title: string; description?: string | null; ingredients: string[] }) {
  return `${recipe.title}. ${recipe.description ?? ""} Ingredients: ${recipe.ingredients.join(", ")}`;
}

// The info we need from a recipe to put it in Pinecone
export type RecipeForSearch = {
  id: string;
  title: string;
  description?: string | null;
  ingredients: string[];
  source?: string | null; // "ai", "mealdb", ...
  createdBy?: string | null; // Clerk user ID (only for AI recipes)
};

// 2. Save recipes into Pinecone (id + vector + a little metadata)
export async function addRecipesToPinecone(recipes: RecipeForSearch[]) {
  if (recipes.length === 0) return;

  // One Gemini call for all recipes at once
  const vectors = await embedTexts(recipes.map(recipeText), "document");

  const records = recipes.map((recipe, i) => ({
    id: recipe.id, // same id as the row in Supabase
    values: vectors[i],
    // Metadata lets us filter results. Pinecone does not allow null, so use "".
    metadata: { source: recipe.source ?? "", createdBy: recipe.createdBy ?? "" },
  }));

  await index().upsert({ records });
}

// 3. Find the recipe ids closest in meaning to some text (best match first)
export async function findSimilarRecipeIds(text: string, userId: string, topK = 10) {
  const result = await index().query({
    vector: (await embedTexts([text], "query"))[0],
    topK,
    // AI recipes are private: only show ones this user created, plus all non-AI recipes
    filter: { $or: [{ source: { $ne: "ai" } }, { createdBy: { $eq: userId } }] },
  });

  return result.matches.map((match) => ({ id: match.id, score: match.score ?? 0 }));
}
