import type { Metadata } from "next";

import { ProductionReadinessPage } from "@/components/production/production-readiness-page";
import { getProductionReadinessSummary } from "@/lib/production/readiness";

export const metadata: Metadata = {
  title: "Production Readiness",
  description: "Travel Xchange launch readiness checklist and environment review.",
};

export default function AdminProductionReadinessRoute() {
  const summary = getProductionReadinessSummary();

  return <ProductionReadinessPage summary={summary} />;
}
