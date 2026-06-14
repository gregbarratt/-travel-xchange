import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding paused",
  description: "Travel Xchange onboarding is paused during closed launch.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function OnboardingPage() {
  redirect("/dashboard");
}
