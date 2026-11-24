// Rebuilds every recipe's vector in Pinecone with the same model the app uses (Gemini, 384 numbers).
// Run it after changing the embedding model:   npm run reindex
// Safe to run again: it overwrites each recipe's vector by its id.
import nextEnv from "@next/env";
import postgres from "postgres";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenAI } from "@google/genai";

nextEnv.loadEnvConfig(process.cwd());

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const index = new Pinecone({ apiKey: process.env.PINECONE_API_KEY }).index("recipes");

// Must match lib/pinecone.ts
const recipeText = (r) =>
  `${r.title}. ${r.description ?? ""} Ingredients: ${(r.ingredients ?? []).map((i) => i.name).join(", ")}`;
const normalize = (v) => {
  const length = Math.hypot(...v) || 1;
  return v.map((x) => x / length);
};

const rows = await sql`select id, title, description, ingredients, source, created_by from recipes`;
console.log(`Re-indexing ${rows.length} recipes...`);

for (let i = 0; i < rows.length; i += 50) {
  const batch = rows.slice(i, i + 50);
  const res = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: batch.map(recipeText),
    config: { outputDimensionality: 384, taskType: "RETRIEVAL_DOCUMENT" },
  });
  await index.upsert({
    records: batch.map((r, j) => ({
      id: r.id,
      values: normalize(res.embeddings[j].values),
      metadata: { source: r.source ?? "", createdBy: r.created_by ?? "" },
    })),
  });
  console.log(`  ${Math.min(i + 50, rows.length)} / ${rows.length}`);
}

await sql.end();
console.log("Done.");
