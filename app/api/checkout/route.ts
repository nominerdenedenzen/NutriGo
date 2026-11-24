import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { PREMIUM_DAYS, PREMIUM_PRICE_MNT } from "@/lib/premium";
import { createCheckoutSession, createPaymentIntent } from "@/lib/wire";

// Starts a Premium purchase: creates an order + Wire payment and returns the hosted payment page URL.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Please sign in first." }, { status: 401 });
  }

  const [order] = await db
    .insert(orders)
    .values({ userId, amount: PREMIUM_PRICE_MNT })
    .returning({ id: orders.id });

  try {
    const pi = await createPaymentIntent({
      amount: PREMIUM_PRICE_MNT,
      description: `NutriGo Premium (${PREMIUM_DAYS} days)`,
      metadata: { orderId: order.id, userId },
      idempotencyKey: `order-${order.id}`,
    });
    await db.update(orders).set({ paymentIntentId: pi.id }).where(eq(orders.id, order.id));

    const origin = new URL(request.url).origin;
    const session = await createCheckoutSession({
      paymentIntentId: pi.id,
      successUrl: `${origin}/premium?order=${order.id}`,
      cancelUrl: `${origin}/premium`,
      idempotencyKey: `order-${order.id}-checkout`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error(err);
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    return Response.json({ error: "Could not start the payment. Please try again." }, { status: 502 });
  }
}
