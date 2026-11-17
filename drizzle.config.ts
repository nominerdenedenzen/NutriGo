import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Load .env the same way Next.js does.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Prefer the session pooler (port 5432) for creating/changing tables;
  // fall back to DATABASE_URL if DIRECT_URL isn't set.
  dbCredentials: { url: (process.env.DIRECT_URL ?? process.env.DATABASE_URL)! },
});
