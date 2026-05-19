import { NextRequest, NextResponse } from "next/server";

import { getBillingPlan, type BillingPlanKey } from "@/config/billing";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import {
  createStripeCheckoutSession,
  getStripePriceIdForPlan,
  isStripeConfigured,
} from "@/lib/stripe";

const paymentTableNames = [
  "payment_customers",
  "subscriptions",
  "invoices",
];

export async function POST(request: NextRequest) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      {
        error:
          "Supabase server settings are missing. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
      },
      { status: 500 },
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured yet. Add STRIPE_SECRET_KEY and the plan Price IDs to .env.local.",
      },
      { status: 500 },
    );
  }

  const { error: authError, user } = await getAuthenticatedUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    planKey?: BillingPlanKey;
  } | null;
  const plan = getBillingPlan(body?.planKey);

  if (!plan || plan.key === "free_member") {
    return NextResponse.json(
      { error: "Choose a paid subscription plan before checkout." },
      { status: 400 },
    );
  }

  const priceId = getStripePriceIdForPlan(plan.key);

  if (!priceId?.startsWith("price_")) {
    return NextResponse.json(
      {
        error: `Stripe Price ID missing. Add ${plan.priceEnvVar} to .env.local after creating this plan in Stripe test mode.`,
      },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: existingCustomer, error: customerError } = await supabase
    .from("payment_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (customerError) {
    return NextResponse.json(
      {
        error: isMissingTableError(customerError, paymentTableNames)
          ? "The Phase 13 payment tables are not installed yet. Run supabase/phase-13-payments.sql in Supabase, then try again."
          : customerError.message,
      },
      { status: 500 },
    );
  }

  try {
    const session = await createStripeCheckoutSession({
      customerEmail: user.email,
      customerId: existingCustomer?.stripe_customer_id ?? null,
      planKey: plan.key,
      priceId,
      userId: user.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe checkout could not be started.",
      },
      { status: 500 },
    );
  }
}
