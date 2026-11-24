import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { Check, Sparkles } from "lucide-react";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { FREE_AI_REQUESTS_PER_DAY, PREMIUM_DAYS, PREMIUM_PRICE_MNT, getPremiumUntil, grantPremium } from "@/lib/premium";
import { retrievePaymentIntent } from "@/lib/wire";
import CheckoutButton from "./CheckoutButton";

export default function PremiumPage({ searchParams }: PageProps<"/premium">) {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-black/5" />}>
          <Premium searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

// Back from Wire's payment page: if the webhook hasn't arrived yet, ask Wire directly.
async function confirmReturningOrder(userId: string, orderId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return;
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
  if (!order || order.status !== "pending" || !order.paymentIntentId) return;
  try {
    await grantPremium(await retrievePaymentIntent(order.paymentIntentId));
  } catch (err) {
    console.error(err); // the webhook will still grant it
  }
}

async function Premium({ searchParams }: { searchParams: PageProps<"/premium">["searchParams"] }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { order } = await searchParams;
  if (typeof order === "string") await confirmReturningOrder(userId, order);

  const until = await getPremiumUntil(userId);
  const active = until !== null && until > new Date();
  const untilText = until?.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F4EA] px-3 py-1 text-xs font-semibold text-[#1F8A4C]">
        <Sparkles className="h-3.5 w-3.5" /> NutriGo Premium
      </span>

      {typeof order === "string" && !active && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          We haven&apos;t received your payment yet. If you paid, refresh this page in a minute.
        </p>
      )}

      {active ? (
        <>
          <h1 className="mt-4 text-2xl font-bold text-[#101814]">You&apos;re Premium 🎉</h1>
          <p className="mt-2 text-sm text-[#101814]/70">Unlimited AI recipes until {untilText}.</p>
        </>
      ) : (
        <>
          <h1 className="mt-4 text-2xl font-bold text-[#101814]">
            {PREMIUM_PRICE_MNT.toLocaleString("en-US")} ₮ <span className="text-base font-medium text-[#101814]/50">/ {PREMIUM_DAYS} days</span>
          </h1>
          <p className="mt-2 text-sm text-[#101814]/70">
            Free accounts get {FREE_AI_REQUESTS_PER_DAY} AI recipe searches a day.
          </p>
        </>
      )}

      <ul className="mt-6 space-y-2 text-sm text-[#101814]">
        {["Unlimited AI recipes from your fridge photos", "Pay with QPay or your bank app", "No auto-renewal: pay again only if you want more"].map((t) => (
          <li key={t} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1F8A4C]" /> {t}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <CheckoutButton label={active ? `Add ${PREMIUM_DAYS} more days` : "Get Premium"} />
      </div>
    </div>
  );
}
