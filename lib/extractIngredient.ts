// Reads ingredients from a food photo using a Hugging Face vision model
// (SmolVLM) running locally via transformers.js — free, no API key, no credits.
// The model (~500 MB) downloads once on first use and is cached after that.
import {
  AutoProcessor,
  AutoModelForVision2Seq,
  RawImage,
  type Processor,
  type PreTrainedModel,
} from '@huggingface/transformers';

const MODEL_ID = process.env.HF_VISION_MODEL ?? 'HuggingFaceTB/SmolVLM-500M-Instruct';

const PROMPT =
  'Name every individual food item you can see in this image. Be specific: give the exact name of each one ' +
  '(for example potato, carrot, red onion, tomato), never general words like vegetables, fruit or food. ' +
  'Answer with only a comma-separated list.';

// Words that are too general to be useful as an ingredient
const GENERIC = new Set(['vegetable', 'vegetables', 'fruit', 'fruits', 'food', 'foods', 'meal', 'dish', 'ingredients']);
const MAX_ITEMS = 12;

// Load the model once and reuse it for every request
let loading: Promise<{ processor: Processor; model: PreTrainedModel }> | null = null;
function getModel() {
  loading ??= (async () => {
    const processor = await AutoProcessor.from_pretrained(MODEL_ID);
    const model = await AutoModelForVision2Seq.from_pretrained(MODEL_ID, { dtype: 'q4' });
    return { processor, model };
  })().catch((err) => {
    loading = null; // allow a retry next time
    throw err;
  });
  return loading;
}

async function loadImage(imageUrlOrBase64: string) {
  const match = imageUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    const blob = new Blob([Buffer.from(match[2], 'base64')], { type: match[1] });
    return RawImage.fromBlob(blob);
  }
  return RawImage.fromURL(imageUrlOrBase64);
}

// Turn the model's free-text answer into a clean list, e.g.
// "The ingredients are: tomato, two cloves of garlic and basil." -> ["tomato", "garlic", "basil"]
function parseIngredients(text: string): string[] {
  const body = text.includes(':') ? text.slice(text.indexOf(':') + 1) : text;
  const items = body
    .split(/,|\n|;|\band\b/i)
    .map((s) =>
      s
        .replace(/^[\s\-*•\d.)]+/, '') // bullets / numbering
        .replace(/^(?:.*\bthere (?:is|are)\s+)/i, '') // "On the left there are ..."
        .replace(/^(?:a|an|the|some|two|three|four|five|several|few|pieces? of|cloves? of|slices? of)\s+/gi, '')
        .replace(/[.!"]+$/g, '')
        .trim()
        .toLowerCase(),
    )
    .filter((s) => s.length > 1 && s.split(' ').length <= 4 && !GENERIC.has(s));
  return [...new Set(items)].slice(0, MAX_ITEMS);
}

export async function extractIngredientsFromImage(imageUrlOrBase64: string): Promise<string[]> {
  try {
    const { processor, model } = await getModel();
    const image = await loadImage(imageUrlOrBase64);

    const messages = [{ role: 'user', content: [{ type: 'image' }, { type: 'text', text: PROMPT }] }];
    const text = processor.apply_chat_template(messages, { add_generation_prompt: true });
    const inputs = await processor(text, [image]);

    const output = (await model.generate({ ...inputs, max_new_tokens: 100, do_sample: false, repetition_penalty: 1.2 })) as any;
    const promptLength = inputs.input_ids.dims.at(-1);
    const [reply] = processor.batch_decode(output.slice(null, [promptLength, null]), {
      skip_special_tokens: true,
    });

    return parseIngredients(reply ?? '');
  } catch (error) {
    // Never break the upload because the AI step failed
    console.error('Ingredient extraction failed:', error);
    return [];
  }
}
