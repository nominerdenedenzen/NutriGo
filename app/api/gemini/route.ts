import { GoogleGenAI } from '@google/genai';
import { auth } from '@clerk/nextjs/server';
import { findRecipeImage } from '@/lib/recipeImage';
import { db } from '@/db';
import { recipes as recipesTable } from '@/db/schema';

// Create the Gemini client once (outside the function)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MAX_INGREDIENTS = 40;
const MAX_LENGTH = 40; // characters per ingredient

// Make sure a value from Gemini is a clean list of strings
function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map((s) => s.trim());
}

// Gemini's nutrition estimate -> { calories, protein, carbs, fat }, or null if it is unusable
function toNutrition(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const n = value as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && v >= 0 ? Math.round(v) : null);
  const [calories, protein, carbs, fat] = [num(n.calories), num(n.protein), num(n.carbs), num(n.fat)];
  if (calories === null || protein === null || carbs === null || fat === null) return null;
  return { calories, protein, carbs, fat };
}

export async function POST(request: Request) {
  // 1. Only signed-in users
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  // 2. Get the ingredients sent to this route (from the photo + typed by the user)
  const body = await request.json();
  const ingredients = toStringList(body.ingredients)
    .map((s) => s.slice(0, MAX_LENGTH).toLowerCase())
    .slice(0, MAX_INGREDIENTS);
  if (ingredients.length === 0) {
    return Response.json({ error: 'No ingredients sent.' }, { status: 400 });
  }

  try {
    // 3. Ask Gemini for recipes as JSON
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `I have these ingredients: ${ingredients.join(', ')}.
Salt, pepper, water and cooking oil count as things I already have.

Suggest 6 simple recipes:
- 3 recipes that use ONLY my ingredients (missingIngredients must be empty)
- 3 recipes that need 1 to 3 extra ingredients I don't have

Answer with only a JSON array. Each recipe must have exactly these fields:
- "name": the recipe name (string)
- "description": one or two appetizing sentences about the dish (string)
- "dishType": the well-known English name of this kind of dish, 1 to 3 words, used to find a photo, like "omelette", "fried rice", "tomato soup" (string)
- "cookingTime": how long it takes, like "20 minutes" (string)
- "difficulty": "easy", "medium" or "hard" (string)
- "servings": how many people it feeds (number)
- "ingredients": every ingredient the recipe uses, including the missing ones (array of strings)
- "missingIngredients": the ingredients from the list above that I do NOT have (array of strings)
- "instructions": short cooking steps in order (array of strings)
- "nutrition": your best estimate for ONE serving, as {"calories": number, "protein": grams, "carbs": grams, "fat": grams}
- "tips": 2 or 3 short, useful cooking tips for this dish (array of strings)`,
      config: { responseMimeType: 'application/json' },
    });

    // 4. Catch each piece of every recipe and sort it into one const
    const raw = JSON.parse(response.text ?? '[]');
    if (!Array.isArray(raw)) throw new Error('Gemini did not return a list');

    type RawRecipe = Record<string, unknown>;

    const recipes = (raw as RawRecipe[]).map((recipe) => ({
      name: typeof recipe.name === 'string' ? recipe.name : 'Untitled recipe',
      description: typeof recipe.description === 'string' ? recipe.description : '',
      dishType: typeof recipe.dishType === 'string' ? recipe.dishType : '',
      cookingTime: typeof recipe.cookingTime === 'string' ? recipe.cookingTime : 'Unknown',
      difficulty: ['easy', 'medium', 'hard'].includes(recipe.difficulty as string)
        ? (recipe.difficulty as string)
        : 'easy',
      servings: typeof recipe.servings === 'number' ? Math.round(recipe.servings) : 2,
      ingredients: toStringList(recipe.ingredients),
      // Anything the user already has is not "missing", even if Gemini says so
      missingIngredients: toStringList(recipe.missingIngredients).filter(
        (m) => !ingredients.includes(m.toLowerCase()),
      ),
      instructions: toStringList(recipe.instructions),
      nutrition: toNutrition(recipe.nutrition),
      tips: toStringList(recipe.tips).slice(0, 3),
    }));

    // 5. Find a photo for every recipe at the same time (null = no photo found)
    const withImages = await Promise.all(
      recipes.map(async ({ dishType, ...recipe }) => ({
        ...recipe,
        image: await findRecipeImage(dishType || recipe.name),
      })),
    );

    // 6. Save every recipe so it gets its own page (/recipes/[id]) and can go on the meal plan.
    //    If saving fails, still show the recipes, just without the "Check more" link.
    const saved = withImages.map((recipe) => ({ ...recipe, id: `ai-${crypto.randomUUID()}` as string | null }));
    try {
      await db.insert(recipesTable).values(
        saved.map((recipe) => ({
          id: recipe.id!,
          title: recipe.name,
          source: 'ai',
          imageUrl: recipe.image,
          ingredients: recipe.ingredients.map((name) => ({ name, measure: '' })),
          instructions: recipe.instructions.join('\n'),
          servings: recipe.servings,
          description: recipe.description,
          cookingTime: recipe.cookingTime,
          difficulty: recipe.difficulty,
          createdBy: userId,
          missingIngredients: recipe.missingIngredients,
          nutrition: recipe.nutrition,
          tips: recipe.tips,
        })),
      );
    } catch (dbError) {
      console.error('Saving recipes failed:', dbError);
      saved.forEach((recipe) => (recipe.id = null));
    }

    // 7. Send the organized recipes back
    return Response.json({ recipes: saved });
  } catch (error) {
    console.error('Gemini failed:', error);
    return Response.json({ error: 'Could not get recipes, try again.' }, { status: 500 });
  }
}
