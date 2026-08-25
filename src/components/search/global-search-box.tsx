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
        "flex items-center gap-2 rounded-[var(--tx-radius-sm)] border border-[var(--tx-border)] bg-[var(--tx-surface)] text-[var(--tx-text)]",
        size === "large" ? "px-4 py-3" : "h-9 px-3",
        className,
      )}
      onSubmit={handleSubmit}
    >
      <Search className="size-4 shrink-0 text-[var(--tx-text-subtle)]" aria-hidden="true" />
      <label className="sr-only" htmlFor="global-search">
        Search Travel Xchange
      </label>
      <input
        className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[var(--tx-text-subtle)]"
        id="global-search"
        maxLength={80}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        value={query}
      />
      <button
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--tx-radius-sm)] bg-[var(--tx-accent)] text-white transition hover:bg-[var(--tx-accent-hover)]"
        title="Search"
        type="submit"
      >
        <SendHorizontal className="size-4" aria-hidden="true" />
        <span className="sr-only">Search</span>
      </button>
    </form>
  );
}
