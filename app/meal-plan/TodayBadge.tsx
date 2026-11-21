"use client";

import { useSyncExternalStore } from "react";
import { todayWeekDay, type WeekDay } from "@/lib/weekDays";

const noSubscribe = () => () => {};

// Shows a "Today" label next to today's day.
// It is worked out in the browser so it uses the user's own time zone
// (on the server it renders nothing, so there is no mismatch).
export default function TodayBadge({ day }: { day: WeekDay }) {
  const today = useSyncExternalStore(noSubscribe, todayWeekDay, () => null);
  if (today !== day) return null;

  return (
    <span className="rounded-full bg-[#cfe3c4] px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-[#1e3226]">
      Today
    </span>
  );
}
