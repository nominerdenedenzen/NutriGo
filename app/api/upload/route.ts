import { auth } from "@clerk/nextjs/server";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { db } from "@/db";
import { scans } from "@/db/schema";
import { extractIngredientsFromImage } from "@/lib/extractIngredient";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Please sign in first." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("photo");

  if (!(file instanceof File)) {
    return Response.json({ error: "No photo was sent." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return Response.json({ error: "Use a JPG, PNG or WebP image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Photo is too big (max 5 MB)." }, { status: 400 });
  }

  const ext = file.type.split("/")[1];
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase().storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error("Supabase upload failed:", error.message);
    return Response.json({ error: "Upload failed, try again." }, { status: 500 });
  }

  // Convert uploaded file to Base64 data URL for Hugging Face vision model
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  // Extract ingredients once and save directly into scans.ingredients
  const ingredients = await extractIngredientsFromImage(dataUrl);

  const [scan] = await db
    .insert(scans)
    .values({ userId, photoPath: path, ingredients })
    .returning({ id: scans.id, ingredients: scans.ingredients });

  const { data: signed } = await supabase().storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60);

  return Response.json({
    scanId: scan.id,
    path,
    url: signed?.signedUrl ?? null,
    ingredients: scan.ingredients,
  });
}