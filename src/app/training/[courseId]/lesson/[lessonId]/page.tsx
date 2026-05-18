import type { Metadata } from "next";

import { LessonPage } from "@/components/training/lesson-page";

export const metadata: Metadata = {
  title: "Lesson",
  description: "Travel Xchange training lesson.",
};

type LessonRouteProps = {
  params: Promise<{ courseId: string; lessonId: string }>;
};

export default async function LessonRoute({ params }: LessonRouteProps) {
  const { courseId, lessonId } = await params;

  return <LessonPage courseId={courseId} lessonId={lessonId} />;
}
