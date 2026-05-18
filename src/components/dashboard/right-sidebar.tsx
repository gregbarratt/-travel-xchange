"use client";

import { BriefcaseBusiness, Megaphone, TrendingUp, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getRoleLabel } from "@/config/roles";
import type { FeedProfile } from "@/types/database";

type RightSidebarProps = {
  isFollowing: boolean;
  onFollow: (profileId: string) => void;
  suggestions: FeedProfile[];
};

const trendingTopics = [
  "Cruise capacity",
  "Supplier incentives",
  "Luxury enquiries",
  "Homeworker growth",
];

const jobHighlights = [
  "Luxury Cruise Specialist",
  "Business Development Manager",
  "Travel Sales Homeworkers",
];

export function RightSidebar({
  isFollowing,
  onFollow,
  suggestions,
}: RightSidebarProps) {
  return (
    <aside className="space-y-4">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-[#0f766e]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-950">
            Advert placeholder
          </h2>
        </div>
        <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Supplier spotlight and sponsored placements will appear here in a
          later revenue phase.
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-[#0f766e]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-950">Trending</h2>
        </div>
        <div className="mt-3 space-y-2">
          {trendingTopics.map((topic) => (
            <p
              className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
              key={topic}
            >
              #{topic}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness className="size-4 text-[#0f766e]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-950">Jobs preview</h2>
        </div>
        <div className="mt-3 space-y-2">
          {jobHighlights.map((job) => (
            <p className="text-sm text-slate-700" key={job}>
              {job}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <UserPlus className="size-4 text-[#0f766e]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-950">
            People to follow
          </h2>
        </div>
        <div className="mt-3 space-y-3">
          {suggestions.length > 0 ? (
            suggestions.map((profile) => (
              <div
                className="flex items-center justify-between gap-3"
                key={profile.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {profile.full_name ?? "Travel member"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {getRoleLabel(profile.role)}
                  </p>
                </div>
                <Button
                  className="h-8 bg-[#082f49] px-3 text-white hover:bg-[#0c4a6e]"
                  disabled={isFollowing}
                  onClick={() => onFollow(profile.id)}
                  type="button"
                >
                  Follow
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-slate-600">
              More member suggestions will appear as the community grows.
            </p>
          )}
        </div>
      </section>
    </aside>
  );
}
