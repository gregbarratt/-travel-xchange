import type { Metadata } from "next";

import { CourseDetailPage } from "@/components/training/course-detail-page";

export const metadata: Metadata = {
  title: "Course",
  description: "Travel Xchange training course.",
};

type CourseRouteProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CourseRoute({ params }: CourseRouteProps) {
  const { courseId } = await params;

  return <CourseDetailPage courseId={courseId} />;
}
