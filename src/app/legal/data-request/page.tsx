import type { Metadata } from "next";

import { DataRequestPage } from "@/components/legal/data-request-page";

export const metadata: Metadata = {
  title: "Data Deletion and Privacy Request",
  description:
    "Prepare a Travel Xchange privacy request to access, correct, delete, restrict, object to, or export account data.",
};

export default function DataRequestRoute() {
  return <DataRequestPage />;
}
