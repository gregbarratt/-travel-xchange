"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

import {
  billingPlans,
  type BillingPlan,
  type BillingPlanKey,
} from "@/config/billing";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type CheckoutState = {
  error: string | null;
  errorPlanKey: BillingPlanKey | null;
  loadingPlanKey: BillingPlanKey | null;
};

function getAccentClasses(plan: BillingPlan) {
  if (plan.accent === "pink") {
    return "border-[#f52968]/40 bg-[#fff7fa]";
  }

  if (plan.accent === "orange") {
    return "border-[#ff7a2f]/40 bg-[#fff9f4]";
  }

  if (plan.accent === "blue") {
    return "border-[#063b86]/30 bg-[#f6f9ff]";
  }

  return "border-[#061b4f]/20 bg-white";
}

export function PricingPlans() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    error: null,
    errorPlanKey: null,
    loadingPlanKey: null,
  });

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  async function handleCheckout(plan: BillingPlan) {
    if (plan.key === "free_member") {
      router.push("/register");
      return;
    }

    if (!supabase) {
      setCheckoutState({
        error: "Supabase is not connected yet, so checkout cannot start.",
        errorPlanKey: plan.key,
        loadingPlanKey: null,
      });
      return;
    }

    setCheckoutState({
      error: null,
      errorPlanKey: null,
      loadingPlanKey: plan.key,
    });

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      router.push("/login");
      return;
    }

    const response = await fetch("/api/stripe/checkout", {
      body: JSON.stringify({ planKey: plan.key }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const result = (await response.json()) as {
      error?: string;
      url?: string;
    };

    if (!response.ok || !result.url) {
      setCheckoutState({
        error: result.error ?? "Checkout could not be started.",
        errorPlanKey: plan.key,
        loadingPlanKey: null,
      });
      return;
    }

    window.location.assign(result.url);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-3">
        {billingPlans.map((plan) => {
          const isBusy = checkoutState.loadingPlanKey === plan.key;

          return (
            <article
              className={cn(
                "relative flex min-h-full flex-col rounded-lg border p-5 shadow-sm",
                getAccentClasses(plan),
                plan.isFeatured
                  ? "ring-2 ring-[#f52968]/35"
                  : "ring-1 ring-transparent",
              )}
              key={plan.key}
            >
              {plan.isFeatured ? (
                <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#ffe7ed] px-3 py-1 text-xs font-bold text-[#f52968]">
                  <Sparkles className="size-3" aria-hidden="true" />
                  Popular
                </div>
              ) : null}

              <p className="text-xs font-bold uppercase text-[#4d6b9e]">
                {plan.audience}
              </p>
              <h2 className="mt-3 text-xl font-extrabold text-[#061b4f]">
                {plan.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
                {plan.description}
              </p>

              <div className="mt-5 flex items-end gap-1">
                <span className="text-3xl font-extrabold text-[#061b4f]">
                  {plan.price}
                </span>
                {plan.interval === "month" ? (
                  <span className="pb-1 text-sm font-medium text-[#4d6b9e]">
                    / month
                  </span>
                ) : null}
              </div>

              <ul className="mt-5 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    className="flex gap-2 text-sm leading-6 text-[#203b70]"
                    key={feature}
                  >
                    <CheckCircle2
                      className="mt-1 size-4 shrink-0 text-[#063b86]"
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={cn(
                  "mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition",
                  plan.key === "free_member"
                    ? "border border-[#b8cae8] bg-white text-[#061b4f] hover:bg-[#f4f8ff]"
                    : "tx-action",
                )}
                disabled={isBusy}
                onClick={() => void handleCheckout(plan)}
                type="button"
              >
                {isBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {isBusy ? "Opening checkout" : plan.ctaLabel}
              </button>

              {checkoutState.error && checkoutState.errorPlanKey === plan.key ? (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
                  {checkoutState.error}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="rounded-lg border border-[#b8cae8] bg-white p-5 text-sm leading-6 text-[#4d6b9e] shadow-sm">
        <p>
          Stripe is wired in for test mode first. After you create the matching
          Stripe Products and Prices, add their Price IDs to `.env.local`, then
          restart the app.
        </p>
        <Link
          className="mt-3 inline-flex font-bold text-[#063b86] hover:text-[#f52968]"
          href="/billing"
        >
          View billing dashboard
        </Link>
      </div>
    </div>
  );
}
