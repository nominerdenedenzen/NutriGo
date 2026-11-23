// Search recipes by MEANING with Pinecone.
// Needs PINECONE_API_KEY in .env.local and an index called "recipes" (dimension 384, cosine).
import "server-only";
import { Pinecone } from "@pinecone-database/pinecone";
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// The Hugging Face model that turns text into 384 numbers (a "vector").
// It runs on our own server with Transformers.js, so it is free and needs no token.
// The first call downloads the model (~100 MB), after that it is fast.
const MODEL_ID = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

// Create the Pinecone client once (outside the functions)
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index("recipes");

// Load the model only once and reuse it for every request
let embedder: Promise<FeatureExtractionPipeline> | null = null;
function getEmbedder() {
  embedder ??= pipeline("feature-extraction", MODEL_ID);
  return embedder;
}

// 1. Text -> vector (an array of 384 numbers)
export async function embedText(text: string): Promise<number[]> {
  const embed = await getEmbedder();
  const output = await embed(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
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

  const records = await Promise.all(
    recipes.map(async (recipe) => ({
      id: recipe.id, // same id as the row in Supabase
      values: await embedText(
        `${recipe.title}. ${recipe.description ?? ""} Ingredients: ${recipe.ingredients.join(", ")}`,
      ),
      // Metadata lets us filter results. Pinecone does not allow null, so use "".
      metadata: { source: recipe.source ?? "", createdBy: recipe.createdBy ?? "" },
    })),
  );

  await index.upsert({ records });
}

// 3. Find the recipe ids closest in meaning to some text (best match first)
export async function findSimilarRecipeIds(text: string, userId: string, topK = 10) {
  const result = await index.query({
    vector: await embedText(text),
    topK,
    // AI recipes are private: only show ones this user created, plus all non-AI recipes
    filter: { $or: [{ source: { $ne: "ai" } }, { createdBy: { $eq: userId } }] },
  });

  return result.matches.map((match) => ({ id: match.id, score: match.score ?? 0 }));
}
