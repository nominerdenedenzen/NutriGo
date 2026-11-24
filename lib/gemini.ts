// One shared Gemini client for the whole app.
// It is created the first time it is used (not when the file loads), because `next build`
// loads every route to inspect it: a missing key must not break the build, only the feature that needs it.
import "server-only";
import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function gemini() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY in the environment variables");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}
