"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Loader2,
  Lock,
  MessageSquareWarning,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  supplierPagePermissions,
  supplierPageSections,
} from "@/lib/suppliers/access-control";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type {
  SupplierPageContentSubmission,
  SupplierPagePermissionKey,
  SupplierPageSectionKey,
  SupplierPageSectionSetting,
} from "@/types/database";

type SupplierRoleManagerProps = {
  companyId: string;
};

type SupplierRoleManagerRole = {
  description: string | null;
  id: string;
  is_system: boolean;
  name: string;
  permissions: Partial<Record<SupplierPagePermissionKey, boolean>>;
  role_key: string;
  role_type: "baseline" | "custom";
};

type SupplierRoleManagerResponse = {
  error?: string;
  roles?: SupplierRoleManagerRole[];
};

type SupplierSectionResponse = {
  error?: string;
  sections?: SupplierPageSectionSetting[];
};

type SupplierSubmissionResponse = {
  error?: string;
  submissions?: SupplierPageContentSubmission[];
};

const editablePermissions = supplierPagePermissions.filter(
  (permission) => permission.key !== "manage_roles",
);

export function SupplierRoleManager({ companyId }: SupplierRoleManagerProps) {
  const configured = isSupabaseConfigured();
  const [roles, setRoles] = useState<SupplierRoleManagerRole[]>([]);
  const [sections, setSections] = useState<SupplierPageSectionSetting[]>([]);
  const [submissions, setSubmissions] = useState<
    SupplierPageContentSubmission[]
  >([]);
  const [canManage, setCanManage] = useState(false);
  const [isLoading, setIsLoading] = useState(configured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase?.auth.getSession() ?? {
      data: { session: null },
    };

    return data.session?.access_token ?? null;
  }, [supabase]);

  const loadRoles = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const token = await getAccessToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    const response = await fetch(`/api/supplier-pages/${companyId}/roles`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = (await response.json().catch(() => ({}))) as
      SupplierRoleManagerResponse;

    if (response.status === 403 || response.status === 404) {
      setCanManage(false);
      setIsLoading(false);
      return;
    }

    if (!response.ok) {
      setError(payload.error ?? "Supplier role settings could not be loaded.");
      setCanManage(false);
      setIsLoading(false);
      return;
    }

    const [sectionsResponse, submissionsResponse] = await Promise.all([
      fetch(`/api/supplier-pages/${companyId}/sections`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetch(`/api/supplier-pages/${companyId}/submissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);
    const sectionPayload = (await sectionsResponse.json().catch(() => ({}))) as
      SupplierSectionResponse;
    const submissionPayload = (await submissionsResponse
      .json()
      .catch(() => ({}))) as SupplierSubmissionResponse;

    if (!sectionsResponse.ok) {
      setError(
        sectionPayload.error ??
          "Supplier section visibility settings could not be loaded.",
      );
    } else {
      setSections(sectionPayload.sections ?? []);
    }

    if (submissionsResponse.ok) {
      setSubmissions(submissionPayload.submissions ?? []);
    }

    setRoles(payload.roles ?? []);
    setCanManage(true);
    setIsLoading(false);
  }, [companyId, getAccessToken, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRoles();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRoles]);

  async function sendRoleRequest(
    url: string,
    options: RequestInit,
    successMessage: string,
  ) {
    const token = await getAccessToken();

    if (!token) {
      setError("Please log in again before managing supplier roles.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsSaving(true);

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    });
    const payload = (await response.json().catch(() => ({}))) as
      SupplierRoleManagerResponse;

    setIsSaving(false);

    if (!response.ok) {
      setError(payload.error ?? "Supplier role settings could not be saved.");
      return;
    }

    setRoles(payload.roles ?? []);
    setMessage(successMessage);
  }

  async function handleSaveSections() {
    const token = await getAccessToken();

    if (!token) {
      setError("Please log in again before managing supplier sections.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsSaving(true);

    const response = await fetch(`/api/supplier-pages/${companyId}/sections`, {
      body: JSON.stringify({
        sections: sections.map((section) => ({
          sectionKey: section.section_key,
          visibility: section.visibility,
        })),
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      method: "PATCH",
    });
    const payload = (await response.json().catch(() => ({}))) as
      SupplierSectionResponse;

    setIsSaving(false);

    if (!response.ok) {
      setError(
        payload.error ?? "Supplier section visibility could not be saved.",
      );
      return;
    }

    setSections(payload.sections ?? []);
    setMessage("Supplier section visibility saved.");
  }

  async function handleReviewSubmission(
    submissionId: string,
    decision: "approved" | "rejected",
  ) {
    const token = await getAccessToken();

    if (!token) {
      setError("Please log in again before reviewing supplier content.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsSaving(true);

    const response = await fetch(
      `/api/supplier-pages/${companyId}/submissions/${submissionId}`,
      {
        body: JSON.stringify({ decision }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        method: "PATCH",
      },
    );
    const payload = (await response.json().catch(() => ({}))) as
      SupplierSubmissionResponse;

    setIsSaving(false);

    if (!response.ok) {
      setError(payload.error ?? "Supplier content could not be reviewed.");
      return;
    }

    setSubmissions(payload.submissions ?? []);
    setMessage(
      decision === "approved"
        ? "Supplier content approved."
        : "Supplier content rejected.",
    );
  }

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await sendRoleRequest(
      `/api/supplier-pages/${companyId}/roles`,
      {
        body: JSON.stringify({
          description: newRoleDescription,
          name: newRoleName,
          permissions: {},
        }),
        method: "POST",
      },
      "Custom role created.",
    );

    setNewRoleName("");
    setNewRoleDescription("");
  }

  async function handleSaveRole(role: SupplierRoleManagerRole) {
    await sendRoleRequest(
      `/api/supplier-pages/${companyId}/roles/${role.id}`,
      {
        body: JSON.stringify({
          description: role.description,
          name: role.name,
          permissions: role.permissions,
        }),
        method: "PATCH",
      },
      "Role permissions saved.",
    );
  }

  async function handleDeleteRole(role: SupplierRoleManagerRole) {
    await sendRoleRequest(
      `/api/supplier-pages/${companyId}/roles/${role.id}`,
      {
        body: "{}",
        method: "DELETE",
      },
      "Custom role deleted.",
    );
  }

  function updateRole(roleId: string, nextRole: Partial<SupplierRoleManagerRole>) {
    setRoles((currentRoles) =>
      currentRoles.map((role) =>
        role.id === roleId ? { ...role, ...nextRole } : role,
      ),
    );
  }

  function updatePermission(
    role: SupplierRoleManagerRole,
    permissionKey: SupplierPagePermissionKey,
    isAllowed: boolean,
  ) {
    updateRole(role.id, {
      permissions: {
        ...role.permissions,
        [permissionKey]: isAllowed,
      },
    });
  }

  function updateSectionVisibility(
    sectionKey: SupplierPageSectionKey,
    visibility: SupplierPageSectionSetting["visibility"],
  ) {
    setSections((currentSections) =>
      currentSections.map((section) =>
        section.section_key === sectionKey
          ? { ...section, visibility }
          : section,
      ),
    );
  }

  function getSectionLabel(sectionKey: SupplierPageSectionKey) {
    return (
      supplierPageSections.find((section) => section.key === sectionKey)?.label ??
      sectionKey
    );
  }

  if (!configured || (!isLoading && !canManage)) {
    return null;
  }

  return (
    <article className="rounded-xl border border-[#c8d7ee] bg-white/95 p-5 shadow-[0_14px_45px_rgba(6,27,79,0.08)]">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#061b4f] text-white">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#061b4f]">
            Supplier role controls
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#4d6b9e]">
            Create custom roles and decide which page sections each role can
            manage.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#dbe7f7] bg-[#f7faff] p-3 text-sm text-[#4d6b9e]">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading supplier role controls...
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <form
        className="mt-5 rounded-lg border border-[#dbe7f7] bg-[#f7faff] p-4"
        onSubmit={handleCreateRole}
      >
        <h3 className="font-bold text-[#061b4f]">Create custom role</h3>
        <div className="mt-3 grid gap-3">
          <input
            className="h-11 rounded-lg border border-[#b8cae8] px-3 text-sm text-[#061b4f] outline-none focus:border-[#063b86] focus:ring-3 focus:ring-[#063b86]/15"
            onChange={(event) => setNewRoleName(event.target.value)}
            placeholder="Example: Cruise campaign manager"
            required
            value={newRoleName}
          />
          <textarea
            className="min-h-20 rounded-lg border border-[#b8cae8] px-3 py-3 text-sm text-[#061b4f] outline-none focus:border-[#063b86] focus:ring-3 focus:ring-[#063b86]/15"
            onChange={(event) => setNewRoleDescription(event.target.value)}
            placeholder="Optional short description"
            value={newRoleDescription}
          />
          <Button
            className="w-fit bg-[#061b4f] text-white hover:bg-[#123b7a]"
            disabled={isSaving}
            type="submit"
          >
            <Plus className="size-4" aria-hidden="true" />
            Create role
          </Button>
        </div>
      </form>

      <section className="mt-5 rounded-lg border border-[#dbe7f7] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-[#061b4f]">Section visibility</h3>
            <p className="mt-1 text-sm leading-5 text-[#4d6b9e]">
              Choose which supplier sections agents can see before they are
              approved or joined.
            </p>
          </div>
          <Button
            className="w-fit bg-[#061b4f] text-white hover:bg-[#123b7a]"
            disabled={isSaving || sections.length === 0}
            onClick={() => void handleSaveSections()}
            type="button"
          >
            <Save className="size-4" aria-hidden="true" />
            Save visibility
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {supplierPageSections.map((section) => {
            const currentSetting = sections.find(
              (setting) => setting.section_key === section.key,
            );
            const visibility = currentSetting?.visibility ?? "public";

            return (
              <label
                className="rounded-lg border border-[#edf3fb] bg-[#f8fbff] p-3 text-sm"
                key={section.key}
              >
                <span className="flex items-center gap-2 font-bold text-[#061b4f]">
                  {visibility === "public" ? (
                    <Eye className="size-4 text-[#0f766e]" aria-hidden="true" />
                  ) : (
                    <Lock className="size-4 text-[#f72f6b]" aria-hidden="true" />
                  )}
                  {section.label}
                </span>
                <select
                  className="mt-3 h-10 w-full rounded-lg border border-[#b8cae8] bg-white px-3 text-sm text-[#061b4f] outline-none focus:border-[#063b86] focus:ring-3 focus:ring-[#063b86]/15"
                  onChange={(event) =>
                    updateSectionVisibility(
                      section.key,
                      event.target.value as SupplierPageSectionSetting["visibility"],
                    )
                  }
                  value={visibility}
                >
                  <option value="public">Public to agents</option>
                  <option value="private">Private to approved users</option>
                </select>
              </label>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-[#dbe7f7] bg-white p-4">
        <div className="flex items-start gap-3">
          <MessageSquareWarning
            className="mt-1 size-5 text-[#f72f6b]"
            aria-hidden="true"
          />
          <div>
            <h3 className="font-bold text-[#061b4f]">Approval queue</h3>
            <p className="mt-1 text-sm leading-5 text-[#4d6b9e]">
              Agent-created supplier content stays hidden here until approved.
            </p>
          </div>
        </div>

        {submissions.length === 0 ? (
          <p className="mt-4 rounded-lg border border-[#edf3fb] bg-[#f8fbff] p-3 text-sm text-[#4d6b9e]">
            No supplier content is waiting for review.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {submissions.map((submission) => (
              <div
                className="rounded-lg border border-[#edf3fb] bg-[#f8fbff] p-3"
                key={submission.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-[#4d6b9e]">
                      {getSectionLabel(submission.section_key)}
                    </p>
                    <h4 className="mt-1 font-bold text-[#061b4f]">
                      {submission.title}
                    </h4>
                    <p className="mt-2 text-sm leading-5 text-[#4d6b9e]">
                      {submission.content}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      className="bg-[#0f766e] text-white hover:bg-[#115e59]"
                      disabled={isSaving}
                      onClick={() =>
                        void handleReviewSubmission(submission.id, "approved")
                      }
                      type="button"
                    >
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Approve
                    </Button>
                    <Button
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      disabled={isSaving}
                      onClick={() =>
                        void handleReviewSubmission(submission.id, "rejected")
                      }
                      type="button"
                      variant="outline"
                    >
                      <XCircle className="size-4" aria-hidden="true" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-5 space-y-4">
        {roles.map((role) => {
          const isPageAdmin = role.role_key === "page_admin";
          const isCustom = role.role_type === "custom";

          return (
            <section
              className="rounded-lg border border-[#dbe7f7] bg-white p-4"
              key={role.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  {isCustom ? (
                    <input
                      className="h-10 w-full rounded-lg border border-[#b8cae8] px-3 text-sm font-bold text-[#061b4f] outline-none focus:border-[#063b86] focus:ring-3 focus:ring-[#063b86]/15"
                      onChange={(event) =>
                        updateRole(role.id, { name: event.target.value })
                      }
                      value={role.name}
                    />
                  ) : (
                    <h3 className="font-bold text-[#061b4f]">{role.name}</h3>
                  )}
                  {isCustom ? (
                    <textarea
                      className="mt-2 min-h-16 w-full rounded-lg border border-[#b8cae8] px-3 py-2 text-sm text-[#061b4f] outline-none focus:border-[#063b86] focus:ring-3 focus:ring-[#063b86]/15"
                      onChange={(event) =>
                        updateRole(role.id, {
                          description: event.target.value,
                        })
                      }
                      placeholder="Role description"
                      value={role.description ?? ""}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-[#4d6b9e]">
                      {isPageAdmin
                        ? "Full control. This cannot be reduced."
                        : "Baseline role. The page admin can choose its permissions."}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isPageAdmin ? (
                    <Button
                      className="bg-[#061b4f] text-white hover:bg-[#123b7a]"
                      disabled={isSaving}
                      onClick={() => void handleSaveRole(role)}
                      type="button"
                    >
                      <Save className="size-4" aria-hidden="true" />
                      Save
                    </Button>
                  ) : null}
                  {isCustom ? (
                    <Button
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      disabled={isSaving}
                      onClick={() => void handleDeleteRole(role)}
                      type="button"
                      variant="outline"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {editablePermissions.map((permission) => (
                  <label
                    className="flex items-start gap-3 rounded-lg border border-[#edf3fb] bg-[#f8fbff] p-3 text-sm"
                    key={permission.key}
                  >
                    <input
                      checked={
                        isPageAdmin || role.permissions?.[permission.key] === true
                      }
                      className="mt-1 size-4 accent-[#f72f6b]"
                      disabled={isPageAdmin}
                      onChange={(event) =>
                        updatePermission(
                          role,
                          permission.key,
                          event.target.checked,
                        )
                      }
                      type="checkbox"
                    />
                    <span>
                      <span className="block font-bold text-[#061b4f]">
                        {permission.label}
                      </span>
                      <span className="mt-1 block leading-5 text-[#4d6b9e]">
                        {permission.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}
