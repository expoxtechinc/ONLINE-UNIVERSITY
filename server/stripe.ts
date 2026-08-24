import { createHmac, timingSafeEqual } from "crypto";

type CheckoutInput = {
  course: { id: number; title: string; description: string; priceCents: number; currency: string };
  enrollmentId: number;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
};

type StripeCheckoutSession = { id: string; url: string | null };

function getStripeSecretKey() {
  const value = process.env.ONLINE_UNIVERSITY_STRIPE_SECRET_KEY;
  if (!value || !/^sk_(test|live)_/.test(value)) throw new Error("Stripe checkout is not configured");
  return value;
}

export async function createStripeCheckoutSession(input: CheckoutInput): Promise<StripeCheckoutSession> {
  const data = new URLSearchParams();
  data.set("mode", "payment");
  data.set("success_url", input.successUrl);
  data.set("cancel_url", input.cancelUrl);
  data.set("client_reference_id", String(input.enrollmentId));
  data.set("customer_creation", "always");
  if (input.customerEmail) data.set("customer_email", input.customerEmail);
  data.set("line_items[0][price_data][currency]", input.course.currency.toLowerCase());
  data.set("line_items[0][price_data][unit_amount]", String(input.course.priceCents));
  data.set("line_items[0][price_data][product_data][name]", input.course.title);
  data.set("line_items[0][price_data][product_data][description]", input.course.description.slice(0, 450));
  data.set("line_items[0][quantity]", "1");
  data.set("metadata[courseId]", String(input.course.id));
  data.set("metadata[enrollmentId]", String(input.enrollmentId));
  data.set("payment_intent_data[metadata][courseId]", String(input.course.id));
  data.set("payment_intent_data[metadata][enrollmentId]", String(input.enrollmentId));

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${getStripeSecretKey()}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: data.toString(),
  });
  if (!response.ok) throw new Error(`Stripe Checkout creation failed (${response.status})`);
  const result = (await response.json()) as StripeCheckoutSession;
  if (!result.id || !result.url) throw new Error("Stripe did not return a hosted checkout URL");
  return result;
}

export function verifyStripeSignature(rawBody: Buffer, signatureHeader: string | undefined) {
  const secret = process.env.ONLINE_UNIVERSITY_STRIPE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const components = Object.fromEntries(signatureHeader.split(",").map((item) => item.split("=", 2) as [string, string]));
  const timestamp = components.t;
  const signature = components.v1;
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const computed = createHmac("sha256", secret).update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  const expected = Buffer.from(computed, "hex");
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
