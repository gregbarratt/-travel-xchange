import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a free Travel Xchange member account.",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your free account"
      description="Join Travel Xchange for free. Create your account, then complete onboarding so we can place you in the right travel trade role."
      footerText="Already have an account?"
      footerHref="/login"
      footerLinkText="Log in"
    >
      <AuthForm mode="register" />
    </AuthCard>
  );
}
