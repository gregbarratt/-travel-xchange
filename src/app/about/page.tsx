import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "About",
  description:
    "Travel Xchange about page is closed during private beta preparation.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function AboutPage() {
  redirect("/login");
}
