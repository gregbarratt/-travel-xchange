"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, ExternalLink, Loader2, ReceiptText } from "lucide-react";

import { SubscriptionBadge } from "@/components/billing/subscription-badge";
import { Button } from "@/components/ui/button";
import { getBillingPlanLabel } from "@/config/billing";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type {
  BillingInvoice,
  BillingSubscription,
  PaymentCustomer,
} from "@/types/database";

const missingPaymentsMessage =
  "The Phase 13 payment tables are not installed yet. Run supabase/phase-13-payments.sql in Supabase, then refresh this page.";

function formatDate(value: string | null) {
  if (!value) {
    return "Not set yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(amount: number | null, currency: string | null) {
  if (amount === null || !currency) {
    return "Pending";
  }

  return new Intl.NumberFormat("en-GB", {
    currency: currency.toUpperCase(),
    style: "currency",
  }).format(amount / 100);
}

export function BillingDashboard() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [customer, setCustomer] = useState<PaymentCustomer | null>(null);
  const [subscription, setSubscription] =
    useState<BillingSubscription | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadBilling = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const search = new URLSearchParams(window.location.search);

    if (search.get("checkout") === "success") {
      setMessage(
        "Checkout returned successfully. Stripe will update this page as soon as the webhook is received.",
      );
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    const [
      { data: customerData, error: customerError },
      { data: subscriptionData, error: subscriptionError },
      { data: invoiceData, error: invoiceError },
    ] = await Promise.all([
      supabase
        .from("payment_customers")
        .select("*")
        .eq("user_id", userData.user.id)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("invoices")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const firstError = customerError ?? subscriptionError ?? invoiceError;

    if (firstError) {
      setError(
        isMissingTableError(firstError, [
          "payment_customers",
          "subscriptions",
          "invoices",
        ])
          ? missingPaymentsMessage
          : firstError.message,
      );
      setIsLoading(false);
      return;
    }

    setCustomer(customerData as PaymentCustomer | null);
    setSubscription(
      ((subscriptionData ?? []) as BillingSubscription[])[0] ?? null,
    );
    setInvoices((invoiceData ?? []) as BillingInvoice[]);
    setError(null);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBilling();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBilling]);

  async function handleOpenPortal() {
    if (!supabase) {
      return;
    }

    setIsOpeningPortal(true);
    setError(null);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      router.push("/login");
      return;
    }

    const response = await fetch("/api/stripe/portal", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: "POST",
    });
    const result = (await response.json()) as {
      error?: string;
      url?: string;
    };

    setIsOpeningPortal(false);

    if (!response.ok || !result.url) {
      setError(result.error ?? "The billing portal could not be opened.");
      return;
    }

    window.location.assign(result.url);
  }

  const planLabel = getBillingPlanLabel(subscription?.plan_key);
  const hasActiveSubscription = subscription?.status === "active";

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-lg border border-[#b8cae8] bg-[#f6f9ff] p-4 text-sm leading-6 text-[#203b70]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-[#b8cae8] bg-white p-6 text-sm text-[#4d6b9e] shadow-sm">
          Loading billing details...
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-[#b8cae8] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-[#4d6b9e]">
                Subscription status
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-extrabold text-[#061b4f]">
                  {hasActiveSubscription ? planLabel : "Free member"}
                </h2>
                <SubscriptionBadge subscription={subscription} />
              </div>
              <p className="mt-3 text-sm leading-6 text-[#4d6b9e]">
                {subscription
                  ? `Stripe status: ${subscription.status}`
                  : "No paid subscription has been recorded yet."}
              </p>
            </div>
            <CreditCard className="size-10 text-[#063b86]" aria-hidden="true" />
          </div>

          <div className="mt-6 grid gap-4 border-t border-[#d9e4f5] pt-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase text-[#4d6b9e]">
                Current period
              </p>
              <p className="mt-1 text-sm font-bold text-[#061b4f]">
                {formatDate(subscription?.current_period_start ?? null)}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-[#4d6b9e]">
                Renews or ends
              </p>
              <p className="mt-1 text-sm font-bold text-[#061b4f]">
                {formatDate(subscription?.current_period_end ?? null)}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-[#4d6b9e]">
                Customer
              </p>
              <p className="mt-1 text-sm font-bold text-[#061b4f]">
                {customer?.stripe_customer_id ? "Connected" : "Not connected"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="tx-action inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-bold"
              href="/pricing"
            >
              View plans
            </Link>
            <Button
              className="h-11 border border-[#b8cae8] bg-white px-4 text-[#061b4f] hover:bg-[#f4f8ff]"
              disabled={!customer?.stripe_customer_id || isOpeningPortal}
              onClick={() => void handleOpenPortal()}
              type="button"
              variant="outline"
            >
              {isOpeningPortal ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ExternalLink className="size-4" aria-hidden="true" />
              )}
              Manage in Stripe
            </Button>
          </div>
        </div>

        <aside className="rounded-lg border border-[#b8cae8] bg-[#f6f9ff] p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-[#061b4f]">
            Phase 13 notes
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#4d6b9e]">
            This is test-mode billing. Live payments should wait until Stripe
            products, webhook settings, tax settings, and legal terms are
            reviewed.
          </p>
        </aside>
      </section>

      <section className="rounded-lg border border-[#b8cae8] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-5 text-[#063b86]" aria-hidden="true" />
          <h2 className="text-lg font-extrabold text-[#061b4f]">
            Recent invoices
          </h2>
        </div>

        <div className="mt-4 space-y-3">
          {invoices.length > 0 ? (
            invoices.map((invoice) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f6f9ff] px-4 py-3"
                key={invoice.id}
              >
                <div>
                  <p className="text-sm font-bold text-[#061b4f]">
                    {formatMoney(invoice.amount_paid, invoice.currency)}
                  </p>
                  <p className="text-xs text-[#4d6b9e]">
                    Status: {invoice.status}
                  </p>
                </div>
                {invoice.hosted_invoice_url ? (
                  <a
                    className="text-sm font-bold text-[#063b86] hover:text-[#f52968]"
                    href={invoice.hosted_invoice_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open invoice
                  </a>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-[#4d6b9e]">
              Invoice records will appear here after Stripe sends invoice
              webhooks.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
