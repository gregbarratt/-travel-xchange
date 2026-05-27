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
import { allRoleOptions, getRoleLabel } from "@/config/roles";
import {
  getVerificationTierLabel,
  verificationTierOptions,
} from "@/config/admin";
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
      {({ userId, viewerProfile }) => (
        <AdminUsersContent userId={userId} viewerProfile={viewerProfile} />
      )}
    </AdminPageShell>
  );
}

function AdminUsersContent({
  userId,
  viewerProfile,
}: {
  userId: string;
  viewerProfile: Profile;
}) {
  const configured = isSupabaseConfigured();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState(
    "accounts@onetravelclub.co.uk",
  );
  const [newUserFullName, setNewUserFullName] = useState(
    "One Travel Club Accounts",
  );
  const [newUserRole, setNewUserRole] =
    useState<TravelXchangeRole>("super_admin");
  const [newUserVerification, setNewUserVerification] =
    useState<VerificationTier>("admin_verified");

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
    setIsCreatingUser(false);
    await loadProfiles();
  }

  async function updateProfileRole(profile: Profile, role: TravelXchangeRole) {
    if (!supabase || profile.role === role) {
      return;
    }

    setBusyId(profile.id);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      setBusyId(null);
      return;
    }

    await supabase.from("audit_logs").insert({
      action: "profile.role_updated",
      actor_id: userId,
      entity_id: profile.id,
      entity_type: "profile",
      summary: `Changed ${profile.full_name ?? "member"} to ${getRoleLabel(role)}.`,
    });

    setMessage("Role updated.");
    setBusyId(null);
    await loadProfiles();
  }

  async function updateVerificationTier(
    profile: Profile,
    verificationTier: VerificationTier,
  ) {
    if (!supabase || profile.verification_tier === verificationTier) {
      return;
    }

    setBusyId(profile.id);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ verification_tier: verificationTier })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      setBusyId(null);
      return;
    }

    await supabase.from("audit_logs").insert({
      action: "profile.verification_updated",
      actor_id: userId,
      entity_id: profile.id,
      entity_type: "profile",
      summary: `Set ${profile.full_name ?? "member"} to ${getVerificationTierLabel(
        verificationTier,
      )}.`,
    });

    setMessage("Verification tier updated.");
    setBusyId(null);
    await loadProfiles();
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
            Super Admins can invite a new person or upgrade an existing account
            by email. This keeps owner access inside Travel Xchange instead of
            requiring SQL.
          </p>
        </div>

        {viewerProfile.role === "super_admin" ? (
          <form
            className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_260px_auto] xl:items-end"
            onSubmit={handleCreateOrPromoteUser}
          >
            <TextField
              label="Email"
              name="new-user-email"
              onChange={(event) => setNewUserEmail(event.target.value)}
              placeholder="accounts@onetravelclub.co.uk"
              required
              type="email"
              value={newUserEmail}
            />
            <TextField
              label="Full name"
              name="new-user-full-name"
              onChange={(event) => setNewUserFullName(event.target.value)}
              placeholder="One Travel Club Accounts"
              value={newUserFullName}
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
            <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_220px_260px]" key={profile.id}>
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
                disabled={busyId === profile.id}
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
                disabled={busyId === profile.id}
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
