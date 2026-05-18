import type { Metadata } from "next";

import { GroupCreateForm } from "@/components/groups/group-create-form";

export const metadata: Metadata = {
  title: "Create Group",
  description: "Create a Travel Xchange community group.",
};

export default function CreateGroupPage() {
  return <GroupCreateForm />;
}
