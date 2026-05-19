export type SearchCategory =
  | "all"
  | "people"
  | "companies"
  | "suppliers"
  | "posts"
  | "groups"
  | "jobs"
  | "events"
  | "news"
  | "training"
  | "questions";

export type SearchResultType = Exclude<SearchCategory, "all">;

export const searchCategoryOptions: Array<{
  description: string;
  label: string;
  value: SearchCategory;
}> = [
  {
    description: "Search every available member area.",
    label: "All",
    value: "all",
  },
  {
    description: "Travel professionals and member profiles.",
    label: "People",
    value: "people",
  },
  {
    description: "Agency, recruiter, trainer, and partner companies.",
    label: "Companies",
    value: "companies",
  },
  {
    description: "Supplier and trade partner pages.",
    label: "Suppliers",
    value: "suppliers",
  },
  {
    description: "Xchange Feed posts and trade conversations.",
    label: "Posts",
    value: "posts",
  },
  {
    description: "Niche travel trade communities.",
    label: "Groups",
    value: "groups",
  },
  {
    description: "Travel trade roles and recruiter listings.",
    label: "Jobs",
    value: "jobs",
  },
  {
    description: "Webinars, fam trips, roadshows, and trade events.",
    label: "Events",
    value: "events",
  },
  {
    description: "News articles and supplier updates.",
    label: "News",
    value: "news",
  },
  {
    description: "Training courses and supplier modules.",
    label: "Training",
    value: "training",
  },
  {
    description: "Support questions and trade answers.",
    label: "Questions",
    value: "questions",
  },
];

export const trendingSearchTopics = [
  "Cruise capacity",
  "Supplier incentives",
  "Luxury enquiries",
  "Homeworker growth",
  "ATOL compliance",
  "Fam trips",
  "Travel technology",
  "Recruiter plans",
];

export function getSearchCategoryLabel(category: string) {
  return (
    searchCategoryOptions.find((option) => option.value === category)?.label ??
    category.replaceAll("_", " ")
  );
}

export function isSearchCategory(value: string): value is SearchCategory {
  return searchCategoryOptions.some((option) => option.value === value);
}
