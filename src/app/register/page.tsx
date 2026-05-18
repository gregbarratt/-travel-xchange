import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a Travel Xchange member account.",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start with a basic account. Role verification and richer profile tools come in later phases."
      footerText="Already have an account?"
      footerHref="/login"
      footerLinkText="Log in"
    >
      <AuthForm mode="register" />
    </AuthCard>
  );
}
