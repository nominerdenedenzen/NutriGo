import { auth } from "@clerk/nextjs/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { findSimilarRecipeIds } from "@/lib/pinecone";

// GET /api/recipes/search?q=chicken rice garlic
// Finds recipes by MEANING (Pinecone), then loads the full rows from Supabase.
export async function GET(request: Request) {
  // 1. Only signed-in users (userId comes from Clerk on the server, never from the browser)
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Please sign in first." }, { status: 401 });
  }

  // 2. Read the search text from the URL
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return Response.json({ error: "Add a search, like ?q=chicken rice" }, { status: 400 });
  }

  try {
    // 3. Ask Pinecone for the closest recipe ids (best match first)
    const matches = await findSimilarRecipeIds(q, userId);
    if (matches.length === 0) return Response.json({ recipes: [] });

    // 4. Load those recipes from Supabase by id
    const rows = await db.query.recipes.findMany({
      where: inArray(recipes.id, matches.map((m) => m.id)),
    });

    // 5. Put them back in Pinecone's order and add the match score (0 to 1)
    const results = matches
      .map((m) => {
        const recipe = rows.find((r) => r.id === m.id);
        return recipe ? { ...recipe, score: m.score } : null;
      })
      .filter((r) => r !== null);

    return Response.json({ recipes: results });
  } catch (error) {
    console.error("Recipe search failed:", error);
    return Response.json({ error: "Search failed, try again." }, { status: 500 });
  }
}
