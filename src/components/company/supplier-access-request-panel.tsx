"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type {
  Profile,
  SupplierPageAccessRequest,
} from "@/types/database";

type SupplierAccessRequestPanelProps = {
  companyId: string;
  hideManagerView?: boolean;
  managerOnly?: boolean;
};

type AccessRequestWithProfile = SupplierPageAccessRequest & {
  profile: Pick<Profile, "id" | "full_name" | "headline" | "role"> | null;
};

type ApprovedAgent = {
  memberId: string;
  profile: Pick<Profile, "id" | "full_name" | "headline" | "role"> | null;
  userId: string;
};

type AccessResponse = {
  approvedAgents?: ApprovedAgent[];
  canManage?: boolean;
  error?: string;
  message?: string;
  request?: SupplierPageAccessRequest | null;
  requests?: AccessRequestWithProfile[];
  viewer?: {
    isApprovedMember?: boolean;
    isPageAdmin?: boolean;
    isPlatformModerator?: boolean;
  };
};

export function SupplierAccessRequestPanel({
  companyId,
  hideManagerView = false,
  managerOnly = false,
}: SupplierAccessRequestPanelProps) {
  const configured = isSupabaseConfigured();
  const [canManage, setCanManage] = useState(false);
  const [request, setRequest] = useState<SupplierPageAccessRequest | null>(null);
  const [requests, setRequests] = useState<AccessRequestWithProfile[]>([]);
  const [approvedAgents, setApprovedAgents] = useState<ApprovedAgent[]>([]);
  const [viewerHasAccess, setViewerHasAccess] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(configured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const applyPayload = useCallback((payload: AccessResponse) => {
    setCanManage(payload.canManage === true);
    setRequest(payload.request ?? null);
    setRequests(payload.requests ?? []);
    setApprovedAgents(payload.approvedAgents ?? []);
    setViewerHasAccess(
      payload.viewer?.isApprovedMember === true ||
        payload.viewer?.isPageAdmin === true,
    );
  }, []);

  const loadAccessState = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const token = await getAccessToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    const response = await fetch(
      `/api/supplier-pages/${companyId}/access-requests`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const payload = (await response.json().catch(() => ({}))) as AccessResponse;

    if (!response.ok) {
      setError(payload.error ?? "Supplier access settings could not be loaded.");
      setIsLoading(false);
      return;
    }

    applyPayload(payload);
    setIsLoading(false);
  }, [applyPayload, companyId, getAccessToken, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAccessState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAccessState]);

  async function handleSubmitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = await getAccessToken();

    if (!token) {
      setError("Please log in before requesting supplier access.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSaving(true);

    const response = await fetch(
      `/api/supplier-pages/${companyId}/access-requests`,
      {
        body: JSON.stringify({ message: messageText }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        method: "POST",
      },
    );
    const payload = (await response.json().catch(() => ({}))) as AccessResponse;

    setIsSaving(false);

    if (!response.ok) {
      setError(payload.error ?? "Supplier access request could not be sent.");
      return;
    }

    setRequest(payload.request ?? null);
    setMessageText("");
    setNotice(payload.message ?? "Access request sent.");
  }

  async function handleReviewRequest(
    requestId: string,
    decision: "approved" | "rejected",
  ) {
    const token = await getAccessToken();

    if (!token) {
      setError("Please log in again before reviewing supplier access.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSaving(true);

    const response = await fetch(
      `/api/supplier-pages/${companyId}/access-requests/${requestId}`,
      {
        body: JSON.stringify({ decision }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        method: "PATCH",
      },
    );
    const payload = (await response.json().catch(() => ({}))) as AccessResponse;

    if (!response.ok) {
      setError(payload.error ?? "Supplier access request could not be reviewed.");
      setIsSaving(false);
      return;
    }

    await loadAccessState();
    setIsSaving(false);
    setNotice(
      decision === "approved" ? "Agent access approved." : "Agent access rejected.",
    );
  }

  const shouldShowManagerTools = canManage && !hideManagerView;
  const shouldShowAgentRequest = !canManage && !viewerHasAccess && !managerOnly;

  if (
    !configured ||
    (!isLoading && managerOnly && !canManage) ||
    (!isLoading && !shouldShowManagerTools && !shouldShowAgentRequest)
  ) {
    return null;
  }

  const currentRequestStatus = request?.status ?? null;

  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-[#e0f2f1] text-[#0f766e]">
          {canManage ? (
            <ShieldCheck className="size-5" aria-hidden="true" />
          ) : (
            <UserPlus className="size-5" aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            {canManage ? "Agent access requests" : "Private supplier access"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {canManage
              ? "Approve agents who should be able to see private supplier page sections."
              : "Ask the supplier page admin for access to private trade content."}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading supplier access...
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      {!isLoading && shouldShowManagerTools ? (
        <div className="mt-4 space-y-4">
          <section>
            <h3 className="text-sm font-bold uppercase tracking-normal text-slate-500">
              Pending requests
            </h3>
            {requests.length === 0 ? (
              <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                No agents are waiting for access.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {requests.map((accessRequest) => (
                  <div
                    className="rounded-md border border-slate-200 bg-slate-50 p-3"
                    key={accessRequest.id}
                  >
                    <p className="font-semibold text-slate-950">
                      {accessRequest.profile?.full_name ?? "Travel Xchange member"}
                    </p>
                    {accessRequest.profile?.headline ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {accessRequest.profile.headline}
                      </p>
                    ) : null}
                    {accessRequest.message ? (
                      <p className="mt-2 text-sm leading-5 text-slate-700">
                        {accessRequest.message}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="bg-[#0f766e] text-white hover:bg-[#115e59]"
                        disabled={isSaving}
                        onClick={() =>
                          void handleReviewRequest(accessRequest.id, "approved")
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
                          void handleReviewRequest(accessRequest.id, "rejected")
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
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-normal text-slate-500">
              Approved agents
            </h3>
            {approvedAgents.length === 0 ? (
              <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Approved agents will appear here.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {approvedAgents.map((agent) => (
                  <div
                    className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
                    key={agent.memberId}
                  >
                    <UserCheck
                      className="size-4 text-[#0f766e]"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {agent.profile?.full_name ?? "Travel Xchange member"}
                      </p>
                      {agent.profile?.headline ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {agent.profile.headline}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {!isLoading && shouldShowAgentRequest ? (
        <>
          {currentRequestStatus === "pending" ? (
            <div className="mt-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <Clock3 className="mt-0.5 size-4" aria-hidden="true" />
              Your access request is waiting for supplier admin approval.
            </div>
          ) : (
            <form className="mt-4 grid gap-3" onSubmit={handleSubmitRequest}>
              {currentRequestStatus === "rejected" ? (
                <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Your last request was not approved. You can send a new request
                  with more detail.
                </p>
              ) : null}
              <textarea
                className="min-h-24 rounded-md border border-slate-300 px-3 py-3 text-sm text-slate-950 outline-none focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
                maxLength={500}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Optional: tell the supplier why you need access."
                value={messageText}
              />
              <Button
                className="w-fit bg-[#0f766e] text-white hover:bg-[#115e59]"
                disabled={isSaving}
                type="submit"
              >
                <UserPlus className="size-4" aria-hidden="true" />
                Request access
              </Button>
            </form>
          )}
        </>
      ) : null}
    </article>
  );
}
