import Link from "next/link";
import { AlertTriangle, ArrowRight, FileText, ShieldCheck } from "lucide-react";

import { PublicPageShell } from "@/components/layout/public-page-shell";
import { legalRoutes, type LegalDocument } from "@/config/legal";

type LegalPageProps = {
  document: LegalDocument;
};

export function LegalPage({ document }: LegalPageProps) {
  return (
    <PublicPageShell>
      <main className="bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">
                Legal and compliance
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-bold text-[#082f49] sm:text-5xl">
                {document.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                {document.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <FileText className="size-4 text-[#0f766e]" aria-hidden="true" />
                  Last updated: {document.lastUpdated}
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  <AlertTriangle className="size-4" aria-hidden="true" />
                  Draft for legal review
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-[#082f49] p-2 text-white">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold text-[#082f49]">
                    Built for trust from the start
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    These pages give the MVP a clear public trust layer. Before
                    launch, a solicitor should review them against the final
                    business model, suppliers, and operating processes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:px-8">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav
              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              aria-label="Legal pages"
            >
              {legalRoutes.map((item) => {
                const isActive = item.href.endsWith(document.slug);

                return (
                  <Link
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-[#e0f2f1] text-[#0f766e]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                    {isActive ? (
                      <ArrowRight className="size-4" aria-hidden="true" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <article className="space-y-4">
            {document.sections.map((section) => (
              <section
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                key={section.heading}
              >
                <h2 className="text-xl font-semibold text-[#082f49]">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4 text-base leading-7 text-slate-700">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.items ? (
                    <ul className="grid gap-2">
                      {section.items.map((item) => (
                        <li className="flex gap-3" key={item}>
                          <span
                            className="mt-2 size-2 rounded-full bg-[#0f766e]"
                            aria-hidden="true"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            ))}
          </article>
        </section>
      </main>
    </PublicPageShell>
  );
}
