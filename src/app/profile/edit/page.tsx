import type { Metadata } from "next";

import { ProfileEditForm } from "@/components/profile/profile-edit-form";

export const metadata: Metadata = {
  title: "Edit Profile",
  description: "Edit your Travel Xchange profile.",
};

export default function EditProfilePage() {
  return <ProfileEditForm />;
}
