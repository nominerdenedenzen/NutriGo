// Reads ingredients from a food photo using Google Gemini (it can understand images).
// Needs GEMINI_API_KEY in .env.local (free key from https://aistudio.google.com/apikey).
import { createPartFromBase64 } from '@google/genai';
import { gemini } from '@/lib/gemini';

const MODEL_ID = 'gemini-3.5-flash-lite';
const MAX_ITEMS = 20;


const PROMPT =
  'Name every individual food item you can see in this image. Be specific: give the exact name of each one ' +
  '(for example potato, carrot, red onion, tomato), never general words like vegetables, fruit or food. ' +
  'Answer with a JSON array of lowercase strings, e.g. ["tomato","garlic","basil"]. ' +
  'If there is no food in the image, answer [].';

// Turn a "data:image/png;base64,..." string or an https:// link into base64 + mime type
async function toBase64(imageUrlOrBase64: string) {
  const match = imageUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { mimeType: match[1], data: match[2] };

  const res = await fetch(imageUrlOrBase64);
  if (!res.ok) throw new Error(`Could not download image (${res.status})`);
  const mimeType = res.headers.get('content-type') ?? 'image/jpeg';
  const data = Buffer.from(await res.arrayBuffer()).toString('base64');
  return { mimeType, data };
}

export async function extractIngredientsFromImage(imageUrlOrBase64: string): Promise<string[]> {
  try {
    const { mimeType, data } = await toBase64(imageUrlOrBase64);

    const response = await gemini().models.generateContent({
      model: MODEL_ID,
      contents: [createPartFromBase64(data, mimeType), PROMPT],
      config: { responseMimeType: 'application/json', temperature: 0 },
    });

    const list: unknown = JSON.parse(response.text ?? '[]');
    if (!Array.isArray(list)) return [];

    const items = list
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 1);
    return [...new Set(items)].slice(0, MAX_ITEMS);
  } catch (error) {
    // Never break the upload because the AI step failed
    console.error('Ingredient extraction failed:', error);
    return [];
  }
}
