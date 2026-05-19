import type { Metadata } from "next";

import { AuthDisabledCard } from "@/components/auth/auth-disabled-card";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { publicAuthEnabled } from "@/config/launch";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to the Travel Xchange member area.",
};

export default function LoginPage() {
  if (!publicAuthEnabled) {
    return <AuthDisabledCard mode="login" />;
  }

  return (
    <AuthCard
      title="Log in"
      description="Access your Travel Xchange dashboard, onboarding, and future member tools."
      footerText="New to Travel Xchange?"
      footerHref="/register"
      footerLinkText="Create an account"
    >
      <AuthForm mode="login" />
      <div
        className="mt-6 rounded-lg border border-slate-200 bg-[#f8fafc] p-4 text-sm leading-6 text-slate-600"
        id="forgot-password"
      >
        Forgot password email reset will be wired in after the first Supabase
        project is connected and email settings are confirmed.
      </div>
    </AuthCard>
  );
}
