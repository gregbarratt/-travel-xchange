import { NextRequest, NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createSupplierPageAccessRequestDraft } from "@/lib/suppliers/access-control";
import {
  canManageSupplierPageRoles,
  getSupplierPageAccessRequestForUser,
  getSupplierPageViewerContext,
  listApprovedSupplierPageAgents,
  listPendingSupplierPageAccessRequests,
  listSupplierAccessProfiles,
  listSupplierPageReviewerIds,
  supplierAgentAccessTableNames,
} from "@/lib/suppliers/server";
import type {
  Profile,
  SupplierPageAccessRequest,
} from "@/types/database";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

type AccessRequestBody = {
  message?: string | null;
};

type AccessRequestWithProfile = SupplierPageAccessRequest & {
  profile: Pick<Profile, "id" | "full_name" | "headline" | "role"> | null;
};

const missingPhaseMessage =
  "The supplier access request table is not installed yet. Run supabase/phase-25-supplier-agent-access.sql in Supabase, then refresh this page.";

export async function GET(request: NextRequest, context: RouteContext) {
  const result = await authorizeAccessRequestUser(request, context);

  if ("response" in result) {
    return result.response;
  }

  const { companyId, supabase, user } = result;
  const [viewerContext, managerAccess, currentRequest] = await Promise.all([
    getSupplierPageViewerContext(supabase, companyId, user),
    canManageSupplierPageRoles(supabase, companyId, user),
    getSupplierPageAccessRequestForUser(supabase, companyId, user.id),
  ]);

  if (currentRequest.error) {
    return NextResponse.json(
      {
        error: isMissingTableError(
          currentRequest.error,
          supplierAgentAccessTableNames,
        )
          ? missingPhaseMessage
          : currentRequest.error.message,
      },
      { status: 500 },
    );
  }

  let pendingRequests: AccessRequestWithProfile[] = [];
  let approvedAgents: {
    memberId: string;
    profile: Pick<Profile, "id" | "full_name" | "headline" | "role"> | null;
    userId: string;
  }[] = [];

  if (managerAccess.canManage) {
    const [pendingResult, approvedResult] = await Promise.all([
      listPendingSupplierPageAccessRequests(supabase, companyId),
      listApprovedSupplierPageAgents(supabase, companyId),
    ]);

    if (pendingResult.error || approvedResult.error) {
      return NextResponse.json(
        {
          error:
            pendingResult.error?.message ??
            approvedResult.error?.message ??
            "Supplier access requests could not be loaded.",
        },
        { status: 500 },
      );
    }

    const profiles = await listSupplierAccessProfiles(
      supabase,
      [
        ...pendingResult.requests.map((accessRequest) => accessRequest.user_id),
        ...approvedResult.members.map((member) => member.user_id),
      ],
    );
    const profileMap = new Map(
      profiles.map((profile) => [profile.id, profile]),
    );

    pendingRequests = pendingResult.requests.map((accessRequest) => ({
      ...accessRequest,
      profile: profileMap.get(accessRequest.user_id) ?? null,
    }));
    approvedAgents = approvedResult.members.map((member) => ({
      memberId: member.id,
      profile: profileMap.get(member.user_id) ?? null,
      userId: member.user_id,
    }));
  }

  return NextResponse.json({
    approvedAgents,
    canManage: managerAccess.canManage,
    request: currentRequest.request,
    requests: pendingRequests,
    viewer: viewerContext.viewer,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const result = await authorizeAccessRequestUser(request, context);

  if ("response" in result) {
    return result.response;
  }

  const { companyId, supabase, user } = result;
  const body = (await request.json().catch(() => null)) as
    | AccessRequestBody
    | null;
  const viewerContext = await getSupplierPageViewerContext(
    supabase,
    companyId,
    user,
  );

  if (!viewerContext.company) {
    return NextResponse.json(
      { error: "Supplier page not found." },
      { status: 404 },
    );
  }

  let requestDraft;

  try {
    requestDraft = createSupplierPageAccessRequestDraft({
      companyId,
      message: body?.message ?? null,
      userId: user.id,
      viewer: viewerContext.viewer,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The access request could not be sent.",
      },
      { status: 400 },
    );
  }

  const { data: accessRequest, error } = await supabase
    .from("supplier_page_access_requests")
    .upsert(
      {
        admin_notes: null,
        company_id: requestDraft.companyId,
        message: requestDraft.message,
        reviewed_at: null,
        reviewed_by: null,
        status: requestDraft.status,
        user_id: requestDraft.userId,
      },
      { onConflict: "company_id,user_id" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: isMissingTableError(error, supplierAgentAccessTableNames)
          ? missingPhaseMessage
          : error.message,
      },
      { status: 500 },
    );
  }

  await notifySupplierAccessReviewers(supabase, companyId, user.id);

  return NextResponse.json({
    message: "Access request sent to the supplier page admin.",
    request: accessRequest,
  });
}

async function authorizeAccessRequestUser(
  request: NextRequest,
  context: RouteContext,
) {
  if (!isSupabaseServerConfigured()) {
    return {
      response: NextResponse.json(
        {
          error:
            "Supabase server settings are missing. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
        },
        { status: 500 },
      ),
    };
  }

  const { error: authError, user } = await getAuthenticatedUser(request);

  if (authError || !user) {
    return {
      response: NextResponse.json({ error: authError }, { status: 401 }),
    };
  }

  const { companyId } = await context.params;
  const supabase = createSupabaseAdminClient();

  return { companyId, supabase, user };
}

async function notifySupplierAccessReviewers(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  companyId: string,
  actorId: string,
) {
  const reviewerIds = await listSupplierPageReviewerIds(supabase, companyId);

  if (reviewerIds.length === 0) {
    return;
  }

  await supabase.from("notifications").insert(
    reviewerIds.map((reviewerId) => ({
      actor_id: actorId,
      body: "An agent has asked to access private supplier page sections.",
      href: `/suppliers/${companyId}`,
      title: "Supplier access request",
      type: "system" as const,
      user_id: reviewerId,
    })),
  );
}
