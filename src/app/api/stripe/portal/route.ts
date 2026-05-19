import { NextRequest, NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import {
  createStripeBillingPortalSession,
  isStripeConfigured,
} from "@/lib/stripe";

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
      { error: "Stripe is not configured yet." },
      { status: 500 },
    );
  }

  const { error: authError, user } = await getAuthenticatedUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: customer, error: customerError } = await supabase
    .from("payment_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (customerError) {
    return NextResponse.json(
      {
        error: isMissingTableError(customerError, ["payment_customers"])
          ? "The Phase 13 payment tables are not installed yet."
          : customerError.message,
      },
      { status: 500 },
    );
  }

  if (!customer?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer has been created for this account yet." },
      { status: 400 },
    );
  }

  try {
    const session = await createStripeBillingPortalSession({
      customerId: customer.stripe_customer_id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The billing portal could not be opened.",
      },
      { status: 500 },
    );
  }
}
