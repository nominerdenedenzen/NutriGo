import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client. Uses the service role key, so it must NEVER
// be imported from a "use client" component.
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

export const PHOTO_BUCKET = "fridge-photos";
