"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Database, Mail, ShieldCheck } from "lucide-react";

import { PublicPageShell } from "@/components/layout/public-page-shell";
import { legalRoutes } from "@/config/legal";

const requestTypes = [
  "Access my data",
  "Correct my data",
  "Delete my data",
  "Restrict how my data is used",
  "Object to processing",
  "Export my data",
];

export function DataRequestPage() {
  const [requestType, setRequestType] = useState(requestTypes[2]);
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [showMailLink, setShowMailLink] = useState(false);

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent(`Travel Xchange data request: ${requestType}`);
    const body = encodeURIComponent(
      [
        "Hello Travel Xchange,",
        "",
        `Request type: ${requestType}`,
        `Account email: ${email || "[please add your account email]"}`,
        "",
        "Request details:",
        details || "[please describe what you need]",
        "",
        "I understand you may need to verify my identity before making account changes.",
      ].join("\n"),
    );

    return `mailto:privacy@travelxchange.co.uk?subject=${subject}&body=${body}`;
  }, [details, email, requestType]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowMailLink(true);
  }

  return (
    <PublicPageShell>
      <main className="bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">
                Privacy rights
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-bold text-[#082f49] sm:text-5xl">
                Data Deletion and Privacy Request
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                Use this page to prepare a request to access, correct, delete,
                restrict, object to, or export your Travel Xchange account data.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-[#082f49] p-2 text-white">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold text-[#082f49]">
                    MVP request flow
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    This does not submit to the database yet. It prepares an
                    email so the platform owner can handle the request manually
                    while the MVP is being tested.
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
                const isActive = item.href === "/legal/data-request";

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

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <form
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              onSubmit={handleSubmit}
            >
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-[#e0f2f1] p-2 text-[#0f766e]">
                  <Database className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-[#082f49]">
                    Prepare your request
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Fill in the details, then click the button to open your
                    email app with the request already written.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                <label className="grid gap-2 text-sm font-semibold text-slate-900">
                  Request type
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-normal text-slate-900 outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
                    value={requestType}
                    onChange={(event) => setRequestType(event.target.value)}
                  >
                    {requestTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-900">
                  Account email
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-normal text-slate-900 outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
                    placeholder="name@example.com"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-900">
                  Details
                  <textarea
                    className="min-h-36 rounded-lg border border-slate-300 px-3 py-3 text-sm font-normal text-slate-900 outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
                    placeholder="Tell us what you need help with."
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#115e59]"
                  type="submit"
                >
                  Prepare email
                  <Mail className="size-4" aria-hidden="true" />
                </button>

                {showMailLink ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#082f49] hover:bg-slate-50"
                    href={mailtoHref}
                  >
                    Open email request
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </form>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#082f49]">
                What happens next
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
                <p>
                  The project owner reviews your request and may ask for proof
                  that the account belongs to you before making changes.
                </p>
                <p>
                  Some records may need to be kept for security, legal,
                  accounting, dispute, or audit reasons.
                </p>
                <p>
                  A production release should replace this email flow with a
                  tracked privacy request system.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
