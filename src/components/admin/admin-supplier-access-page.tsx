"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  ShieldCheck,
  UserMinus,
  UserPlus,
  XCircle,
} from "lucide-react";

import {
  AdminEmptyState,
  AdminStatusBadge,
  getStatusTone,
} from "@/components/admin/admin-ui";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { getCompanyTypeLabel, getRoleLabel } from "@/config/roles";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type {
  Company,
  Profile,
  SupplierPageAccessRequest,
} from "@/types/database";

type SupplierAccessRequestWithProfile = SupplierPageAccessRequest & {
  profile: Pick<Profile, "id" | "full_name" | "headline" | "role"> | null;
};

type ApprovedSupplierAgent = {
  memberId: string;
  profile: Pick<Profile, "id" | "full_name" | "headline" | "role"> | null;
  userId: string;
};

type SupplierAccessResponse = {
  approvedAgents?: ApprovedSupplierAgent[];
  canManage?: boolean;
  error?: string;
  message?: string;
  requests?: SupplierAccessRequestWithProfile[];
};

type AdminAccessActionResponse = {
  error?: string;
  message?: string;
};

type SupplierOption = Pick<
  Company,
  "id" | "name" | "company_type" | "status" | "verification_tier"
>;

type AgentOption = Pick<
  Profile,
  "id" | "full_name" | "headline" | "role" | "verification_tier"
>;

export function AdminSupplierAccessPage() {
  return (
    <AdminPageShell
      activeHref="/admin/supplier-access"
      description="Manually add agents to supplier pages, review access requests, and remove private supplier access when needed."
      title="Supplier access"
    >
      {() => <AdminSupplierAccessContent />}
    </AdminPageShell>
  );
}

function AdminSupplierAccessContent() {
  const configured = isSupabaseConfigured();
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingRequests, setPendingRequests] = useState<
    SupplierAccessRequestWithProfile[]
  >([]);
  const [approvedAgents, setApprovedAgents] = useState<ApprovedSupplierAgent[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(configured);
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const selectedSupplier = suppliers.find(
    (supplier) => supplier.id === selectedCompanyId,
  );
  const selectedAgent = agents.find((agent) => agent.id === selectedUserId);

  const filteredAgents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return agents
      .filter((agent) => {
        if (!term) {
          return true;
        }

        return [
          agent.full_name,
          agent.headline,
          getRoleLabel(agent.role),
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(term));
      })
      .slice(0, 40);
  }, [agents, searchTerm]);

  const loadBaseData = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const [supplierResult, profileResult] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name, company_type, status, verification_tier")
        .order("name", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name, headline, role, verification_tier")
        .order("full_name", { ascending: true })
        .limit(250),
    ]);

    if (supplierResult.error || profileResult.error) {
      setError(
        supplierResult.error?.message ??
          profileResult.error?.message ??
          "Supplier access data could not be loaded.",
      );
      setIsLoading(false);
      return;
    }

    const supplierData = (supplierResult.data ?? []) as SupplierOption[];

    setSuppliers(supplierData);
    setAgents((profileResult.data ?? []) as AgentOption[]);
    setSelectedCompanyId((current) => current || supplierData[0]?.id || "");
    setError(null);
    setIsLoading(false);
  }, [supabase]);

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase?.auth.getSession() ?? {
      data: { session: null },
    };

    return data.session?.access_token ?? null;
  }, [supabase]);

  const loadSupplierAccess = useCallback(async () => {
    if (!selectedCompanyId) {
      setPendingRequests([]);
      setApprovedAgents([]);
      return;
    }

    const token = await getAccessToken();

    if (!token) {
      return;
    }

    setIsAccessLoading(true);

    const response = await fetch(
      `/api/supplier-pages/${selectedCompanyId}/access-requests`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const payload = (await response.json().catch(() => ({}))) as
      SupplierAccessResponse;

    setIsAccessLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Supplier access could not be loaded.");
      return;
    }

    setPendingRequests(payload.requests ?? []);
    setApprovedAgents(payload.approvedAgents ?? []);
  }, [getAccessToken, selectedCompanyId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBaseData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBaseData]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSupplierAccess();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSupplierAccess]);

  async function sendAdminAccessAction(
    method: "POST" | "DELETE",
    userId: string,
    successMessage: string,
  ) {
    if (!selectedCompanyId || !userId) {
      setError("Choose a supplier page and an agent first.");
      return;
    }

    const token = await getAccessToken();

    if (!token) {
      setError("Please log in again before changing supplier access.");
      return;
    }

    setBusyId(userId);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/supplier-access", {
      body: JSON.stringify({
        companyId: selectedCompanyId,
        userId,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      method,
    });
    const payload = (await response.json().catch(() => ({}))) as
      AdminAccessActionResponse;

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Supplier access could not be changed.");
      return;
    }

    setMessage(payload.message ?? successMessage);
    setSelectedUserId("");
    await loadSupplierAccess();
  }

  async function reviewPendingRequest(
    requestId: string,
    decision: "approved" | "rejected",
  ) {
    const token = await getAccessToken();

    if (!token || !selectedCompanyId) {
      setError("Please log in again before reviewing supplier access.");
      return;
    }

    setBusyId(requestId);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/supplier-pages/${selectedCompanyId}/access-requests/${requestId}`,
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
      AdminAccessActionResponse;

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Supplier access request could not be reviewed.");
      return;
    }

    setMessage(
      payload.message ??
        (decision === "approved"
          ? "Agent access approved."
          : "Agent access rejected."),
    );
    await loadSupplierAccess();
  }

  if (isLoading) {
    return (
      <div className="tx-card p-6 text-sm text-[#4d6b9e]">
        Loading supplier access controls...
      </div>
    );
  }

  if (suppliers.length === 0 && !error) {
    return (
      <AdminEmptyState title="No supplier pages yet">
        Supplier pages will appear here once companies have been created.
      </AdminEmptyState>
    );
  }

  return (
    <div className="space-y-5">
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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SelectField
            label="Supplier page"
            name="supplier-page"
            onChange={(event) => {
              setSelectedCompanyId(event.target.value);
              setSelectedUserId("");
              setMessage(null);
              setError(null);
            }}
            options={suppliers.map((supplier) => ({
              label: `${supplier.name} (${getCompanyTypeLabel(
                supplier.company_type,
              )})`,
              value: supplier.id,
            }))}
            value={selectedCompanyId}
          />

          <div className="rounded-lg border border-[#d9e4f5] bg-[#f7faff] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-[#061b4f]">
                  {selectedSupplier?.name ?? "Choose a supplier"}
                </p>
                {selectedSupplier ? (
                  <p className="mt-1 text-xs font-medium text-[#4d6b9e]">
                    {getCompanyTypeLabel(selectedSupplier.company_type)}
                  </p>
                ) : null}
              </div>
              {selectedSupplier ? (
                <Link
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#063b86] hover:text-[#f52968]"
                  href={`/suppliers/${selectedSupplier.id}`}
                >
                  Open supplier page
                  <ExternalLink className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="tx-card overflow-hidden">
          <div className="border-b border-[#d9e4f5] p-5">
            <div className="flex items-center gap-2">
              <UserPlus className="size-5 text-[#063b86]" aria-hidden="true" />
              <h2 className="text-lg font-extrabold text-[#061b4f]">
                Add an agent manually
              </h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-[#4d6b9e]">
              Use this when you want to grant supplier page access without
              waiting for the agent to request it.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <TextField
              label="Search members"
              name="member-search"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, role, or headline"
              value={searchTerm}
            />

            <div className="max-h-[420px] overflow-y-auto rounded-lg border border-[#d9e4f5]">
              {filteredAgents.length === 0 ? (
                <div className="p-5 text-sm text-[#4d6b9e]">
                  No matching members found.
                </div>
              ) : (
                <div className="divide-y divide-[#d9e4f5]">
                  {filteredAgents.map((agent) => {
                    const isSelected = selectedUserId === agent.id;
                    const isApproved = approvedAgents.some(
                      (approvedAgent) => approvedAgent.userId === agent.id,
                    );

                    return (
                      <button
                        className={`block w-full p-4 text-left transition ${
                          isSelected
                            ? "bg-[#eef5ff]"
                            : "bg-white hover:bg-[#f7faff]"
                        }`}
                        key={agent.id}
                        onClick={() => setSelectedUserId(agent.id)}
                        type="button"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-extrabold text-[#061b4f]">
                            {agent.full_name ?? "Unnamed member"}
                          </p>
                          <AdminStatusBadge
                            tone={isApproved ? "green" : getStatusTone(agent.role)}
                          >
                            {isApproved ? "Approved" : getRoleLabel(agent.role)}
                          </AdminStatusBadge>
                        </div>
                        <p className="mt-1 text-sm leading-5 text-[#4d6b9e]">
                          {agent.headline ?? "No headline yet"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[#d9e4f5] bg-[#f7faff] p-4">
              <p className="text-sm font-bold text-[#061b4f]">
                Selected agent
              </p>
              <p className="mt-1 text-sm text-[#4d6b9e]">
                {selectedAgent?.full_name ?? "Choose a member from the list."}
              </p>
              <Button
                className="mt-4 bg-[#061b4f] text-white hover:bg-[#123b7a]"
                disabled={!selectedCompanyId || !selectedUserId || Boolean(busyId)}
                onClick={() =>
                  void sendAdminAccessAction(
                    "POST",
                    selectedUserId,
                    "Agent added to supplier access.",
                  )
                }
                type="button"
              >
                {busyId === selectedUserId ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <UserPlus className="size-4" aria-hidden="true" />
                )}
                Add agent
              </Button>
            </div>
          </div>
        </article>

        <aside className="space-y-5">
          <article className="tx-card overflow-hidden">
            <div className="border-b border-[#d9e4f5] p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-[#063b86]" aria-hidden="true" />
                <h2 className="text-lg font-extrabold text-[#061b4f]">
                  Pending requests
                </h2>
              </div>
            </div>

            {isAccessLoading ? (
              <div className="flex items-center gap-2 p-5 text-sm text-[#4d6b9e]">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading requests...
              </div>
            ) : pendingRequests.length === 0 ? (
              <p className="p-5 text-sm leading-6 text-[#4d6b9e]">
                No agents are waiting for this supplier page.
              </p>
            ) : (
              <div className="divide-y divide-[#d9e4f5]">
                {pendingRequests.map((request) => (
                  <div className="space-y-3 p-5" key={request.id}>
                    <div>
                      <p className="font-extrabold text-[#061b4f]">
                        {request.profile?.full_name ?? "Travel Xchange member"}
                      </p>
                      <p className="mt-1 text-xs text-[#4d6b9e]">
                        {request.profile
                          ? getRoleLabel(request.profile.role)
                          : "No profile details"}
                      </p>
                    </div>
                    {request.message ? (
                      <p className="rounded-lg bg-[#f7faff] p-3 text-sm leading-5 text-[#4d6b9e]">
                        {request.message}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="bg-[#0f766e] text-white hover:bg-[#115e59]"
                        disabled={Boolean(busyId)}
                        onClick={() =>
                          void reviewPendingRequest(request.id, "approved")
                        }
                        type="button"
                      >
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        Approve
                      </Button>
                      <Button
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        disabled={Boolean(busyId)}
                        onClick={() =>
                          void reviewPendingRequest(request.id, "rejected")
                        }
                        type="button"
                        variant="outline"
                      >
                        <XCircle className="size-4" aria-hidden="true" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="tx-card overflow-hidden">
            <div className="border-b border-[#d9e4f5] p-5">
              <div className="flex items-center gap-2">
                <Search className="size-5 text-[#063b86]" aria-hidden="true" />
                <h2 className="text-lg font-extrabold text-[#061b4f]">
                  Approved agents
                </h2>
              </div>
            </div>

            {approvedAgents.length === 0 ? (
              <p className="p-5 text-sm leading-6 text-[#4d6b9e]">
                Approved agents will appear here.
              </p>
            ) : (
              <div className="divide-y divide-[#d9e4f5]">
                {approvedAgents.map((agent) => (
                  <div
                    className="flex items-start justify-between gap-3 p-5"
                    key={agent.memberId}
                  >
                    <div>
                      <p className="font-extrabold text-[#061b4f]">
                        {agent.profile?.full_name ?? "Travel Xchange member"}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-[#4d6b9e]">
                        {agent.profile?.headline ?? "Approved private access"}
                      </p>
                    </div>
                    <Button
                      className="shrink-0 border-red-200 text-red-700 hover:bg-red-50"
                      disabled={Boolean(busyId)}
                      onClick={() =>
                        void sendAdminAccessAction(
                          "DELETE",
                          agent.userId,
                          "Agent access removed.",
                        )
                      }
                      type="button"
                      variant="outline"
                    >
                      <UserMinus className="size-4" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}
