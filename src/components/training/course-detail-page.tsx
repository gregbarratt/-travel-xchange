"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  formatCourseDuration,
  getCourseCategoryLabel,
  getCourseLevelLabel,
} from "@/config/training";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Company,
  Course,
  CourseEnrolment,
  Lesson,
  LessonProgress,
  LessonWithProgress,
  Profile,
} from "@/types/database";

type CourseDetailPageProps = {
  courseId: string;
};

const phase9SetupMessage =
  "The Phase 9 training tables are not installed yet. Run supabase/phase-9-training.sql in Supabase, then refresh this page.";

function isMissingTrainingTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, [
    "courses",
    "lessons",
    "course_enrolments",
    "lesson_progress",
  ]);
}

function attachProgress(
  lessons: Lesson[],
  progressRows: LessonProgress[],
): LessonWithProgress[] {
  const progressMap = new Map(
    progressRows.map((progress) => [progress.lesson_id, progress]),
  );

  return lessons.map((lesson) => ({
    ...lesson,
    progress: progressMap.get(lesson.id) ?? null,
  }));
}

export function CourseDetailPage({ courseId }: CourseDetailPageProps) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [lessons, setLessons] = useState<LessonWithProgress[]>([]);
  const [enrolment, setEnrolment] = useState<CourseEnrolment | null>(null);
  const [isLoading, setIsLoading] = useState(configured);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadCourse = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    setUserId(userData.user.id);

    const [{ data: profileData }, { data: courseData, error: courseError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
      ]);

    setViewerProfile(profileData);

    if (courseError) {
      setError(
        isMissingTrainingTable(courseError)
          ? phase9SetupMessage
          : courseError.message,
      );
      setIsLoading(false);
      return;
    }

    if (!courseData) {
      setError("That course could not be found.");
      setIsLoading(false);
      return;
    }

    const typedCourse = courseData as Course;
    setCourse(typedCourse);

    const [lessonResult, enrolmentResult, progressResult] = await Promise.all([
      supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .eq("status", "published")
        .order("display_order", { ascending: true }),
      supabase
        .from("course_enrolments")
        .select("*")
        .eq("course_id", courseId)
        .eq("user_id", userData.user.id)
        .maybeSingle(),
      supabase
        .from("lesson_progress")
        .select("*")
        .eq("course_id", courseId)
        .eq("user_id", userData.user.id),
    ]);

    const issue = lessonResult.error ?? enrolmentResult.error ?? progressResult.error;

    if (issue) {
      setError(
        isMissingTrainingTable(issue) ? phase9SetupMessage : issue.message,
      );
      setIsLoading(false);
      return;
    }

    setLessons(
      attachProgress(
        (lessonResult.data ?? []) as Lesson[],
        (progressResult.data ?? []) as LessonProgress[],
      ),
    );
    setEnrolment(enrolmentResult.data as CourseEnrolment | null);

    if (typedCourse.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", typedCourse.company_id)
        .maybeSingle();

      setCompany(companyData as Company | null);
    }

    setError(null);
    setIsLoading(false);
  }, [courseId, router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCourse();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCourse]);

  async function handleEnrol() {
    if (!supabase || !userId || !course || enrolment) {
      return;
    }

    setIsEnrolling(true);
    setActionError(null);

    const { error: enrolError } = await supabase
      .from("course_enrolments")
      .insert({
        course_id: course.id,
        status: "active",
        user_id: userId,
      });

    if (enrolError) {
      setActionError(
        isMissingTrainingTable(enrolError)
          ? phase9SetupMessage
          : enrolError.code === "23505"
            ? "You are already enrolled in this course."
            : enrolError.message,
      );
      setIsEnrolling(false);
      return;
    }

    setIsEnrolling(false);
    await loadCourse();
  }

  const completedLessons = lessons.filter(
    (lesson) => lesson.progress?.status === "completed",
  ).length;
  const progress =
    lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;
  const firstIncompleteLesson =
    lessons.find((lesson) => lesson.progress?.status !== "completed") ??
    lessons[0] ??
    null;
  const isComplete = lessons.length > 0 && completedLessons === lessons.length;

  return (
    <MemberPageShell
      activeLabel="Training"
      actions={
        <Link
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "hidden sm:inline-flex",
          )}
          href="/training"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Training
        </Link>
      }
      eyebrow="Course"
      title={course?.title ?? "Training course"}
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so training cannot load.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading course...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {course ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-5">
            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
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

              <h2 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
                {course.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-700">
                {course.description}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Lessons
                  </p>
                  <p className="mt-2 font-medium text-slate-950">
                    {lessons.length}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Duration
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1 font-medium text-slate-950">
                    <Clock className="size-3" aria-hidden="true" />
                    {formatCourseDuration(course.duration_minutes)}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Certificate
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1 font-medium text-slate-950">
                    <Award className="size-3" aria-hidden="true" />
                    {course.certificate_available ? "Available" : "Placeholder"}
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Lessons
              </h2>
              <div className="mt-4 space-y-3">
                {lessons.map((lesson) => (
                  <Link
                    className="flex items-start justify-between gap-4 rounded-md border border-slate-200 p-4 hover:bg-slate-50"
                    href={`/training/${course.id}/lesson/${lesson.id}`}
                    key={lesson.id}
                  >
                    <span>
                      <span className="block font-semibold text-slate-950">
                        {lesson.display_order}. {lesson.title}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                        {lesson.summary ?? "Open this lesson to continue."}
                      </span>
                    </span>
                    <span className="mt-1 shrink-0 text-sm font-semibold text-slate-500">
                      {lesson.progress?.status === "completed" ? (
                        <CheckCircle2 className="size-5 text-[#0f766e]" aria-hidden="true" />
                      ) : (
                        <PlayCircle className="size-5 text-slate-400" aria-hidden="true" />
                      )}
                    </span>
                  </Link>
                ))}
                {lessons.length === 0 ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No lessons have been added to this course yet.
                  </p>
                ) : null}
              </div>
            </article>
          </section>

          <aside className="space-y-5">
            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Enrolment
              </h2>
              {enrolment ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
                    <span>Your progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[#0f766e]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {completedLessons} of {lessons.length} lessons completed.
                  </p>
                  {firstIncompleteLesson ? (
                    <Link
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "mt-4 w-full bg-[#0f766e] text-white hover:bg-[#115e59]",
                      )}
                      href={`/training/${course.id}/lesson/${firstIncompleteLesson.id}`}
                    >
                      Continue learning
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-slate-600">
                    Enrol to track your progress through this course.
                  </p>
                  {actionError ? (
                    <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                      {actionError}
                    </p>
                  ) : null}
                  <Button
                    className="mt-4 h-10 w-full bg-[#0f766e] text-white hover:bg-[#115e59]"
                    disabled={isEnrolling}
                    onClick={handleEnrol}
                    type="button"
                  >
                    {isEnrolling ? "Enrolling" : "Enrol in course"}
                  </Button>
                </div>
              )}
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Certificate placeholder
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {isComplete && course.certificate_available
                  ? "Certificate earned. Downloadable certificates arrive in a later phase."
                  : "Complete all lessons to unlock the certificate placeholder."}
              </p>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Course source
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {company?.name ??
                  (course.is_supplier_sponsored
                    ? "Supplier training module placeholder"
                    : "Travel Xchange academy")}
              </p>
            </article>
          </aside>
        </div>
      ) : null}
    </MemberPageShell>
  );
}
