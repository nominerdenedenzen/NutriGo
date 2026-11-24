import { grantPremium, markOrderFailed } from "@/lib/premium";
import { retrievePaymentIntent, verifyWebhook, WIRE_SIGNATURE_HEADER } from "@/lib/wire";

// Wire calls this after a payment changes state. Only signed requests are trusted.
export async function POST(request: Request) {
  const rawBody = await request.text(); // the signature covers the exact raw body
  const secret = process.env.WIRE_WEBHOOK_SECRET;
  const event = secret ? verifyWebhook(rawBody, request.headers.get(WIRE_SIGNATURE_HEADER), secret) : null;

  if (!event) {
    // Wire pings a new endpoint once, right when it is created, before its secret can be deployed here.
    // The ping changes nothing, so answer it even if it can't be verified yet.
    if (isVerificationPing(rawBody)) return Response.json({ received: true });
    if (!secret) {
      console.error("WIRE_WEBHOOK_SECRET is not set");
      return new Response("Not configured", { status: 500 }); // 5xx: Wire retries later
    }
    return new Response("Invalid signature", { status: 400 });
  }

  // For payment events, `data` is the payment intent itself (id, status, amount, currency; no metadata).
  const paymentIntentId = typeof event.data?.id === "string" ? event.data.id : null;
  switch (event.type) {
    case "payment_intent.succeeded":
      // Load the full payment from Wire (with metadata) before granting anything.
      // Any error -> 500 -> Wire retries.
      if (paymentIntentId) await grantPremium(await retrievePaymentIntent(paymentIntentId));
      break;
    case "payment_intent.payment_failed":
    case "payment_intent.canceled":
      if (paymentIntentId) await markOrderFailed(paymentIntentId);
      break;
    // Anything else (including Wire's endpoint verification ping) just needs a 2xx.
  }

  return Response.json({ received: true });
}

function isVerificationPing(rawBody: string) {
  try {
    return JSON.parse(rawBody)?.type === "endpoint.verification";
  } catch {
    return false;
  }
}
