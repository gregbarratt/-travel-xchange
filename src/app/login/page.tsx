import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  GraduationCap,
  Newspaper,
  Users,
} from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { TravelXchangeLogo } from "@/components/brand/travel-xchange-logo";
import { PublicPageShell } from "@/components/layout/public-page-shell";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Travel Xchange.",
  robots: {
    follow: false,
    index: false,
  },
};

const overviewItems = [
  {
    icon: Newspaper,
    title: "Trade news and supplier updates",
    text: "Keep agents, suppliers, recruiters, trainers, and travel partners informed in one place.",
  },
  {
    icon: Building2,
    title: "Supplier and company pages",
    text: "Give supplier teams a professional space for updates, resources, events, and agent access.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Jobs and opportunities",
    text: "Bring travel trade vacancies, events, training, and commercial opportunities together.",
  },
  {
    icon: Users,
    title: "Community workspace",
    text: "Support groups, questions, messages, and professional networking for the travel industry.",
  },
];

export default function LoginPage() {
  return (
    <PublicPageShell>
      <main className="bg-[#f8fafc] px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)] lg:items-start">
          <div className="rounded-lg border border-[#d9e4f5] bg-white p-6 shadow-sm sm:p-8">
            <TravelXchangeLogo
              markClassName="h-9 w-10"
              textClassName="[&>span:first-child]:text-xl [&>span:last-child]:text-[0.62rem]"
            />
            <h1 className="mt-8 text-3xl font-semibold tracking-normal text-[#061b4f]">
              Log in
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#4d6b9e]">
              Access the Travel Xchange platform with an approved account.
              Public registration is paused while we prepare private beta.
            </p>

            <div className="mt-8">
              <AuthForm mode="login" redirectPath="/dashboard" />
              <div className="mt-4 rounded-lg border border-[#d9e4f5] bg-[#f8fafc] p-4 text-sm leading-6 text-[#4d6b9e]">
                Need access?{" "}
                <Link
                  className="font-extrabold text-[#0f766e] hover:text-[#115e59]"
                  href="/register"
                >
                  View the registration notice
                </Link>
                .
              </div>
              <ForgotPasswordForm />
            </div>
          </div>

          <aside className="overflow-hidden rounded-lg border border-[#d9e4f5] bg-white shadow-sm">
            <div className="relative isolate bg-[#061b4f] px-6 py-8 text-white sm:px-8">
              <div
                className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(245,41,104,0.45),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,122,47,0.35),transparent_32%)]"
                aria-hidden="true"
              />
              <p className="inline-flex rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-extrabold uppercase tracking-wide text-white">
                Free to access
              </p>
              <h2 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-normal">
                A smarter home for travel professionals.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                Travel Xchange is being built as a dedicated professional
                platform for travel agents, suppliers, recruiters, trainers,
                travel technology providers, and industry partners.
              </p>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
              {overviewItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="rounded-lg border border-[#d9e4f5] bg-[#f8fafc] p-4"
                    key={item.title}
                  >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-[#fff1f6] text-[#f52968]">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-base font-extrabold text-[#061b4f]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#d9e4f5] bg-[#f8fafc] px-6 py-5 sm:px-8">
              <div className="flex gap-3">
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-[#0f766e]"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-[#4d6b9e]">
                  Travel Xchange is free to access for approved travel
                  professionals and industry partners.{" "}
                  <Link
                    className="font-extrabold text-[#0f766e] hover:text-[#115e59]"
                    href="/register"
                  >
                    View the access notice
                  </Link>
                  .
                </p>
              </div>
              <Link
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#f52968] to-[#ff7a2f] px-5 py-3 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(245,41,104,0.22)] hover:opacity-95"
                href="/register"
              >
                View access notice
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <div className="mt-4 flex items-center gap-2 text-sm font-extrabold text-[#061b4f]">
                <GraduationCap className="size-5 text-[#f52968]" aria-hidden="true" />
                News, supplier updates, events, training, jobs, and community
                tools in one professional platform.
              </div>
            </div>
          </aside>
        </section>
      </main>
    </PublicPageShell>
  );
}
