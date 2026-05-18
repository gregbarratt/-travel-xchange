import Link from "next/link";
import { Award, BookOpen, CheckCircle2, Clock, Sparkles } from "lucide-react";

import {
  formatCourseDuration,
  getCourseCategoryLabel,
  getCourseLevelLabel,
} from "@/config/training";
import { cn } from "@/lib/utils";
import type { CourseWithMeta } from "@/types/database";

type CourseCardProps = {
  course: CourseWithMeta;
};

export function CourseCard({ course }: CourseCardProps) {
  const progress =
    course.lesson_count > 0
      ? Math.round((course.completed_lesson_count / course.lesson_count) * 100)
      : 0;

  return (
    <article
      className={cn(
        "rounded-md border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        course.is_supplier_sponsored ? "border-[#0f766e]" : "border-slate-200",
      )}
    >
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-[#e0f2f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
          <BookOpen className="size-3" aria-hidden="true" />
          {getCourseCategoryLabel(course.category)}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
          {getCourseLevelLabel(course.level)}
        </span>
        {course.is_supplier_sponsored ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            <Sparkles className="size-3" aria-hidden="true" />
            Supplier sponsored
          </span>
        ) : null}
      </div>

      <Link href={`/training/${course.id}`}>
        <h2 className="mt-3 text-xl font-semibold tracking-normal text-slate-950">
          {course.title}
        </h2>
      </Link>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">
        {course.description}
      </p>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Lessons
          </p>
          <p className="mt-1 font-medium text-slate-950">
            {course.lesson_count}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Duration
          </p>
          <p className="mt-1 inline-flex items-center gap-1 font-medium text-slate-950">
            <Clock className="size-3" aria-hidden="true" />
            {formatCourseDuration(course.duration_minutes)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Certificate
          </p>
          <p className="mt-1 inline-flex items-center gap-1 font-medium text-slate-950">
            <Award className="size-3" aria-hidden="true" />
            {course.certificate_available ? "Available" : "Placeholder"}
          </p>
        </div>
      </div>

      {course.enrolment ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3 text-[#0f766e]" aria-hidden="true" />
              Your progress
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#0f766e]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm font-medium text-slate-500">
          Not enrolled yet
        </p>
      )}
    </article>
  );
}
