import { GoogleGenAI } from '@google/genai';
import { auth } from '@clerk/nextjs/server';

// Create the Gemini client once (outside the function)
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

export async function POST(request: Request) {
  // 1. Only signed-in users
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  // 2. Get the ingredients sent to this route
  const { ingredients } = await request.json();
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return Response.json({ error: 'No ingredients sent.' }, { status: 400 });
  }

  try {
    // 3. Ask Gemini (your "const response" goes here)
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `I have these ingredients: ${ingredients.join(', ')}.
Suggest 3 simple recipes I can make. For each one, give the name,
cooking time, any extra ingredients needed, and short steps.`,
    });

    // 4. Send Gemini's answer back
    return Response.json({ recipes: response.text });
  } catch (error) {
    console.error('Gemini failed:', error);
    return Response.json({ error: 'Could not get recipes, try again.' }, { status: 500 });
  }
}
