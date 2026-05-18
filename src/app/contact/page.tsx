import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Travel Xchange contact placeholder for partnership, supplier, advertising, and early access enquiries.",
};

const contactRoutes = [
  "Early access enquiries",
  "Supplier partnerships",
  "Recruitment packages",
  "Advertising and sponsorship",
];

export default function ContactPage() {
  return (
    <PlaceholderPage
      eyebrow="Contact"
      title="Contact routes are prepared"
      description="This page is ready for the first public version. A real contact form and email workflow will be added in a later phase."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {contactRoutes.map((route) => (
          <div
            className="rounded-lg border border-slate-200 bg-[#f8fafc] p-4 text-sm font-medium text-slate-800"
            key={route}
          >
            {route}
          </div>
        ))}
      </div>
    </PlaceholderPage>
  );
}
