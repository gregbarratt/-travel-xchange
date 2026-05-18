import type { JobCategory, JobEmploymentType, JobPackageType } from "@/types/database";

export const jobCategoryOptions: Array<{
  label: string;
  value: JobCategory | "all";
}> = [
  { label: "All jobs", value: "all" },
  { label: "Travel sales", value: "travel_sales" },
  { label: "Cruise", value: "cruise" },
  { label: "Tour operator", value: "tour_operator" },
  { label: "Business development", value: "business_development" },
  { label: "Marketing", value: "marketing" },
  { label: "Operations", value: "operations" },
  { label: "Customer service", value: "customer_service" },
  { label: "Travel technology", value: "travel_technology" },
  { label: "Training", value: "training" },
  { label: "Recruitment", value: "recruitment" },
];

export const employmentTypeOptions: Array<{
  label: string;
  value: JobEmploymentType;
}> = [
  { label: "Full time", value: "full_time" },
  { label: "Part time", value: "part_time" },
  { label: "Contract", value: "contract" },
  { label: "Temporary", value: "temporary" },
  { label: "Homeworking", value: "homeworking" },
  { label: "Freelance", value: "freelance" },
];

export const jobPackageOptions: Array<{
  description: string;
  label: string;
  value: JobPackageType;
}> = [
  {
    description: "Standard listing for early MVP testing.",
    label: "Basic job post",
    value: "basic",
  },
  {
    description: "Featured placement placeholder for paid listings.",
    label: "Featured job",
    value: "featured",
  },
  {
    description: "Sponsored employer placeholder for recruiter packages.",
    label: "Sponsored employer",
    value: "sponsored_employer",
  },
  {
    description: "Recruiter subscription placeholder for recurring plans.",
    label: "Recruiter subscription",
    value: "recruiter_subscription",
  },
];

export function getJobCategoryLabel(category: string) {
  return (
    jobCategoryOptions.find((option) => option.value === category)?.label ??
    category.replaceAll("_", " ")
  );
}

export function getEmploymentTypeLabel(type: string) {
  return (
    employmentTypeOptions.find((option) => option.value === type)?.label ??
    type.replaceAll("_", " ")
  );
}

export function getJobPackageLabel(packageType: string) {
  return (
    jobPackageOptions.find((option) => option.value === packageType)?.label ??
    packageType.replaceAll("_", " ")
  );
}

export function slugifyJobTitle(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "job"}-${Date.now()}`;
}
