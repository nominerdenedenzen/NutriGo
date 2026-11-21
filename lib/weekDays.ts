// The days a meal can be planned on, in order.
// Kept in its own file so both the database schema and browser code can use it.
export const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

// Today's day name. JavaScript's getDay() counts 0 = Sunday, 1 = Monday ...
export function todayWeekDay(): WeekDay {
  return WEEK_DAYS[(new Date().getDay() + 6) % 7];
}

// The date (day of the month) of every day in the current Monday–Sunday week,
// e.g. { monday: 24, tuesday: 25, ... }. Uses the browser's own time zone.
export function thisWeekDates(): Record<WeekDay, number> {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  return Object.fromEntries(
    WEEK_DAYS.map((day, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return [day, d.getDate()];
    }),
  ) as Record<WeekDay, number>;
}
