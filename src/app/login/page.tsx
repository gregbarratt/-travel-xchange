import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Owner Login",
  description: "Hidden owner and admin login for Travel Xchange.",
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Owner / admin login"
      description="This hidden page is for existing Travel Xchange owner and admin accounts only. Public member registration is still closed."
      footerText="Not an admin?"
      footerHref="/"
      footerLinkText="Back to launch page"
    >
      <AuthForm mode="login" redirectPath="/admin" />
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
