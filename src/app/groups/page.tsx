import type { Metadata } from "next";

import { GroupsDirectory } from "@/components/groups/groups-directory";

export const metadata: Metadata = {
  title: "Groups",
  description: "Travel Xchange community groups.",
};

export default function GroupsPage() {
  return <GroupsDirectory />;
}
