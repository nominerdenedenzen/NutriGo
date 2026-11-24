// Works out a daily nutrition plan from a person's body details.
// Plain math, no database: safe to use on the server AND in the browser.
//
// How it works:
// 1. BMR  = calories your body burns resting all day (Mifflin-St Jeor formula, the one dietitians use)
// 2. TDEE = BMR x activity level  -> calories you burn on a normal day
// 3. Goal: lose weight = eat 500 less, gain = eat 300 more
// 4. Split the calories into protein, fat and carbs

export const SEXES = ["male", "female"] as const;
export type Sex = (typeof SEXES)[number];

export const ACTIVITIES = [
  { value: "sedentary", label: "Not active", hint: "Desk job, little or no exercise", factor: 1.2, proteinPerKg: 1.2, extraWaterL: 0 },
  { value: "light", label: "Light", hint: "Light exercise 1–3 days a week", factor: 1.375, proteinPerKg: 1.4, extraWaterL: 0 },
  { value: "moderate", label: "Moderate", hint: "Exercise 3–5 days a week", factor: 1.55, proteinPerKg: 1.6, extraWaterL: 0.3 },
  { value: "hard", label: "Hard", hint: "Hard exercise 6–7 days a week", factor: 1.725, proteinPerKg: 1.8, extraWaterL: 0.5 },
  { value: "very_hard", label: "Very hard", hint: "Physical job or training twice a day", factor: 1.9, proteinPerKg: 2.0, extraWaterL: 0.75 },
] as const;
export type Activity = (typeof ACTIVITIES)[number]["value"];

export const GOALS = [
  { value: "lose", label: "Lose weight", calorieChange: -500 },
  { value: "maintain", label: "Stay the same", calorieChange: 0 },
  { value: "gain", label: "Gain muscle", calorieChange: 300 },
] as const;
export type Goal = (typeof GOALS)[number]["value"];

export type Profile = {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activity: Activity;
  goal: Goal;
};

export type DailyPlan = {
  bmr: number; // kcal burned resting
  tdee: number; // kcal burned on a normal day
  calories: number; // kcal to eat per day
  protein: number; // g
  fat: number; // g
  carbs: number; // g
  waterL: number; // litres
  meals: { name: string; calories: number }[];
};

// How the day's calories are spread over the meals
const MEAL_SPLIT = [
  { name: "Breakfast", share: 0.25 },
  { name: "Lunch", share: 0.35 },
  { name: "Dinner", share: 0.3 },
  { name: "Snack", share: 0.1 },
];

export function dailyPlan(p: Profile): DailyPlan {
  const activity = ACTIVITIES.find((a) => a.value === p.activity) ?? ACTIVITIES[0];
  const goal = GOALS.find((g) => g.value === p.goal) ?? GOALS[1];

  // 1. Mifflin-St Jeor: men +5, women -161
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);

  // 2. Calories burned on a normal day
  const tdee = bmr * activity.factor;

  // 3. Goal, but never below a safe minimum
  const minimum = p.sex === "male" ? 1500 : 1200;
  const calories = Math.max(minimum, tdee + goal.calorieChange);

  // 4. Protein: more when you train harder or want to lose fat (keeps muscle)
  const proteinPerKg = activity.proteinPerKg + (p.goal === "lose" ? 0.2 : 0);
  const protein = p.weightKg * proteinPerKg;
  const fat = (calories * 0.25) / 9; // 25% of calories, 9 kcal per gram
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4); // the rest, 4 kcal per gram

  const round = Math.round;
  return {
    bmr: round(bmr),
    tdee: round(tdee),
    calories: round(calories),
    protein: round(protein),
    fat: round(fat),
    carbs: round(carbs),
    waterL: Math.round((p.weightKg * 0.035 + activity.extraWaterL) * 10) / 10,
    meals: MEAL_SPLIT.map((m) => ({ name: m.name, calories: round(calories * m.share) })),
  };
}
