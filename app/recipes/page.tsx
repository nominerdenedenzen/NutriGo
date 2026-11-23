import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { Camera, ChefHat, Clock, Search, X } from "lucide-react";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { findSimilarRecipeIds } from "@/lib/pinecone";

type SearchParams = Promise<{ q?: string; search?: string }>;

export default function RecipesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <Suspense fallback={<RecipesSkeleton />}>
          <Recipes searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Recipes({ searchParams }: { searchParams: SearchParams }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { q: rawQ, search } = await searchParams;
  const q = rawQ?.trim().slice(0, 100) ?? "";

  // Recipes this user may see: their own AI recipes + every non-AI recipe
  const visible = or(isNull(recipes.createdBy), eq(recipes.createdBy, userId));

  let list: (typeof recipes.$inferSelect)[];
  if (q) {
    try {
      // Search by MEANING with Pinecone, then load the rows from Supabase
      const matches = await findSimilarRecipeIds(q, userId, 12);
      const rows = matches.length
        ? await db.query.recipes.findMany({ where: and(visible, inArray(recipes.id, matches.map((m) => m.id))) })
        : [];
      list = matches.flatMap((m) => rows.filter((r) => r.id === m.id));
    } catch (error) {
      // If Pinecone fails, fall back to a simple "title contains" search
      console.error("Pinecone search failed, using text search:", error);
      list = await db.query.recipes.findMany({
        where: and(visible, ilike(recipes.title, `%${q}%`)),
        orderBy: desc(recipes.createdAt),
        limit: 24,
      });
    }
  } else {
    list = await db.query.recipes.findMany({ where: visible, orderBy: desc(recipes.createdAt), limit: 60 });
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#1F8A4C]">Your cookbook</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[#101814] sm:text-5xl">Recipes</h1>
        </div>
        <Link
          href="/scan"
          className="flex items-center gap-2 rounded-full bg-[#1F8A4C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#176F3C]"
        >
          <Camera className="h-4 w-4" />
          Find new recipes
        </Link>
      </div>

      {/* Search (a normal form: works even before JavaScript loads) */}
      <form action="/recipes" className="mb-8 flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-xl bg-white px-4 shadow-sm ring-1 ring-[#101814]/10 focus-within:ring-2 focus-within:ring-[#1F8A4C]">
          <Search className="h-4 w-4 shrink-0 text-[#101814]/50" />
          <input
            name="q"
            defaultValue={q}
            autoFocus={Boolean(search || q)}
            placeholder="Search by idea, e.g. “something warm with chicken”"
            className="h-12 w-full bg-transparent text-sm text-[#101814] outline-none placeholder:text-[#101814]/40"
          />
          {q && (
            <Link href="/recipes" aria-label="Clear search" className="rounded-full p-1 text-[#101814]/50 hover:text-[#101814]">
              <X className="h-4 w-4" />
            </Link>
          )}
        </label>
        <button
          type="submit"
          className="rounded-full bg-[#1F8A4C] px-6 text-sm font-medium text-white transition hover:bg-[#176F3C]"
        >
          Search
        </button>
      </form>

      {q && (
        <p className="-mt-4 mb-6 text-sm text-[#101814]/60">
          {list.length} result{list.length === 1 ? "" : "s"} for “{q}”, best match first
        </p>
      )}

      {list.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center border border-black/5 shadow-sm">
          <ChefHat className="mx-auto h-10 w-10 text-[#101814]/30" />
          <p className="mt-3 font-medium text-[#101814]">{q ? "No recipes found." : "No recipes yet."}</p>
          <p className="mt-1 text-sm text-[#101814]/60">Scan your fridge and NutriGo will suggest some.</p>
          <Link
            href="/scan"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1F8A4C] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#176F3C]"
          >
            <Camera className="h-4 w-4" />
            Scan my fridge
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recipes/${recipe.id}`}
                className="flex h-full flex-col overflow-hidden rounded-2xl bg-white border border-black/5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {recipe.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={recipe.imageUrl} alt="" className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-gradient-to-br from-[#E6F4EA] to-[#1F8A4C]/60">
                    <ChefHat className="h-10 w-10 text-[#101814]/30" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-semibold text-[#101814]">{recipe.title}</h2>
                  {recipe.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-[#101814]/60">{recipe.description}</p>
                  )}
                  <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-[#101814]/60">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {recipe.cookingTime ?? "—"}
                    </span>
                    {recipe.nutrition && <span>{recipe.nutrition.calories} kcal</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function RecipesSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-12 w-60 rounded-full bg-white" />
      <div className="mt-8 h-12 rounded-full bg-white" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-white" />
        ))}
      </div>
    </div>
  );
}
