import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about the Travel Xchange vision for a professional travel industry community.",
};

const points = [
  "A dedicated professional network for the travel trade",
  "Public media, community, jobs, events, training, and supplier spaces",
  "Built phase by phase so each feature can be tested before the next one starts",
];

export default function AboutPage() {
  return (
    <PlaceholderPage
      eyebrow="About"
      title="A central hub for the travel trade"
      description="Travel Xchange is being built to bring travel agents, suppliers, tour operators, recruiters, trainers, travel technology providers, and industry partners into one trusted professional platform."
    >
      <div className="grid gap-3 md:grid-cols-3">
        {points.map((point) => (
          <div
            className="rounded-lg border border-slate-200 bg-[#f8fafc] p-4 text-sm leading-6 text-slate-700"
            key={point}
          >
            {point}
          </div>
        ))}
      </div>
    </PlaceholderPage>
  );
}
