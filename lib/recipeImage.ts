// Finds a photo of a dish using Wikipedia's free search API (no key needed).
// Example: "fried rice" -> https://upload.wikimedia.org/...Fried_rice.jpg
// Returns null if nothing is found, so the page can show a placeholder instead.

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';

type WikiPage = { index: number; thumbnail?: { source: string } };

export async function findRecipeImage(dishName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${dishName} food dish`,
    gsrlimit: '5',
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: '640',
    format: 'json',
    formatversion: '2',
  });

  try {
    const res = await fetch(`${WIKIPEDIA_API}?${params}`, {
      headers: { 'User-Agent': 'RecipeImageLookup/1.0' }, // Wikipedia asks for a User-Agent
      signal: AbortSignal.timeout(5000), // don't make the user wait forever
    });
    if (!res.ok) return null;

    const data = await res.json();
    const pages: WikiPage[] = data?.query?.pages ?? [];

    // Take the best search match that has a picture
    const best = pages
      .sort((a, b) => a.index - b.index)
      .find((page) => page.thumbnail?.source);
    return best?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}
