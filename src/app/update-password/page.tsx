import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "Update Password",
  description: "Set a new Travel Xchange admin password.",
};

export default function UpdatePasswordPage() {
  return (
    <AuthCard
      title="Update password"
      description="Enter a new password after opening the secure reset link from your email."
      footerText="Already updated it?"
      footerHref="/login"
      footerLinkText="Back to login"
    >
      <UpdatePasswordForm />
    </AuthCard>
  );
}
