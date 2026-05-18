"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatCourseDuration } from "@/config/training";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Course,
  CourseEnrolment,
  Lesson,
  LessonProgress,
  Profile,
} from "@/types/database";

type LessonPageProps = {
  courseId: string;
  lessonId: string;
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

export function LessonPage({ courseId, lessonId }: LessonPageProps) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrolment, setEnrolment] = useState<CourseEnrolment | null>(null);
  const [progressRows, setProgressRows] = useState<LessonProgress[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadLesson = useCallback(async () => {
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

    const [
      { data: profileData },
      { data: courseData, error: courseError },
      { data: lessonData, error: lessonError },
      { data: lessonRows, error: lessonsError },
      { data: enrolmentData, error: enrolmentError },
      { data: progressData, error: progressError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle(),
      supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
      supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle(),
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

    setViewerProfile(profileData);

    const issue =
      courseError ??
      lessonError ??
      lessonsError ??
      enrolmentError ??
      progressError;

    if (issue) {
      setError(
        isMissingTrainingTable(issue) ? phase9SetupMessage : issue.message,
      );
      setIsLoading(false);
      return;
    }

    if (!courseData || !lessonData) {
      setError("That lesson could not be found.");
      setIsLoading(false);
      return;
    }

    setCourse(courseData as Course);
    setLesson(lessonData as Lesson);
    setLessons((lessonRows ?? []) as Lesson[]);
    setEnrolment(enrolmentData as CourseEnrolment | null);
    setProgressRows((progressData ?? []) as LessonProgress[]);
    setError(null);
    setIsLoading(false);
  }, [courseId, lessonId, router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLesson();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadLesson]);

  async function handleMarkComplete() {
    if (!supabase || !userId || !course || !lesson) {
      return;
    }

    setIsSaving(true);
    setActionError(null);

    const now = new Date().toISOString();

    if (!enrolment) {
      const { error: enrolError } = await supabase
        .from("course_enrolments")
        .insert({
          course_id: course.id,
          status: "active",
          user_id: userId,
        });

      if (enrolError && enrolError.code !== "23505") {
        setActionError(
          isMissingTrainingTable(enrolError)
            ? phase9SetupMessage
            : enrolError.message,
        );
        setIsSaving(false);
        return;
      }
    }

    const { error: progressError } = await supabase
      .from("lesson_progress")
      .upsert(
        {
          completed_at: now,
          course_id: course.id,
          lesson_id: lesson.id,
          status: "completed",
          user_id: userId,
        },
        { onConflict: "lesson_id,user_id" },
      );

    if (progressError) {
      setActionError(
        isMissingTrainingTable(progressError)
          ? phase9SetupMessage
          : progressError.message,
      );
      setIsSaving(false);
      return;
    }

    const completedLessonIds = new Set(
      progressRows
        .filter((row) => row.status === "completed")
        .map((row) => row.lesson_id),
    );
    completedLessonIds.add(lesson.id);

    if (
      lessons.length > 0 &&
      lessons.every((courseLesson) => completedLessonIds.has(courseLesson.id))
    ) {
      await supabase
        .from("course_enrolments")
        .update({
          completed_at: now,
          status: "completed",
        })
        .eq("course_id", course.id)
        .eq("user_id", userId);
    }

    setIsSaving(false);
    await loadLesson();
  }

  const currentIndex = lessons.findIndex((courseLesson) => courseLesson.id === lessonId);
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < lessons.length - 1
      ? lessons[currentIndex + 1]
      : null;
  const currentProgress = progressRows.find((row) => row.lesson_id === lessonId);
  const isComplete = currentProgress?.status === "completed";

  return (
    <MemberPageShell
      activeLabel="Training"
      actions={
        <Link
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "hidden sm:inline-flex",
          )}
          href={course ? `/training/${course.id}` : "/training"}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Course
        </Link>
      }
      eyebrow="Lesson"
      title={lesson?.title ?? "Training lesson"}
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so lessons cannot load.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading lesson...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {course && lesson ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#e0f2f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                <BookOpenIcon />
                {course.title}
              </span>
              {lesson.duration_minutes ? (
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  {formatCourseDuration(lesson.duration_minutes)}
                </span>
              ) : null}
              {isComplete ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  Complete
                </span>
              ) : null}
            </div>

            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
              {lesson.title}
            </h2>
            {lesson.summary ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {lesson.summary}
              </p>
            ) : null}

            {lesson.video_url ? (
              <a
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-5 bg-[#082f49] text-white hover:bg-[#0c4a6e]",
                )}
                href={lesson.video_url}
                rel="noreferrer"
                target="_blank"
              >
                <PlayCircle className="size-4" aria-hidden="true" />
                Open lesson video
              </a>
            ) : null}

            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {lesson.content}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {previousLesson ? (
                  <Link
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                    href={`/training/${course.id}/lesson/${previousLesson.id}`}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Previous
                  </Link>
                ) : null}
                {nextLesson ? (
                  <Link
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                    href={`/training/${course.id}/lesson/${nextLesson.id}`}
                  >
                    Next
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
              <Button
                className="h-10 bg-[#0f766e] px-4 text-white hover:bg-[#115e59]"
                disabled={isSaving || isComplete}
                onClick={handleMarkComplete}
                type="button"
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {isComplete ? "Lesson complete" : isSaving ? "Saving" : "Mark complete"}
              </Button>
            </div>

            {actionError ? (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {actionError}
              </p>
            ) : null}
          </article>

          <aside className="space-y-5">
            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Course lessons
              </h2>
              <div className="mt-4 space-y-2">
                {lessons.map((courseLesson) => {
                  const lessonProgress = progressRows.find(
                    (row) => row.lesson_id === courseLesson.id,
                  );
                  const active = courseLesson.id === lesson.id;

                  return (
                    <Link
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm hover:bg-slate-50",
                        active
                          ? "border-[#0f766e] bg-[#e0f2f1] text-[#0f766e]"
                          : "border-slate-200 text-slate-700",
                      )}
                      href={`/training/${course.id}/lesson/${courseLesson.id}`}
                      key={courseLesson.id}
                    >
                      <span>{courseLesson.display_order}. {courseLesson.title}</span>
                      {lessonProgress?.status === "completed" ? (
                        <CheckCircle2 className="size-4 text-[#0f766e]" aria-hidden="true" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Progress tracking
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Marking a lesson complete saves your progress. Certificates,
                CPD records, and richer quizzes arrive in later phases.
              </p>
            </article>
          </aside>
        </div>
      ) : null}
    </MemberPageShell>
  );
}

function BookOpenIcon() {
  return <PlayCircle className="size-3" aria-hidden="true" />;
}
