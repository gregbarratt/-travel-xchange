import Link from "next/link";
import { ArrowLeft, Clock, Mail } from "lucide-react";

import { PublicPageShell } from "@/components/layout/public-page-shell";
import { launchConfig } from "@/config/launch";

type AuthDisabledCardProps = {
  mode: "login" | "register" | "onboarding";
};

const copy = {
  login: {
    title: "Member login is paused",
    description:
      "Travel Xchange is live as a launch preview, but public member login is paused while we finish final setup.",
  },
  onboarding: {
    title: "Onboarding is paused",
    description:
      "New member onboarding will reopen when Travel Xchange is ready for public access.",
  },
  register: {
    title: "New accounts are coming soon",
    description:
      "Public registration is paused while we prepare the launch version of Travel Xchange.",
  },
};

export function AuthDisabledCard({ mode }: AuthDisabledCardProps) {
  return (
    <PublicPageShell>
      <main className="flex min-h-[70svh] items-center bg-[#f8fbff] px-4 py-12 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-xl rounded-lg border border-[#d9e4f5] bg-white p-8 text-center shadow-[0_18px_42px_rgba(7,36,91,0.08)]">
          <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[#fff1f6] text-[#f52968]">
            <Clock className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-6 text-sm font-extrabold uppercase tracking-wide text-[#f52968]">
            {launchConfig.status}
          </p>
          <h1 className="mt-3 text-3xl font-black text-[#061b4f]">
            {copy[mode].title}
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#4d6b9e]">
            {copy[mode].description}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#061b4f] px-5 py-3 text-sm font-bold text-white hover:bg-[#082f6f]"
              href="/"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to coming soon
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d9e4f5] bg-white px-5 py-3 text-sm font-bold text-[#061b4f] hover:bg-[#eef5ff]"
              href={`mailto:${launchConfig.email}?subject=Travel Xchange launch access`}
            >
              <Mail className="size-4" aria-hidden="true" />
              Contact us
            </Link>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
