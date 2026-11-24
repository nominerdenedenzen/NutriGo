import "server-only";
import { and, count, eq, gte, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiRequests, orders } from "@/db/schema";
import type { PaymentIntent } from "@/lib/wire";

export const PREMIUM_PRICE_MNT = 4900;
export const PREMIUM_DAYS = 30;
export const FREE_AI_REQUESTS_PER_DAY = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

// When the user's Premium ends, or null if they never paid. Paid periods stack.
export async function getPremiumUntil(userId: string): Promise<Date | null> {
  const [row] = await db
    .select({ until: max(orders.proUntil) })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, "paid")));
  return row?.until ?? null;
}

export async function isPremium(userId: string) {
  const until = await getPremiumUntil(userId);
  return until !== null && until > new Date();
}

// How many AI recipe requests the user made in the last 24 hours.
export async function aiRequestsToday(userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(aiRequests)
    .where(and(eq(aiRequests.userId, userId), gte(aiRequests.createdAt, new Date(Date.now() - DAY_MS))));
  return row?.n ?? 0;
}

export async function recordAiRequest(userId: string) {
  await db.insert(aiRequests).values({ userId });
}

// Marks the order for this payment as paid and adds 30 days of Premium.
// Safe to call more than once (webhook retries + the success page): only the first call counts.
// Only call it with a payment intent that came from Wire (signed webhook or fetched from the API).
export async function grantPremium(pi: PaymentIntent): Promise<boolean> {
  if (pi.status !== "succeeded" || pi.currency !== "MNT") return false;

  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.paymentIntentId, pi.id)).for("update");
    if (!order || order.status === "paid") return false;
    if (pi.amount !== order.amount || pi.metadata?.orderId !== order.id) {
      console.error(`Wire payment ${pi.id} does not match order ${order.id}`);
      return false;
    }

    // One user at a time, so two payments can't both start from the same end date.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${order.userId}))`);
    const [row] = await tx
      .select({ until: max(orders.proUntil) })
      .from(orders)
      .where(and(eq(orders.userId, order.userId), eq(orders.status, "paid")));

    const now = new Date();
    const start = row?.until && row.until > now ? row.until : now;
    await tx
      .update(orders)
      .set({ status: "paid", proUntil: new Date(start.getTime() + PREMIUM_DAYS * DAY_MS) })
      .where(eq(orders.id, order.id));
    return true;
  });
}

export async function markOrderFailed(paymentIntentId: string) {
  await db
    .update(orders)
    .set({ status: "failed" })
    .where(and(eq(orders.paymentIntentId, paymentIntentId), eq(orders.status, "pending")));
}
