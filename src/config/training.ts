import type { CourseCategory, CourseLevel } from "@/types/database";

export const courseCategoryOptions: Array<{
  description: string;
  label: string;
  value: CourseCategory | "all";
}> = [
  {
    description: "All training courses.",
    label: "All training",
    value: "all",
  },
  {
    description: "Destination and product knowledge.",
    label: "Destinations",
    value: "destination",
  },
  {
    description: "Cruise selling and product modules.",
    label: "Cruise",
    value: "cruise",
  },
  {
    description: "Sales, marketing, and client growth.",
    label: "Sales and marketing",
    value: "sales_marketing",
  },
  {
    description: "Compliance and regulation basics.",
    label: "Compliance",
    value: "compliance",
  },
  {
    description: "Booking tools, CRM, payments, and tech.",
    label: "Technology",
    value: "technology",
  },
  {
    description: "Supplier-sponsored learning.",
    label: "Supplier training",
    value: "supplier_training",
  },
  {
    description: "Starter training for new entrants.",
    label: "New starter",
    value: "new_starter",
  },
  {
    description: "Management and leadership training.",
    label: "Leadership",
    value: "leadership",
  },
];

export const courseLevelOptions: Array<{
  label: string;
  value: CourseLevel | "all";
}> = [
  { label: "All levels", value: "all" },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

export function getCourseCategoryLabel(category: string) {
  return (
    courseCategoryOptions.find((option) => option.value === category)?.label ??
    category.replaceAll("_", " ")
  );
}

export function getCourseLevelLabel(level: string) {
  return (
    courseLevelOptions.find((option) => option.value === level)?.label ??
    level.replaceAll("_", " ")
  );
}

export function formatCourseDuration(minutes: number | null) {
  if (!minutes) {
    return "Self-paced";
  }

  if (minutes < 60) {
    return `${minutes} mins`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder ? `${hours} hr ${remainder} mins` : `${hours} hr`;
}

export function slugifyCourseTitle(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "course"}-${Date.now()}`;
}
