"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supplierPagePermissions } from "@/lib/suppliers/access-control";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { SupplierPagePermissionKey } from "@/types/database";

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

const editablePermissions = supplierPagePermissions.filter(
  (permission) => permission.key !== "manage_roles",
);

export function SupplierRoleManager({ companyId }: SupplierRoleManagerProps) {
  const configured = isSupabaseConfigured();
  const [roles, setRoles] = useState<SupplierRoleManagerRole[]>([]);
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
