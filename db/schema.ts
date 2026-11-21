import type { WeekDay } from "@/lib/weekDays";
import { pgTable, uuid, text, timestamp, jsonb, integer, real, primaryKey, boolean, unique } from "drizzle-orm/pg-core";

export type Nutrition = { calories: number; protein: number; carbs: number; fat: number };

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
  nutrition: jsonb("nutrition").$type<Nutrition>(), // per serving (AI recipes: Gemini's estimate)
  // Extra details for AI-written recipes
  description: text("description"),
  cookingTime: text("cooking_time"), // e.g. "20 minutes"
  difficulty: text("difficulty"), // easy | medium | hard
  createdBy: text("created_by"), // Clerk user ID of who asked Gemini for it
  missingIngredients: jsonb("missing_ingredients").$type<string[]>(), // what that user didn't have
  tips: jsonb("tips").$type<string[]>(), // short cooking tips
  createdAt: timestamp("created_at").defaultNow(),
});

// One row per meal a user put on their weekly plan.
export const mealPlan = pgTable("meal_plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  day: text("day").$type<WeekDay>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One row per item on a user's grocery list.
export const groceryItems = pgTable(
  "grocery_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(), // lowercase ingredient name
    forRecipes: jsonb("for_recipes").$type<string[]>().default([]).notNull(), // recipe titles that need it
    checked: boolean("checked").default(false).notNull(), // true = bought
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.name)], // each item only once per user
);

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
