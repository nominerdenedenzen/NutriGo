import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client. Uses the service role key, so it must NEVER
// be imported from a "use client" component.
// Created the first time it is used (not when the file loads), so `next build`
// doesn't fail when the keys aren't set yet.
let client: SupabaseClient | null = null;

export function supabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment variables");
    }
    client = createClient(url, serviceKey, { auth: { persistSession: false } });
  }
  return client;
}

export const PHOTO_BUCKET = "fridge-photos";
