import Link from "next/link";
import type { Metadata } from "next";
import { Building2, CheckCircle2, ShieldCheck } from "lucide-react";

import { RegistrationRequestForm } from "@/components/auth/registration-request-form";
import { TravelXchangeLogo } from "@/components/brand/travel-xchange-logo";
import { PublicPageShell } from "@/components/layout/public-page-shell";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a free Travel Xchange member account.",
};

export default function RegisterPage() {
  return (
    <PublicPageShell>
      <main className="bg-[#f8fafc] px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div className="mb-8 rounded-lg border border-[#d9e4f5] bg-white p-6 shadow-sm sm:p-8">
              <TravelXchangeLogo
                markClassName="h-9 w-10"
                textClassName="[&>span:first-child]:text-xl [&>span:last-child]:text-[0.62rem]"
              />
              <p className="mt-8 inline-flex rounded-lg border border-[#f52968]/20 bg-[#fff1f6] px-3 py-2 text-sm font-extrabold uppercase tracking-wide text-[#f52968]">
                Free to access
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-normal text-[#061b4f]">
                Create your Travel Xchange account
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#4d6b9e]">
                Tell us who you are, which agency, supplier, or business you
                work with, and any trade numbers that help verify your access.
              </p>
            </div>

            <RegistrationRequestForm />
          </div>

          <aside className="h-max rounded-lg border border-[#d9e4f5] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-[#061b4f]">
              How approval works
            </h2>
            <div className="mt-5 space-y-5">
              <div className="flex gap-3">
                <Building2
                  className="mt-0.5 size-5 shrink-0 text-[#0f766e]"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-[#4d6b9e]">
                  If your company already exists on Travel Xchange, its page
                  admin can approve your access.
                </p>
              </div>
              <div className="flex gap-3">
                <ShieldCheck
                  className="mt-0.5 size-5 shrink-0 text-[#f52968]"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-[#4d6b9e]">
                  If the company is new, Travel Xchange admin will review the
                  business and your profile.
                </p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-[#ff7a2f]"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-[#4d6b9e]">
                  Once approved, your role and company access can be updated
                  inside the system.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-[#f8fafc] p-4 text-sm leading-6 text-[#4d6b9e]">
              Already have an account?{" "}
              <Link
                className="font-extrabold text-[#0f766e] hover:text-[#115e59]"
                href="/login"
              >
                Log in here
              </Link>
              .
            </div>
          </aside>
        </section>
      </main>
    </PublicPageShell>
  );
}
