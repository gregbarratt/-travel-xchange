import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Travel Xchange contact page is closed during private beta preparation.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function ContactPage() {
  redirect("/login");
}
