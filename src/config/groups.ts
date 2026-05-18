import type { GroupCategory } from "@/types/database";

export const groupCategoryOptions: Array<{
  label: string;
  value: GroupCategory | "all";
}> = [
  { label: "All groups", value: "all" },
  { label: "Cruise", value: "cruise" },
  { label: "Luxury", value: "luxury" },
  { label: "Specialist", value: "specialist" },
  { label: "Touring & Adventure", value: "touring_adventure" },
  { label: "Homeworkers", value: "homeworking" },
  { label: "Compliance", value: "compliance" },
  { label: "Supplier Updates", value: "supplier_updates" },
  { label: "Marketing", value: "marketing" },
  { label: "General", value: "general" },
];

export function getGroupCategoryLabel(category: string) {
  return (
    groupCategoryOptions.find((option) => option.value === category)?.label ??
    category.replaceAll("_", " ")
  );
}

export function slugifyGroupName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `group-${Date.now()}`;
}
