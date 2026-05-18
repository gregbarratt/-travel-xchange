import type { Metadata } from "next";

import { TrainingLibrary } from "@/components/training/training-library";

export const metadata: Metadata = {
  title: "Training",
  description: "Travel Xchange training academy.",
};

export default function TrainingPage() {
  return <TrainingLibrary />;
}
