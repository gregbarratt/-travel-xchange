import type { Metadata } from "next";

import { AdvertManager } from "@/components/adverts/advert-manager";

export const metadata: Metadata = {
  title: "Advert Manager",
  description: "Travel Xchange advertising and sponsorship manager.",
};

export default function AdminAdvertsPage() {
  return <AdvertManager />;
}
