import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { Camera, CheckCircle2, ChefHat, Clock, Heart, Search, ShoppingCart, X } from "lucide-react";
import { db } from "@/db";
import { favourites, recipes } from "@/db/schema";
import { findSimilarRecipeIds } from "@/lib/pinecone";
import { ensureRecipeImages } from "@/lib/recipeImage";
import { findMissing, getPantry } from "@/lib/pantry";
import FavouriteButton from "./FavouriteButton";

type SearchParams = Promise<{ q?: string; search?: string }>;
type Recipe = typeof recipes.$inferSelect;
// A recipe + what the user still needs for it (null = we don't know, they never scanned)
type Card = { recipe: Recipe; missing: string[] | null; favourite: boolean };

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

  let list: Recipe[];
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

  // The user's saved recipes, and what is in their fridge (from the last scan)
  const [favRows, pantry] = await Promise.all([
    db
      .select({ recipe: recipes })
      .from(favourites)
      .innerJoin(recipes, eq(favourites.recipeId, recipes.id))
      .where(and(eq(favourites.userId, userId), visible)),
    getPantry(userId),
  ]);
  const favIds = new Set(favRows.map((f) => f.recipe.id));

  // Older recipes have no photo yet: look them up once and save them (favourites + list together)
  const all = [...new Map([...favRows.map((f) => f.recipe), ...list].map((r) => [r.id, r])).values()];
  const withImages = new Map((await ensureRecipeImages(all)).map((r) => [r.id, r]));

  const toCard = (recipe: Recipe): Card => ({
    recipe: withImages.get(recipe.id) ?? recipe,
    missing: pantry
      ? findMissing((recipe.ingredients ?? []).map((i) => i.name), pantry.items)
      : (recipe.missingIngredients ?? null),
    favourite: favIds.has(recipe.id),
  });

  const cards = list.map(toCard);
  const favCards = favRows.map((f) => toCard(f.recipe));
  const ready = cards.filter((c) => c.missing !== null && c.missing.length === 0);
  // Fewest missing ingredients first: those are the easiest to finish
  const needMore = cards
    .filter((c) => c.missing !== null && c.missing.length > 0)
    .sort((a, b) => a.missing!.length - b.missing!.length);
  const unknown = cards.filter((c) => c.missing === null);

  const scannedOn = pantry?.scannedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });

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
      <form action="/recipes" className="mb-6 flex gap-2">
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

      {/* Where the "do I have it?" info comes from */}
      {pantry ? (
        <p className="mb-6 text-sm text-[#101814]/60">
          Checked against your fridge scan from {scannedOn} ({pantry.items.length} ingredients). Salt, pepper and
          water are assumed.{" "}
          <Link href="/scan" className="font-medium text-[#1F8A4C] hover:underline">
            Scan again
          </Link>
        </p>
      ) : (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#E6F4EA]/50 p-4 text-sm text-[#101814] ring-1 ring-[#1F8A4C]/20">
          <span>📸 Scan your fridge and we&apos;ll show which recipes you can cook right now and what you&apos;d need to buy.</span>
          <Link href="/scan" className="font-semibold text-[#1F8A4C] hover:underline">
            Scan my fridge
          </Link>
        </div>
      )}

      {q && (
        <p className="mb-6 text-sm text-[#101814]/60">
          {list.length} result{list.length === 1 ? "" : "s"} for “{q}”, best match first
        </p>
      )}

      {/* Jump links */}
      {list.length > 0 && (
        <nav aria-label="Recipe sections" className="mb-8 flex flex-wrap gap-2">
          {!q && <JumpLink href="#favourites" icon={Heart} label="Favourites" count={favCards.length} />}
          {pantry && <JumpLink href="#ready" icon={CheckCircle2} label="Ready to cook" count={ready.length} />}
          {pantry && <JumpLink href="#missing" icon={ShoppingCart} label="Missing ingredients" count={needMore.length} />}
        </nav>
      )}

      {list.length === 0 && favCards.length === 0 ? (
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
        <div className="space-y-12">
          {/* ===== Favourites (hidden while searching) ===== */}
          {!q && (
            <Section
              id="favourites"
              icon={<Heart className="h-5 w-5 fill-rose-500 text-rose-500" />}
              title="My favourites"
              subtitle="Recipes you saved for later."
              cards={favCards}
              empty="Nothing saved yet. Tap the ♡ on any recipe to keep it here."
            />
          )}

          {pantry ? (
            <>
              <Section
                id="ready"
                icon={<CheckCircle2 className="h-5 w-5 text-[#1F8A4C]" />}
                title="Ready to cook"
                subtitle="You have every ingredient for these."
                cards={ready}
                empty="No recipe matches your fridge completely yet. Check the ones below: some only need one or two things."
              />
              <Section
                id="missing"
                icon={<ShoppingCart className="h-5 w-5 text-amber-600" />}
                title="Missing ingredients"
                subtitle="You need to buy a few things first. Fewest missing at the top."
                cards={needMore}
                empty="Nothing here: you can cook every recipe on this page!"
              />
              {unknown.length > 0 && <Section id="other" title="Other recipes" cards={unknown} />}
            </>
          ) : (
            <Section id="all" title={q ? "Results" : "All recipes"} cards={cards} />
          )}
        </div>
      )}
    </>
  );
}

function JumpLink({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  icon: typeof Heart;
  label: string;
  count: number;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-[#101814] border border-black/5 shadow-sm transition hover:bg-[#101814]/5"
    >
      <Icon className="h-4 w-4 text-[#101814]/60" />
      {label}
      <span className="rounded-full bg-[#101814]/5 px-2 text-xs text-[#101814]/70">{count}</span>
    </a>
  );
}

function Section({
  id,
  icon,
  title,
  subtitle,
  cards,
  empty,
}: {
  id: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  cards: Card[];
  empty?: string;
}) {
  if (cards.length === 0 && !empty) return null;
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#101814]">
          {icon}
          {title}
          <span className="text-base font-normal text-[#101814]/40">{cards.length}</span>
        </h2>
        {subtitle && <p className="mt-1 text-sm text-[#101814]/60">{subtitle}</p>}
      </div>
      {cards.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-[#101814]/10 p-6 text-center text-sm text-[#101814]/60">
          {empty}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <RecipeCard key={card.recipe.id} {...card} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RecipeCard({ recipe, missing, favourite }: Card) {
  return (
    <li className="relative">
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
          <h3 className="font-semibold text-[#101814]">{recipe.title}</h3>
          {recipe.description && (
            <p className="mt-1 line-clamp-2 text-sm text-[#101814]/60">{recipe.description}</p>
          )}

          {/* What the user has / needs */}
          {missing !== null &&
            (missing.length === 0 ? (
              <p className="mt-3 inline-flex w-fit items-center gap-1 rounded-lg bg-[#E6F4EA] px-2 py-1 text-xs font-semibold text-[#176F3C]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                You have everything
              </p>
            ) : (
              <div className="mt-3">
                <p className="text-xs font-semibold text-amber-800">
                  Missing {missing.length} ingredient{missing.length > 1 ? "s" : ""}:
                </p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {missing.slice(0, 4).map((m) => (
                    <li key={m} className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs capitalize text-amber-900 ring-1 ring-amber-200">
                      {m}
                    </li>
                  ))}
                  {missing.length > 4 && (
                    <li className="px-1 py-0.5 text-xs text-amber-800">+{missing.length - 4} more</li>
                  )}
                </ul>
              </div>
            ))}

          <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-[#101814]/60">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {recipe.cookingTime ?? "—"}
            </span>
            {recipe.nutrition && <span>{recipe.nutrition.calories} kcal</span>}
          </div>
        </div>
      </Link>

      {/* Heart sits on top of the photo (outside the link, so clicking it doesn't open the recipe) */}
      <div className="absolute right-3 top-3">
        <FavouriteButton recipeId={recipe.id} initial={favourite} />
      </div>
    </li>
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
