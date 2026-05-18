import type { Metadata } from "next";

import { ProfilePage } from "@/components/profile/profile-page";

export const metadata: Metadata = {
  title: "Member Profile",
  description: "Travel Xchange member profile.",
};

type ProfileRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function ProfileRoute({ params }: ProfileRouteProps) {
  const { id } = await params;

  return <ProfilePage profileId={id} />;
}
