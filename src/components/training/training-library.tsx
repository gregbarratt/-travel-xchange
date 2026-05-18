"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, BookOpen, GraduationCap, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { CourseCard } from "@/components/training/course-card";
import { buttonVariants } from "@/components/ui/button";
import {
  courseCategoryOptions,
  courseLevelOptions,
  getCourseCategoryLabel,
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
  CourseCategory,
  CourseEnrolment,
  CourseLevel,
  CourseWithMeta,
  Lesson,
  LessonProgress,
  Profile,
} from "@/types/database";

type CategoryFilter = CourseCategory | "all";
type LevelFilter = CourseLevel | "all";

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

function buildCourseRows(
  courses: Course[],
  lessons: Pick<Lesson, "course_id" | "id">[],
  enrolments: CourseEnrolment[],
  progressRows: LessonProgress[],
  companies: Pick<Company, "id" | "name" | "company_type">[],
): CourseWithMeta[] {
  const companyMap = new Map(companies.map((company) => [company.id, company]));
  const lessonCountMap = lessons.reduce<Map<string, number>>((map, lesson) => {
    map.set(lesson.course_id, (map.get(lesson.course_id) ?? 0) + 1);
    return map;
  }, new Map());
  const completedLessonIds = new Set(
    progressRows
      .filter((row) => row.status === "completed")
      .map((row) => row.lesson_id),
  );
  const completedCountMap = lessons.reduce<Map<string, number>>((map, lesson) => {
    if (completedLessonIds.has(lesson.id)) {
      map.set(lesson.course_id, (map.get(lesson.course_id) ?? 0) + 1);
    }

    return map;
  }, new Map());
  const enrolmentMap = new Map(
    enrolments.map((enrolment) => [enrolment.course_id, enrolment]),
  );

  return courses.map((course) => ({
    ...course,
    company: course.company_id ? companyMap.get(course.company_id) ?? null : null,
    completed_lesson_count: completedCountMap.get(course.id) ?? 0,
    enrolment: enrolmentMap.get(course.id) ?? null,
    lesson_count: lessonCountMap.get(course.id) ?? 0,
  }));
}

export function TrainingLibrary() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [activeLevel, setActiveLevel] = useState<LevelFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadCourses = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const [{ data: profileData }, { data: courseRows, error: coursesError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase
          .from("courses")
          .select("*")
          .eq("status", "published")
          .order("created_at", { ascending: true }),
      ]);

    setViewerProfile(profileData);

    if (coursesError) {
      setError(
        isMissingTrainingTable(coursesError)
          ? phase9SetupMessage
          : coursesError.message,
      );
      setCourses([]);
      setIsLoading(false);
      return;
    }

    const typedCourses = (courseRows ?? []) as Course[];
    const courseIds = typedCourses.map((course) => course.id);
    const companyIds = Array.from(
      new Set(
        typedCourses
          .map((course) => course.company_id)
          .filter(Boolean) as string[],
      ),
    );

    let lessonRows: Pick<Lesson, "course_id" | "id">[] = [];
    let enrolmentRows: CourseEnrolment[] = [];
    let progressRows: LessonProgress[] = [];
    let companyRows: Pick<Company, "id" | "name" | "company_type">[] = [];

    if (courseIds.length > 0) {
      const [lessonResult, enrolmentResult, progressResult] = await Promise.all([
        supabase
          .from("lessons")
          .select("id, course_id")
          .eq("status", "published")
          .in("course_id", courseIds),
        supabase
          .from("course_enrolments")
          .select("*")
          .eq("user_id", userData.user.id)
          .in("course_id", courseIds),
        supabase
          .from("lesson_progress")
          .select("*")
          .eq("user_id", userData.user.id)
          .in("course_id", courseIds),
      ]);

      const issue = lessonResult.error ?? enrolmentResult.error ?? progressResult.error;

      if (issue) {
        setError(
          isMissingTrainingTable(issue) ? phase9SetupMessage : issue.message,
        );
        setCourses([]);
        setIsLoading(false);
        return;
      }

      lessonRows = (lessonResult.data ?? []) as Pick<Lesson, "course_id" | "id">[];
      enrolmentRows = (enrolmentResult.data ?? []) as CourseEnrolment[];
      progressRows = (progressResult.data ?? []) as LessonProgress[];
    }

    if (companyIds.length > 0) {
      const { data: companiesData } = await supabase
        .from("companies")
        .select("id, name, company_type")
        .in("id", companyIds);

      companyRows = (companiesData ?? []) as Pick<
        Company,
        "id" | "name" | "company_type"
      >[];
    }

    setCourses(
      buildCourseRows(
        typedCourses,
        lessonRows,
        enrolmentRows,
        progressRows,
        companyRows,
      ),
    );
    setError(null);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCourses();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCourses]);

  const filteredCourses = courses.filter((course) => {
    const categoryMatches =
      activeCategory === "all" || course.category === activeCategory;
    const levelMatches = activeLevel === "all" || course.level === activeLevel;
    const searchMatches =
      !searchTerm.trim() ||
      [course.title, course.description, getCourseCategoryLabel(course.category)]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase());

    return categoryMatches && levelMatches && searchMatches;
  });
  const enrolledCourses = courses.filter((course) => course.enrolment);
  const sponsoredCourses = courses.filter((course) => course.is_supplier_sponsored);
  const certificateCourses = courses.filter((course) => course.certificate_available);

  return (
    <MemberPageShell
      activeLabel="Training"
      eyebrow="Training"
      title="Training academy"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so training cannot load.
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[#0f766e]">
              Phase 9 training academy
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
              Practical learning for travel professionals
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Browse starter courses, supplier modules, compliance basics, and
              technology training. Paid courses, CPD, and certificates expand
              in later phases.
            </p>
          </div>
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-[#0f766e] text-white hover:bg-[#115e59]",
            )}
            href="/training"
          >
            <GraduationCap className="size-4" aria-hidden="true" />
            Training library
          </Link>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                Search training
              </span>
              <input
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cruise, compliance, technology..."
                value={searchTerm}
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {courseCategoryOptions.map((option) => (
                <button
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition",
                    activeCategory === option.value
                      ? "border-[#0f766e] bg-[#e0f2f1] text-[#0f766e]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  key={option.value}
                  onClick={() => setActiveCategory(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {courseLevelOptions.map((option) => (
                <button
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition",
                    activeLevel === option.value
                      ? "border-[#082f49] bg-slate-100 text-[#082f49]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  key={option.value}
                  onClick={() => setActiveLevel(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading training...
            </div>
          ) : null}

          {!isLoading && filteredCourses.length === 0 && !error ? (
            <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
              <BookOpen className="mx-auto size-8 text-[#0f766e]" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">
                No courses match this view
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Try clearing the filters. Starter courses will appear here once
                the Phase 9 SQL has been run.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredCourses.map((course) => (
              <CourseCard course={course} key={course.id} />
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                Your learning
              </h2>
            </div>
            {enrolledCourses.length > 0 ? (
              <div className="mt-4 space-y-3">
                {enrolledCourses.map((course) => (
                  <Link
                    className="block rounded-md border border-slate-100 p-3 hover:bg-slate-50"
                    href={`/training/${course.id}`}
                    key={course.id}
                  >
                    <p className="font-semibold text-slate-950">{course.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {course.completed_lesson_count} of {course.lesson_count} lessons
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Courses you enrol in will appear here.
              </p>
            )}
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                Supplier modules
              </h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {sponsoredCourses.length} supplier-sponsored module
              {sponsoredCourses.length === 1 ? "" : "s"} available. Sponsored
              courses become a revenue option later.
            </p>
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Award className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                Certificates
              </h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {certificateCourses.length} course
              {certificateCourses.length === 1 ? "" : "s"} include a certificate
              placeholder. Downloadable certificates and CPD tracking arrive
              later.
            </p>
          </article>
        </aside>
      </div>
    </MemberPageShell>
  );
}
