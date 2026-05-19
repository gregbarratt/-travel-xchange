import { createHmac, timingSafeEqual } from "node:crypto";

import {
  billingPlans,
  getBillingPlan,
  type BillingPlanKey,
} from "@/config/billing";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  mode: string;
  customer: string | null;
  customer_email: string | null;
  client_reference_id: string | null;
  metadata?: Record<string, string>;
  subscription: string | null;
  customer_details?: {
    email?: string | null;
  };
};

export type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_start?: number;
  current_period_end?: number;
  trial_end?: number | null;
  metadata?: Record<string, string>;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
};

export type StripeInvoice = {
  id: string;
  customer: string | null;
  subscription?: string | null;
  amount_due?: number | null;
  amount_paid?: number | null;
  currency?: string | null;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  status?: string | null;
  status_transitions?: {
    paid_at?: number | null;
  };
  parent?: {
    subscription_details?: {
      subscription?: string | null;
    };
  };
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

type CheckoutSessionInput = {
  customerEmail?: string | null;
  customerId?: string | null;
  planKey: BillingPlanKey;
  priceId: string;
  userId: string;
};

export function isStripeConfigured() {
  return Boolean(
    stripeSecretKey?.startsWith("sk_") || stripeSecretKey?.startsWith("rk_"),
  );
}

export function isStripeWebhookConfigured() {
  return Boolean(stripeWebhookSecret?.startsWith("whsec_"));
}

export function getStripePriceIdForPlan(planKey: BillingPlanKey) {
  const plan = getBillingPlan(planKey);

  if (!plan?.priceEnvVar) {
    return null;
  }

  return process.env[plan.priceEnvVar] ?? null;
}

export function getPlanKeyForStripePrice(priceId: string | null | undefined) {
  if (!priceId) {
    return null;
  }

  return (
    billingPlans.find(
      (plan) => plan.priceEnvVar && process.env[plan.priceEnvVar] === priceId,
    )?.key ?? null
  );
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function requireStripeSecretKey() {
  if (
    !stripeSecretKey?.startsWith("sk_") &&
    !stripeSecretKey?.startsWith("rk_")
  ) {
    throw new Error("Stripe secret key is not configured.");
  }

  return stripeSecretKey;
}

function toStripeForm(params: Record<string, string | number | boolean | null>) {
  const form = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== "") {
      form.append(key, String(value));
    }
  }

  return form;
}

async function stripeRequest<T>(
  path: string,
  init: {
    body?: URLSearchParams;
    method?: "GET" | "POST";
  } = {},
) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    body: init.body,
    headers: {
      Authorization: `Bearer ${requireStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: init.method ?? "GET",
  });
  const data = (await response.json()) as T & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Stripe request failed.");
  }

  return data as T;
}

export async function createStripeCheckoutSession({
  customerEmail,
  customerId,
  planKey,
  priceId,
  userId,
}: CheckoutSessionInput) {
  const appUrl = getAppUrl();
  const form = toStripeForm({
    "allow_promotion_codes": true,
    "billing_address_collection": "auto",
    "client_reference_id": userId,
    "customer": customerId ?? null,
    "customer_email": customerId ? null : (customerEmail ?? null),
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": 1,
    "metadata[plan_key]": planKey,
    "metadata[user_id]": userId,
    "mode": "subscription",
    "subscription_data[metadata][plan_key]": planKey,
    "subscription_data[metadata][user_id]": userId,
    "success_url": `${appUrl}/account/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    "cancel_url": `${appUrl}/pricing?checkout=cancelled`,
  });

  return stripeRequest<StripeCheckoutSession>("/checkout/sessions", {
    body: form,
    method: "POST",
  });
}

export async function createStripeBillingPortalSession({
  customerId,
}: {
  customerId: string;
}) {
  const appUrl = getAppUrl();
  const form = toStripeForm({
    customer: customerId,
    return_url: `${appUrl}/account/subscription`,
  });

  return stripeRequest<{ id: string; url: string }>("/billing_portal/sessions", {
    body: form,
    method: "POST",
  });
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  return stripeRequest<StripeSubscription>(`/subscriptions/${subscriptionId}`);
}

export function getSubscriptionPriceId(subscription: StripeSubscription) {
  return subscription.items?.data?.[0]?.price?.id ?? null;
}

export function fromUnixTimestamp(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function parseStripeSignature(header: string) {
  return header.split(",").reduce<{ signatures: string[]; timestamp: string }>(
    (result, item) => {
      const [key, value] = item.split("=");

      if (key === "t" && value) {
        result.timestamp = value;
      }

      if (key === "v1" && value) {
        result.signatures.push(value);
      }

      return result;
    },
    { signatures: [], timestamp: "" },
  );
}

export function verifyStripeWebhookSignature({
  payload,
  signatureHeader,
}: {
  payload: string;
  signatureHeader: string | null;
}) {
  if (!stripeWebhookSecret?.startsWith("whsec_") || !signatureHeader) {
    return false;
  }

  const { signatures, timestamp } = parseStripeSignature(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const timestampAge = Math.abs(Date.now() / 1000 - Number(timestamp));

  if (!Number.isFinite(timestampAge) || timestampAge > 600) {
    return false;
  }

  const expected = createHmac("sha256", stripeWebhookSecret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  return signatures.some((signature) => {
    const expectedBuffer = Buffer.from(expected, "hex");
    const signatureBuffer = Buffer.from(signature, "hex");

    return (
      expectedBuffer.length === signatureBuffer.length &&
      timingSafeEqual(expectedBuffer, signatureBuffer)
    );
  });
}
