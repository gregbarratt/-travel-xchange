import type { Metadata } from "next";

import { SearchPage } from "@/components/search/search-page";
import { isSearchCategory, type SearchCategory } from "@/config/search";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Travel Xchange people, suppliers, posts, jobs, events, news, training, and questions.",
};

type SearchRouteProps = {
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
};

export default async function SearchRoute({ searchParams }: SearchRouteProps) {
  const params = await searchParams;
  const category: SearchCategory =
    params.category && isSearchCategory(params.category) ? params.category : "all";

  return (
    <SearchPage
      initialCategory={category}
      initialQuery={params.q?.slice(0, 80) ?? ""}
    />
  );
}
