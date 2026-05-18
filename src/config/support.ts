import type { QuestionCategory } from "@/types/database";

export const questionCategoryOptions: Array<{
  description: string;
  label: string;
  value: QuestionCategory | "all";
}> = [
  {
    description: "All support questions.",
    label: "All questions",
    value: "all",
  },
  {
    description: "Booking tools, CRMs, and operational systems.",
    label: "Booking systems",
    value: "booking_systems",
  },
  {
    description: "Supplier contacts, processes, and product support.",
    label: "Suppliers",
    value: "suppliers",
  },
  {
    description: "Cards, fees, refunds, payments, and payment partners.",
    label: "Payments",
    value: "payments",
  },
  {
    description: "ATOL, package travel, regulation, and compliance basics.",
    label: "ATOL and compliance",
    value: "atol_compliance",
  },
  {
    description: "Marketing, social media, emails, and lead generation.",
    label: "Marketing",
    value: "marketing",
  },
  {
    description: "Cruise selling, lines, cabins, itineraries, and objections.",
    label: "Cruise",
    value: "cruise",
  },
  {
    description: "Long haul destination and itinerary support.",
    label: "Long haul",
    value: "long_haul",
  },
  {
    description: "Complaints, changes, refunds, and customer handling.",
    label: "Complaints handling",
    value: "complaints_handling",
  },
  {
    description: "Support for new starters and early-career members.",
    label: "New starter help",
    value: "new_starter_help",
  },
];

export function getQuestionCategoryLabel(category: string) {
  return (
    questionCategoryOptions.find((option) => option.value === category)?.label ??
    category.replaceAll("_", " ")
  );
}

export function slugifyQuestionTitle(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "question"}-${Date.now()}`;
}

export function formatSupportDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
