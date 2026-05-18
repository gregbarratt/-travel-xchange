import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Globe2,
  Handshake,
  Megaphone,
  MessageSquareText,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { PublicPageShell } from "@/components/layout/public-page-shell";
import { SectionHeading } from "@/components/layout/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const platformFeatures = [
  {
    title: "Xchange Feed",
    description:
      "A focused industry feed for conversations, supplier updates, questions, and useful trade insight.",
    icon: MessageSquareText,
  },
  {
    title: "Trade News",
    description:
      "A media-style news area for sector updates, supplier announcements, and trending stories.",
    icon: Newspaper,
  },
  {
    title: "Community Groups",
    description:
      "Dedicated spaces for cruise, luxury, touring, homeworkers, compliance, and specialist communities.",
    icon: Users,
  },
  {
    title: "Jobs Board",
    description:
      "A revenue-ready careers area for travel agencies, suppliers, recruiters, and homeworker networks.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Events Directory",
    description:
      "A home for webinars, fam trips, roadshows, training days, conferences, and supplier events.",
    icon: CalendarDays,
  },
  {
    title: "Training Academy",
    description:
      "A future learning hub for supplier modules, skills training, certificates, and CPD-style progress.",
    icon: BookOpen,
  },
];

const audiences = [
  "Travel agents and homeworkers",
  "Tour operators and cruise lines",
  "Recruiters and employers",
  "Training providers and educators",
  "Travel technology companies",
  "Advertisers and industry partners",
];

const revenueStreams = [
  {
    title: "Advertising",
    description:
      "Banner spaces, sponsored posts, supplier spotlights, newsletter sponsorship, and group sponsorship.",
    icon: Megaphone,
  },
  {
    title: "Recruitment",
    description:
      "Paid job posts, featured employers, recruiter packages, and branded hiring pages.",
    icon: Building2,
  },
  {
    title: "Memberships",
    description:
      "Premium professionals, supplier plans, recruiter plans, advertiser plans, and training provider plans.",
    icon: BadgeCheck,
  },
];

const trustPoints = [
  {
    title: "Verified industry membership",
    description:
      "Verification tiers are planned so members can see who is a genuine travel professional or supplier.",
    icon: ShieldCheck,
  },
  {
    title: "Built for the travel trade",
    description:
      "Every area is shaped around agents, suppliers, recruiters, trainers, and trade partners.",
    icon: Globe2,
  },
  {
    title: "Commercial from the start",
    description:
      "Jobs, advertising, memberships, events, and training are built into the roadmap.",
    icon: Handshake,
  },
];

export default function Home() {
  return (
    <PublicPageShell>
      <main>
        <section
          className="relative isolate flex min-h-[72svh] items-center overflow-hidden bg-[#082f49] px-4 py-20 text-white sm:px-6 lg:px-8"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(8, 47, 73, 0.9), rgba(8, 47, 73, 0.62), rgba(15, 118, 110, 0.42)), url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1800&q=80')",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-lg bg-white/12 px-3 py-2 text-sm font-medium text-cyan-50 ring-1 ring-white/25 backdrop-blur">
                <Sparkles className="size-4" aria-hidden="true" />
                {siteConfig.tagline}
              </p>
              <h1 className="mt-6 text-4xl font-semibold tracking-normal sm:text-5xl lg:text-6xl">
                {siteConfig.name}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-cyan-50">
                A modern professional community for travel agents, suppliers,
                tour operators, recruiters, trainers, travel technology
                providers, and industry partners.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full bg-[#0f766e] text-white hover:bg-[#115e59] sm:w-auto",
                  )}
                  href="/register"
                >
                  Create account
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full border-white/45 bg-white/10 text-white hover:bg-white hover:text-[#082f49] sm:w-auto",
                  )}
                  href="/about"
                >
                  See the vision
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-3 text-sm font-medium text-slate-600 sm:grid-cols-3">
            <div>Built for verified travel professionals</div>
            <div>Designed for supplier and recruiter revenue</div>
            <div>Prepared for web now and mobile later</div>
          </div>
        </section>

        <section
          className="bg-[#f8fafc] px-4 py-16 sm:px-6 lg:px-8"
          id="platform"
        >
          <div className="mx-auto w-full max-w-7xl">
            <SectionHeading
              eyebrow="Platform"
              title="One trade hub instead of scattered channels"
              description="Travel Xchange brings media, community, recruitment, events, training, supplier updates, and support into one consistent member experience."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {platformFeatures.map((feature) => (
                <article
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                  key={feature.title}
                >
                  <feature.icon
                    className="size-6 text-[#0f766e]"
                    aria-hidden="true"
                  />
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8" id="members">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase text-[#0f766e]">
                Members
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                Built around the people who keep travel moving
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                The MVP will start with clear public positioning, then add
                authentication, onboarding, professional profiles, company
                pages, feed activity, and specialist communities in later
                phases.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {audiences.map((audience) => (
                <div
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-[#f8fafc] p-4"
                  key={audience}
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#f97316]/12 text-[#c2410c]">
                    <BadgeCheck className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium text-slate-800">
                    {audience}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#ecfeff] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-4 md:grid-cols-3">
            {trustPoints.map((point) => (
              <article className="rounded-lg bg-white p-6 shadow-sm" key={point.title}>
                <point.icon
                  className="size-6 text-[#0e7490]"
                  aria-hidden="true"
                />
                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  {point.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {point.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="bg-[#082f49] px-4 py-16 text-white sm:px-6 lg:px-8"
          id="revenue"
        >
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-cyan-200">
                Monetisation preview
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
                Designed to become a commercial travel trade platform
              </h2>
              <p className="mt-4 text-base leading-7 text-cyan-50">
                Phase 1 only shows the public story. The revenue tools will be
                added later through jobs, advertising, subscriptions, training,
                events, and marketplace options.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {revenueStreams.map((stream) => (
                <article
                  className="rounded-lg border border-white/15 bg-white/8 p-6"
                  key={stream.title}
                >
                  <stream.icon
                    className="size-6 text-[#22d3ee]"
                    aria-hidden="true"
                  />
                  <h3 className="mt-5 text-lg font-semibold">
                    {stream.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-cyan-50">
                    {stream.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 rounded-lg border border-slate-200 bg-[#f8fafc] p-6 sm:p-8 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase text-[#0f766e]">
                Next phase
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
                Public brand and layout are ready for review.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Phase 2 adds the first account, onboarding, and dashboard flow.
                After this is tested and pushed, Phase 3 will add the main
                social feed experience.
              </p>
            </div>
            <Link
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full bg-[#0f766e] hover:bg-[#115e59] sm:w-auto",
              )}
              href="/register"
            >
              Create account
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
