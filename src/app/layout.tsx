import type { Metadata } from "next";
import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";
import { siteConfig } from "@/config/site";
import { getAppUrl } from "@/lib/site-url";
import "./globals.css";

const appUrl = getAppUrl();

export const metadata: Metadata = {
  alternates: {
    canonical: appUrl,
  },
  metadataBase: new URL(appUrl),
  openGraph: {
    description: siteConfig.description,
    locale: "en_GB",
    siteName: siteConfig.name,
    title: siteConfig.name,
    type: "website",
    url: appUrl,
  },
  title: {
    default: "Travel Xchange",
    template: "%s | Travel Xchange",
  },
  description:
    "A professional community platform for the travel industry.",
  twitter: {
    card: "summary_large_image",
    description: siteConfig.description,
    title: siteConfig.name,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
