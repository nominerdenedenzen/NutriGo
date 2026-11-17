import { auth } from "@clerk/nextjs/server";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { db } from "@/db";
import { scans } from "@/db/schema";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  // Who is uploading? Read it on the server, never trust the browser.
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

  // Each user gets their own folder: fridge-photos/<userId>/<random>.jpg
  const ext = file.type.split("/")[1];
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error("Supabase upload failed:", error.message);
    return Response.json({ error: "Upload failed, try again." }, { status: 500 });
  }

  // Remember the upload in the scans table.
  const [scan] = await db
    .insert(scans)
    .values({ userId, photoPath: path })
    .returning({ id: scans.id });

  // The bucket is private, so make a temporary link (1 hour) to show the photo.
  const { data: signed } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60);

  return Response.json({ scanId: scan.id, path, url: signed?.signedUrl ?? null });
}
