import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Wire.mn payment API (https://docs.wire.mn). Live keys only: every payment is real money.
const API = "https://api.wire.mn/v1";

export type PaymentIntent = {
  id: string; // "pi_..."
  amount: number; // whole tugrik
  currency: string;
  status: string; // "requires_payment_method" | "requires_action" | "succeeded" | "canceled" | ...
  metadata: Record<string, string>;
};

export type WireEvent = {
  id: string; // "evt_..."
  type: string; // e.g. "payment_intent.succeeded"
  data: Record<string, unknown>; // for payment_intent.* events: { id: "pi_...", status, amount, currency, ... }
};

async function wire<T>(method: "GET" | "POST", path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  const key = process.env.WIRE_API_KEY;
  if (!key) throw new Error("WIRE_API_KEY is not set");

  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    // Required on every POST. Reusing a key returns the first result instead of a duplicate.
    headers["Idempotency-Key"] = idempotencyKey ?? crypto.randomUUID();
  }

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    throw new Error(`Wire ${method} ${path} failed (${res.status}): ${err?.code ?? "unknown"} ${err?.message ?? ""}`.trim());
  }
  return data as T;
}

export function createPaymentIntent(params: {
  amount: number;
  description: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}) {
  const { idempotencyKey, ...body } = params;
  return wire<PaymentIntent>("POST", "/payment_intents", { ...body, currency: "MNT" }, idempotencyKey);
}

export function retrievePaymentIntent(id: string) {
  return wire<PaymentIntent>("GET", `/payment_intents/${encodeURIComponent(id)}`);
}

// Opens a Wire-hosted payment page (QPay QR + bank deeplinks) for a payment intent.
export function createCheckoutSession(params: {
  paymentIntentId: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}) {
  return wire<{ id: string; url: string }>(
    "POST",
    "/checkout/sessions",
    { payment_intent: params.paymentIntentId, success_url: params.successUrl, cancel_url: params.cancelUrl },
    params.idempotencyKey,
  );
}

export const WIRE_SIGNATURE_HEADER = "WirePayment-Signature";
const TOLERANCE_SECONDS = 300;

// Checks the "t=<unix>,v1=<hex>" signature (HMAC-SHA256 of "<t>.<raw body>") and returns the event.
// Returns null when the signature is missing, wrong, or too old.
export function verifyWebhook(rawBody: string, header: string | null, secret: string): WireEvent | null {
  if (!header) return null;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  if (!Number.isFinite(t) || !parts.v1) return null;
  if (Math.abs(Date.now() / 1000 - t) > TOLERANCE_SECONDS) return null;

  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest();
  const given = Buffer.from(parts.v1, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    return JSON.parse(rawBody) as WireEvent;
  } catch {
    return null;
  }
}
