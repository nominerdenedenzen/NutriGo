import { gemini } from '@/lib/gemini';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { recipes as recipesTable } from '@/db/schema';
import { addRecipesToPinecone } from '@/lib/pinecone';
import { findRecipeImage } from '@/lib/recipeImage';
import { FREE_AI_REQUESTS_PER_DAY, aiRequestsToday, isPremium, recordAiRequest } from '@/lib/premium';


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

  // 1b. Free accounts get a few AI searches a day; Premium is unlimited
  const premium = await isPremium(userId);
  if (!premium && (await aiRequestsToday(userId)) >= FREE_AI_REQUESTS_PER_DAY) {
    return Response.json(
      {
        error: `You've used your ${FREE_AI_REQUESTS_PER_DAY} free AI searches for today. Get Premium for unlimited recipes.`,
        upgrade: true,
      },
      { status: 402 },
    );
  }

  // 2. Get the ingredients sent to this route
  const body = await request.json();
  const ingredients = toStringList(body.ingredients).slice(0, 40);
  if (ingredients.length === 0) {
    return Response.json({ error: 'No ingredients sent.' }, { status: 400 });
  }

  try {
    // 3. Ask Gemini for recipes as JSON
    const response = await gemini().models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `I have these ingredients: ${ingredients.join(', ')}.
Suggest 3 simple recipes.
Answer with only a JSON array. Each recipe must have exactly these fields:
- "name": the recipe name (string)
- "description": one appetizing sentence about the dish (string)
- "cookingTime": how long it takes, like "20 minutes" (string)
- "ingredients": every ingredient needed (array of strings)
- "instructions": short cooking steps in order (array of strings)
- "nutrition": your best estimate for ONE serving, as {"calories": number, "protein": grams, "carbs": grams, "fat": grams}
- "imageQuery": the common name of this kind of dish in 1 or 2 lowercase words, used to find a photo, like "fried rice", "omelette", "salmon", "soup", "pasta" (string)`,
      config: { responseMimeType: 'application/json' },
    });

    // 4. Turn Gemini's text into a list, and clean every recipe
    const raw = JSON.parse(response.text ?? '[]');
    if (!Array.isArray(raw)) throw new Error('Gemini did not return a list');

    const cleaned = raw.map((recipe: Record<string, unknown>) => ({
      id: `ai-${crypto.randomUUID()}`, // the same id is used in Supabase AND Pinecone
      name: typeof recipe.name === 'string' ? recipe.name : 'Untitled recipe',
      description: typeof recipe.description === 'string' ? recipe.description : '',
      nutrition: toNutrition(recipe.nutrition),
      cookingTime: typeof recipe.cookingTime === 'string' ? recipe.cookingTime : 'Unknown',
      ingredients: toStringList(recipe.ingredients),
      instructions: toStringList(recipe.instructions),
      imageQuery: typeof recipe.imageQuery === 'string' ? recipe.imageQuery : undefined,
    }));

    // 4b. Find a photo for each dish (all 3 at the same time). "" = none found, show a placeholder.
    const recipes = await Promise.all(
      cleaned.map(async ({ imageQuery, ...recipe }) => ({
        ...recipe,
        imageUrl: (await findRecipeImage(recipe.name, imageQuery)) ?? '',
      })),
    );

    // 5. Save the recipes in Supabase, so they get a page at /recipes/[id]
    await db.insert(recipesTable).values(
      recipes.map((recipe) => ({
        id: recipe.id,
        title: recipe.name,
        description: recipe.description,
        nutrition: recipe.nutrition,
        source: 'ai',
        ingredients: recipe.ingredients.map((name) => ({ name, measure: '' })),
        instructions: recipe.instructions.join('\n'),
        cookingTime: recipe.cookingTime,
        imageUrl: recipe.imageUrl,
        createdBy: userId,
      })),
    );

    // 6. Also save them in Pinecone, so they can be found by meaning later.
    //    If Pinecone fails, still show the recipes.
    try {
      await addRecipesToPinecone(
        recipes.map((recipe) => ({
          id: recipe.id,
          title: recipe.name,
          description: recipe.description,
          ingredients: recipe.ingredients,
          source: 'ai',
          createdBy: userId,
        })),
      );
    } catch (pineconeError) {
      console.error('Saving to Pinecone failed:', pineconeError);
    }

    // 7. Count this search towards the free daily limit
    if (!premium) await recordAiRequest(userId);

    // 8. Send the recipes back
    return Response.json({ recipes });
  } catch (error) {
    console.error('Gemini failed:', error);
    return Response.json({ error: 'Could not get recipes, try again.' }, { status: 500 });
  }
}
