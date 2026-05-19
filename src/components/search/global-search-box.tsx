"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SendHorizontal } from "lucide-react";

import type { SearchCategory } from "@/config/search";
import { cn } from "@/lib/utils";

type GlobalSearchBoxProps = {
  category?: SearchCategory;
  className?: string;
  initialQuery?: string;
  placeholder?: string;
  size?: "compact" | "large";
};

export function GlobalSearchBox({
  category = "all",
  className,
  initialQuery = "",
  placeholder = "Search Travel Xchange",
  size = "large",
}: GlobalSearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setQuery(initialQuery);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();
    const params = new URLSearchParams();

    if (trimmed) {
      params.set("q", trimmed);
    }

    if (category !== "all") {
      params.set("category", category);
    }

    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      className={cn(
        "flex items-center gap-3 rounded-lg border border-[#b8cae8] bg-white/90 text-[#061b4f] shadow-[0_10px_24px_rgba(7,36,91,0.1)]",
        size === "large" ? "px-4 py-3" : "px-3 py-2",
        className,
      )}
      onSubmit={handleSubmit}
    >
      <Search className="size-4 shrink-0 text-[#063b86]" aria-hidden="true" />
      <label className="sr-only" htmlFor="global-search">
        Search Travel Xchange
      </label>
      <input
        className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[#7288b8]"
        id="global-search"
        maxLength={80}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        value={query}
      />
      <button
        className="inline-flex size-8 items-center justify-center rounded-lg bg-[#063b86] text-white transition hover:bg-[#061b4f]"
        title="Search"
        type="submit"
      >
        <SendHorizontal className="size-4" aria-hidden="true" />
        <span className="sr-only">Search</span>
      </button>
    </form>
  );
}
