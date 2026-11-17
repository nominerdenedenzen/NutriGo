import { pgTable, uuid, text, timestamp, jsonb, integer, real, primaryKey } from "drizzle-orm/pg-core";

// One row per photo a user uploads.
export const scans = pgTable("scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // Clerk user ID
  photoPath: text("photo_path").notNull(), // path inside the fridge-photos bucket
  ingredients: jsonb("ingredients").$type<string[]>(), // filled in week 3 (Hugging Face)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Every recipe the app has seen (TheMealDB, Spoonacular, or AI-written).
export const recipes = pgTable("recipes", {
  id: text("id").primaryKey(), // e.g. 'mealdb-52772'
  title: text("title").notNull(),
  source: text("source"), // mealdb | spoonacular | ai
  imageUrl: text("image_url"),
  ingredients: jsonb("ingredients").$type<{ name: string; measure: string }[]>(),
  instructions: text("instructions"),
  servings: integer("servings").default(2),
  nutrition: jsonb("nutrition"), // filled in week 5
});

// Recipes a user saved with the heart button.
export const favourites = pgTable(
  "favourites",
  {
    userId: text("user_id").notNull(),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.recipeId] })],
);

// USDA answers, per 100 g, so each ingredient is looked up only once.
export const nutritionCache = pgTable("nutrition_cache", {
  ingredient: text("ingredient").primaryKey(),
  kcal: real("kcal"),
  protein: real("protein"),
  fat: real("fat"),
  carbs: real("carbs"),
});
