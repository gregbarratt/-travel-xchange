"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  CalendarDays,
  Megaphone,
  Sparkles,
  TrendingUp,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { AdPlacementSlot } from "@/components/adverts/ad-placement";
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

const featuredCommunities = [
  "Cruise Sellers",
  "Luxury Travel",
  "Supplier Updates",
];

const upcomingMoments = [
  "Roadshow season planning",
  "Summer capacity updates",
  "Training webinar watchlist",
];

export function RightSidebar({
  isFollowing,
  onFollow,
  suggestions,
}: RightSidebarProps) {
  return (
    <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
      <AdPlacementSlot
        placementKey="feed_right_sidebar_ad"
        variant="sidebar"
      />

      <AdPlacementSlot
        placementKey="supplier_spotlight_card"
        variant="spotlight"
      />

      <section className="tx-card-soft p-5">
        <div className="flex items-center gap-2">
          <UsersRound className="size-4 text-[#063b86]" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-[#061b4f]">
            Featured communities
          </h2>
        </div>
        <div className="mt-3 space-y-2">
          {featuredCommunities.map((community) => (
            <Link
              className="flex items-center justify-between rounded-lg bg-[#f2f6fd] px-3 py-2 text-sm font-bold text-[#061b4f] transition hover:bg-[#fff0f5] hover:text-[#f52968]"
              href="/groups"
              key={community}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-[#ff7a2f]" aria-hidden="true" />
                {community}
              </span>
              <span className="text-xs text-[#6f86b5]">Join</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="tx-card-soft p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-[#063b86]" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-[#061b4f]">
            Trending conversations
          </h2>
        </div>
        <div className="mt-3 space-y-2">
          {trendingTopics.map((topic) => (
            <p
              className="rounded-lg bg-[#f2f6fd] px-3 py-2 text-sm font-bold text-[#061b4f]"
              key={topic}
            >
              #{topic}
            </p>
          ))}
        </div>
      </section>

      <section className="tx-card-soft p-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-[#063b86]" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-[#061b4f]">
            Coming up
          </h2>
        </div>
        <div className="mt-3 space-y-2">
          {upcomingMoments.map((moment) => (
            <p className="text-sm font-medium text-[#203b70]" key={moment}>
              {moment}
            </p>
          ))}
        </div>
      </section>

      <section className="tx-card-soft p-5">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness className="size-4 text-[#063b86]" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-[#061b4f]">
            Trade opportunities
          </h2>
        </div>
        <div className="mt-3 space-y-2">
          {jobHighlights.map((job) => (
            <p className="text-sm font-medium text-[#203b70]" key={job}>
              {job}
            </p>
          ))}
        </div>
      </section>

      <section className="tx-card-soft p-5">
        <div className="flex items-center gap-2">
          <UserPlus className="size-4 text-[#063b86]" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-[#061b4f]">
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
                  <p className="truncate text-sm font-bold text-[#061b4f]">
                    {profile.full_name ?? "Travel member"}
                  </p>
                  <p className="truncate text-xs text-[#4d6b9e]">
                    {getRoleLabel(profile.role)}
                  </p>
                </div>
                <Button
                  className="h-8 bg-[#062050] px-3 text-white hover:bg-[#093a83]"
                  disabled={isFollowing}
                  onClick={() => onFollow(profile.id)}
                  type="button"
                >
                  Follow
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-[#4d6b9e]">
              Member suggestions will appear as the community grows.
            </p>
          )}
        </div>
      </section>

      <section className="tx-card-soft p-5">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-[#063b86]" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-[#061b4f]">
            Supplier noticeboard
          </h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#4d6b9e]">
          Supplier launches, incentives, and trade announcements will surface
          here as the network grows.
        </p>
      </section>
    </aside>
  );
}
