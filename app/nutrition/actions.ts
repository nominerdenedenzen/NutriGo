"use server";

// Server Action for the "About you" form on /nutrition.
// It runs on the server, so it checks who is signed in and checks every value
// (the browser form could be changed by anyone, never trust it).
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ACTIVITIES, GOALS, SEXES, type Activity, type Goal, type Sex } from "@/lib/nutritionPlan";

export type ProfileFormState = { error: string } | null;

// Read a number from the form and check it is inside a sensible range
function numberBetween(form: FormData, field: string, min: number, max: number) {
  const value = Number(form.get(field));
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

export async function saveProfile(_prev: ProfileFormState, form: FormData): Promise<ProfileFormState> {
  const { userId } = await auth();
  if (!userId) return { error: "Please sign in first." };

  const sex = form.get("sex") as Sex;
  const activity = form.get("activity") as Activity;
  const goal = form.get("goal") as Goal;
  const age = numberBetween(form, "age", 13, 100);
  const weightKg = numberBetween(form, "weightKg", 30, 300);
  const heightCm = numberBetween(form, "heightCm", 120, 230);

  if (!SEXES.includes(sex)) return { error: "Choose male or female." };
  if (age === null) return { error: "Age must be between 13 and 100." };
  if (weightKg === null) return { error: "Weight must be between 30 and 300 kg." };
  if (heightCm === null) return { error: "Height must be between 120 and 230 cm." };
  if (!ACTIVITIES.some((a) => a.value === activity)) return { error: "Choose how much you exercise." };
  if (!GOALS.some((g) => g.value === goal)) return { error: "Choose a goal." };

  const values = { sex, age: Math.round(age), weightKg, heightCm, activity, goal, updatedAt: new Date() };

  // Insert, or update if this user already has a profile
  await db
    .insert(profiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values });

  // Back to the plan (this also leaves "edit" mode)
  redirect("/nutrition");
}
