import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  Megaphone,
  Newspaper,
} from "lucide-react";

import { PublicPageShell } from "@/components/layout/public-page-shell";
import { launchConfig } from "@/config/launch";

const launchFeatures = [
  { icon: Newspaper, label: "News" },
  { icon: Megaphone, label: "Supplier updates" },
  { icon: CalendarDays, label: "Events" },
  { icon: GraduationCap, label: "Training" },
  { icon: BriefcaseBusiness, label: "Opportunities" },
];

export default function Home() {
  return (
    <PublicPageShell>
      <main className="overflow-hidden bg-white">
        <section className="relative isolate px-4 py-12 sm:px-6 lg:px-8">
          <div
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(245,41,104,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,122,47,0.15),transparent_30%)]"
            aria-hidden="true"
          />
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.98fr)_minmax(420px,1.02fr)] lg:items-center">
            <div className="py-8 lg:py-16">
              <p className="inline-flex rounded-lg border border-[#f52968]/20 bg-[#fff1f6] px-3 py-2 text-sm font-extrabold uppercase tracking-wide text-[#f52968]">
                {launchConfig.status}
              </p>
              <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.02] text-[#061b4f] sm:text-6xl lg:text-7xl">
                {launchConfig.headline}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4d6b9e]">
                {launchConfig.message}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#061b4f] px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_16px_34px_rgba(6,27,79,0.18)] transition hover:bg-[#082f6f]"
                  href={`mailto:${launchConfig.email}?subject=Travel Xchange launch updates`}
                >
                  Follow for launch updates
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-lg border border-[#d9e4f5] bg-white px-6 py-3 text-sm font-bold text-[#061b4f] transition hover:bg-[#eef5ff]"
                  href="/legal/privacy"
                >
                  Privacy and launch notes
                </Link>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-5">
                {launchFeatures.map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <div
                      className="rounded-lg border border-[#d9e4f5] bg-white/85 p-4 text-center shadow-sm"
                      key={feature.label}
                    >
                      <span className="mx-auto flex size-11 items-center justify-center rounded-lg bg-[#fff1f6] text-[#f52968]">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <p className="mt-3 text-sm font-extrabold text-[#061b4f]">
                        {feature.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-8 top-12 -z-10 h-32 w-32 rounded-full bg-[#f52968]/15 blur-3xl" />
              <div className="absolute -bottom-8 right-8 -z-10 h-40 w-40 rounded-full bg-[#ff7a2f]/15 blur-3xl" />
              <Image
                alt="Travel Xchange something new is coming"
                className="mx-auto w-full max-w-[660px] rounded-lg border border-[#d9e4f5] bg-white shadow-[0_24px_70px_rgba(6,27,79,0.12)]"
                height={1400}
                src="/travel-xchange-coming-soon.svg"
                priority
                width={1400}
              />
            </div>
          </div>
        </section>

        <section className="border-y border-[#d9e4f5] bg-[#f8fbff] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 text-sm font-semibold text-[#4d6b9e] md:flex-row md:items-center md:justify-between">
            <span>Public sign-ups are paused while we prepare launch.</span>
            <span>Existing owner/admin work can continue behind the scenes.</span>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
