import type { Metadata } from "next";

import { AskQuestionForm } from "@/components/support/ask-question-form";

export const metadata: Metadata = {
  title: "Ask a Question",
  description: "Ask a Travel Xchange support question.",
};

export default function AskQuestionPage() {
  return <AskQuestionForm />;
}
