"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  AdminEmptyState,
  AdminStatusBadge,
  getStatusTone,
} from "@/components/admin/admin-ui";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { allRoleOptions } from "@/config/roles";
import { verificationTierOptions } from "@/config/admin";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { Profile, TravelXchangeRole, VerificationTier } from "@/types/database";

type AdminProfile = Profile & {
  email: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminUsersPage() {
  return (
    <AdminPageShell
      activeHref="/admin/users"
      description="Review member accounts, update roles, and set verification tiers for trusted travel trade users."
      title="User management"
    >
      {({ viewerProfile }) => (
        <AdminUsersContent viewerProfile={viewerProfile} />
      )}
    </AdminPageShell>
  );
}

function AdminUsersContent({
  viewerProfile,
}: {
  viewerProfile: Profile;
}) {
  const configured = isSupabaseConfigured();
  const canManageUsers = viewerProfile.role === "super_admin";
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] =
    useState<TravelXchangeRole>("verified_travel_professional");
  const [newUserVerification, setNewUserVerification] =
    useState<VerificationTier>("travel_professional_verified");

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadProfiles = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const token = await getAccessToken(supabase);

    if (!token) {
      setError("Please log in again before loading users.");
      setIsLoading(false);
      return;
    }

    const response = await fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; profiles?: AdminProfile[] }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Users could not be loaded.");
      setIsLoading(false);
      return;
    }

    setProfiles(payload?.profiles ?? []);
    setError(null);
    setIsLoading(false);
  }, [supabase]);

  async function handleCreateOrPromoteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    const token = await getAccessToken(supabase);

    if (!token) {
      setError("Please log in again before creating a user.");
      return;
    }

    setIsCreatingUser(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/users", {
      body: JSON.stringify({
        email: newUserEmail,
        fullName: newUserFullName,
        password: newUserPassword,
        role: newUserRole,
        verificationTier: newUserVerification,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "The user could not be created or updated.");
      setIsCreatingUser(false);
      return;
    }

    setMessage(payload?.message ?? "User updated.");
    setNewUserPassword("");
    setIsCreatingUser(false);
    await loadProfiles();
  }

  async function updateProfileRole(profile: AdminProfile, role: TravelXchangeRole) {
    if (!supabase || profile.role === role || !canManageUsers) {
      return;
    }

    if (!profile.email) {
      setError("This member does not have an email address loaded.");
      return;
    }

    setBusyId(profile.id);
    setError(null);
    setMessage(null);

    const token = await getAccessToken(supabase);

    if (!token) {
      setError("Please log in again before updating a user.");
      setBusyId(null);
      return;
    }

    const response = await fetch("/api/admin/users", {
      body: JSON.stringify({
        email: profile.email,
        fullName: profile.full_name ?? "",
        role,
        verificationTier: profile.verification_tier,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "The user role could not be updated.");
      setBusyId(null);
      return;
    }

    setMessage(payload?.message ?? "Role updated.");
    setBusyId(null);
    await loadProfiles();
  }

  async function updateVerificationTier(
    profile: AdminProfile,
    verificationTier: VerificationTier,
  ) {
    if (!supabase || profile.verification_tier === verificationTier || !canManageUsers) {
      return;
    }

    if (!profile.email) {
      setError("This member does not have an email address loaded.");
      return;
    }

    setBusyId(profile.id);
    setError(null);
    setMessage(null);

    const token = await getAccessToken(supabase);

    if (!token) {
      setError("Please log in again before updating a user.");
      setBusyId(null);
      return;
    }

    const response = await fetch("/api/admin/users", {
      body: JSON.stringify({
        email: profile.email,
        fullName: profile.full_name ?? "",
        role: profile.role,
        verificationTier,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "The verification tier could not be updated.");
      setBusyId(null);
      return;
    }

    setMessage(payload?.message ?? "Verification tier updated.");
    setBusyId(null);
    await loadProfiles();
  }

  async function sendPasswordSetupEmail(profile: AdminProfile) {
    if (!supabase || !canManageUsers) {
      return;
    }

    if (!profile.email) {
      setError("This member does not have an email address loaded.");
      return;
    }

    setBusyId(profile.id);
    setError(null);
    setMessage(null);

    const token = await getAccessToken(supabase);

    if (!token) {
      setError("Please log in again before sending an access email.");
      setBusyId(null);
      return;
    }

    const response = await fetch("/api/admin/users", {
      body: JSON.stringify({
        action: "resend_access_email",
        email: profile.email,
        role: profile.role,
        verificationTier: profile.verification_tier,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "The password setup email could not be sent.");
      setBusyId(null);
      return;
    }

    setMessage(payload?.message ?? "Password setup email sent.");
    setBusyId(null);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfiles();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProfiles]);

  if (isLoading) {
    return <div className="tx-card p-6 text-sm text-[#4d6b9e]">Loading users...</div>;
  }

  if (profiles.length === 0 && !error) {
    return (
      <AdminEmptyState title="No users yet">
        Registered members will appear here once they create Travel Xchange
        accounts.
      </AdminEmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      <section className="tx-card p-5">
        <div>
          <h2 className="text-lg font-extrabold text-[#061b4f]">
            Create or promote user
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#4d6b9e]">
            Super Admins can create a login with a temporary password or update
            an existing account by email. This keeps owner access inside Travel
            Xchange instead of requiring SQL.
          </p>
        </div>

        {canManageUsers ? (
          <form
            className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_220px_260px_auto] xl:items-end"
            onSubmit={handleCreateOrPromoteUser}
          >
            <TextField
              label="Email"
              name="new-user-email"
              onChange={(event) => setNewUserEmail(event.target.value)}
              placeholder="person@example.com"
              required
              type="email"
              value={newUserEmail}
            />
            <TextField
              label="Full name"
              name="new-user-full-name"
              onChange={(event) => setNewUserFullName(event.target.value)}
              placeholder="Full name"
              value={newUserFullName}
            />
            <TextField
              autoComplete="new-password"
              hint="Required for a new user. For an existing user, enter a new password only if you want to reset it."
              label="Temporary password"
              minLength={6}
              name="new-user-password"
              onChange={(event) => setNewUserPassword(event.target.value)}
              placeholder="At least 6 characters"
              type="password"
              value={newUserPassword}
            />
            <SelectField
              label="Role"
              name="new-user-role"
              onChange={(event) =>
                setNewUserRole(event.target.value as TravelXchangeRole)
              }
              options={allRoleOptions}
              value={newUserRole}
            />
            <SelectField
              label="Verification"
              name="new-user-verification"
              onChange={(event) =>
                setNewUserVerification(event.target.value as VerificationTier)
              }
              options={verificationTierOptions}
              value={newUserVerification}
            />
            <Button
              className="h-11 bg-[#061b4f] px-5 text-white hover:bg-[#063b86]"
              disabled={isCreatingUser}
              type="submit"
            >
              {isCreatingUser ? "Saving" : "Create / update"}
            </Button>
          </form>
        ) : (
          <div className="mt-4 rounded-lg border border-[#d9e4f5] bg-[#f8fbff] p-4 text-sm leading-6 text-[#4d6b9e]">
            Only a Super Admin can create users or promote someone to admin
            roles.
          </div>
        )}
      </section>

      <section className="tx-card overflow-hidden">
        <div className="border-b border-[#d9e4f5] p-5">
          <h2 className="text-lg font-extrabold text-[#061b4f]">
            Member accounts
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#4d6b9e]">
            Use this carefully. Role and verification changes affect what a
            person can access.
          </p>
        </div>

        <div className="divide-y divide-[#d9e4f5]">
          {profiles.map((profile) => (
            <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_220px_260px_190px]" key={profile.id}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-extrabold text-[#061b4f]">
                    {profile.full_name ?? "Unnamed member"}
                  </h3>
                  <AdminStatusBadge
                    tone={getStatusTone(
                      profile.onboarding_completed ? "complete" : "pending",
                    )}
                  >
                    {profile.onboarding_completed ? "Onboarded" : "Pending"}
                  </AdminStatusBadge>
                </div>
                <p className="mt-1 text-sm leading-6 text-[#4d6b9e]">
                  {profile.headline ?? "No headline yet"}
                </p>
                {profile.email ? (
                  <p className="mt-1 text-sm font-semibold text-[#063b86]">
                    {profile.email}
                  </p>
                ) : null}
                <p className="mt-1 text-xs font-medium text-[#7288b8]">
                  Joined {formatDate(profile.created_at)}
                </p>
              </div>

              <SelectField
                disabled={busyId === profile.id || !canManageUsers}
                label="Role"
                name={`role-${profile.id}`}
                onChange={(event) =>
                  void updateProfileRole(
                    profile,
                    event.target.value as TravelXchangeRole,
                  )
                }
                options={allRoleOptions}
                value={profile.role}
              />

              <SelectField
                disabled={busyId === profile.id || !canManageUsers}
                label="Verification"
                name={`verification-${profile.id}`}
                onChange={(event) =>
                  void updateVerificationTier(
                    profile,
                    event.target.value as VerificationTier,
                  )
                }
                options={verificationTierOptions}
                value={profile.verification_tier}
              />

              <div className="flex items-end">
                <Button
                  className="h-11 w-full border border-[#b8cae8] bg-white px-4 text-[#061b4f] hover:bg-[#f8fbff]"
                  disabled={busyId === profile.id || !canManageUsers || !profile.email}
                  onClick={() => void sendPasswordSetupEmail(profile)}
                  type="button"
                >
                  Send setup email
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

async function getAccessToken(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
) {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
