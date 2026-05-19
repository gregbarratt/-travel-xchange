import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[#082f49] text-white">
          <Compass className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-[#0f766e]">
          Page not found
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#082f49]">
          This Travel Xchange page is not available
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          The link may be wrong, the page may have moved, or the content may no
          longer be visible.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#082f49] hover:bg-slate-50"
            href="/"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Public home
          </Link>
          <Link
            className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#115e59]"
            href="/dashboard"
          >
            Member dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
