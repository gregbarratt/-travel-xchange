"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-xl rounded-lg border border-rose-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-rose-700">
          Something went wrong
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#082f49]">
          Travel Xchange could not load this page
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Please try again. If the problem continues, the production readiness
          checks will help us find the missing setting or service.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#115e59]"
            onClick={reset}
            type="button"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </button>
          <Link
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#082f49] hover:bg-slate-50"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
