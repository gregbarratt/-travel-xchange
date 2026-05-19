import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  fromUnixTimestamp,
  getPlanKeyForStripePrice,
  getSubscriptionPriceId,
  isStripeWebhookConfigured,
  retrieveStripeSubscription,
  type StripeCheckoutSession,
  type StripeInvoice,
  type StripeSubscription,
  type StripeWebhookEvent,
  verifyStripeWebhookSignature,
} from "@/lib/stripe";

export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getInvoiceSubscriptionId(invoice: StripeInvoice) {
  return (
    invoice.subscription ??
    invoice.parent?.subscription_details?.subscription ??
    null
  );
}

async function findUserIdForCustomer(stripeCustomerId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("payment_customers")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  return data?.user_id ?? null;
}

async function upsertPaymentCustomer({
  email,
  stripeCustomerId,
  userId,
}: {
  email?: string | null;
  stripeCustomerId: string;
  userId: string;
}) {
  const supabase = createSupabaseAdminClient();

  await supabase.from("payment_customers").upsert(
    {
      email: email ?? null,
      stripe_customer_id: stripeCustomerId,
      user_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

async function syncSubscription(subscription: StripeSubscription) {
  const stripeCustomerId = subscription.customer;
  const userId =
    subscription.metadata?.user_id ??
    (await findUserIdForCustomer(stripeCustomerId));

  if (!userId) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const stripePriceId = getSubscriptionPriceId(subscription);
  const planKey =
    subscription.metadata?.plan_key ??
    getPlanKeyForStripePrice(stripePriceId) ??
    null;

  await supabase.from("subscriptions").upsert(
    {
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      current_period_end: fromUnixTimestamp(subscription.current_period_end),
      current_period_start: fromUnixTimestamp(subscription.current_period_start),
      metadata: subscription.metadata ?? {},
      plan_key: planKey,
      status: subscription.status,
      stripe_customer_id: stripeCustomerId,
      stripe_price_id: stripePriceId,
      stripe_subscription_id: subscription.id,
      trial_end: fromUnixTimestamp(subscription.trial_end),
      updated_at: new Date().toISOString(),
      user_id: userId,
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function syncInvoice(invoice: StripeInvoice) {
  const stripeCustomerId = invoice.customer;

  if (!stripeCustomerId) {
    return;
  }

  const userId = await findUserIdForCustomer(stripeCustomerId);

  if (!userId) {
    return;
  }

  const supabase = createSupabaseAdminClient();

  await supabase.from("invoices").upsert(
    {
      amount_due: invoice.amount_due ?? null,
      amount_paid: invoice.amount_paid ?? null,
      currency: invoice.currency ?? null,
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      invoice_pdf: invoice.invoice_pdf ?? null,
      paid_at: fromUnixTimestamp(invoice.status_transitions?.paid_at),
      status: invoice.status ?? "unknown",
      stripe_customer_id: stripeCustomerId,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: getInvoiceSubscriptionId(invoice),
      updated_at: new Date().toISOString(),
      user_id: userId,
    },
    { onConflict: "stripe_invoice_id" },
  );
}

async function handleCheckoutCompleted(session: StripeCheckoutSession) {
  const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
  const stripeCustomerId = session.customer;

  if (!userId || !stripeCustomerId) {
    return;
  }

  await upsertPaymentCustomer({
    email: session.customer_details?.email ?? session.customer_email,
    stripeCustomerId,
    userId,
  });

  if (session.subscription) {
    const subscription = await retrieveStripeSubscription(session.subscription);
    await syncSubscription(subscription);
  }
}

export async function POST(request: NextRequest) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json(
      { error: "Stripe webhook secret is not configured." },
      { status: 500 },
    );
  }

  const payload = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");

  if (!verifyStripeWebhookSignature({ payload, signatureHeader })) {
    return NextResponse.json(
      { error: "Stripe webhook signature could not be verified." },
      { status: 400 },
    );
  }

  const event = JSON.parse(payload) as StripeWebhookEvent;
  const object = event.data.object;

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted({
        ...object,
        client_reference_id: asString(object.client_reference_id),
        customer: asString(object.customer),
        customer_email: asString(object.customer_email),
        id: asString(object.id) ?? "",
        mode: asString(object.mode) ?? "",
        subscription: asString(object.subscription),
        url: asString(object.url),
      } as StripeCheckoutSession);
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncSubscription(object as StripeSubscription);
    }

    if (
      event.type === "invoice.payment_succeeded" ||
      event.type === "invoice.payment_failed" ||
      event.type === "invoice.finalized"
    ) {
      await syncInvoice(object as StripeInvoice);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe webhook could not be processed.",
      },
      { status: 500 },
    );
  }
}
