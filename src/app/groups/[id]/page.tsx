import type { Metadata } from "next";

import { GroupDetailPage } from "@/components/groups/group-detail-page";

export const metadata: Metadata = {
  title: "Group",
  description: "Travel Xchange group discussion.",
};

type GroupRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function GroupRoute({ params }: GroupRouteProps) {
  const { id } = await params;

  return <GroupDetailPage groupId={id} />;
}
