import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[var(--tx-text)] text-white">
          <Compass className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-[var(--tx-accent)]">
          Page not found
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[var(--tx-text)]">
          This Travel Xchange page is not available
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          The link may be wrong, the page may have moved, or the content may no
          longer be visible.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[var(--tx-text)] hover:bg-slate-50"
            href="/login"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to login
          </Link>
          <Link
            className="rounded-lg bg-[var(--tx-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--tx-accent-hover)]"
            href="/login"
          >
            Log in
          </Link>
        </div>
      </section>
    </main>
  );
}
