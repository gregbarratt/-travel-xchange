import type { Metadata } from "next";

import { QuestionDetailPage } from "@/components/support/question-detail-page";

export const metadata: Metadata = {
  title: "Support Question",
  description: "Travel Xchange support question.",
};

type QuestionRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function QuestionRoute({ params }: QuestionRouteProps) {
  const { id } = await params;

  return <QuestionDetailPage questionId={id} />;
}
