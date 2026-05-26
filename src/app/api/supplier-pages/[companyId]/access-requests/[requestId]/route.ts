import { NextRequest, NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { reviewSupplierPageAccessRequest } from "@/lib/suppliers/access-control";
import {
  canManageSupplierPageRoles,
  ensureApprovedAgentRole,
  getSupplierPageViewerContext,
} from "@/lib/suppliers/server";

type RouteContext = {
  params: Promise<{ companyId: string; requestId: string }>;
};

type AccessReviewBody = {
  decision?: "approved" | "rejected";
  adminNotes?: string | null;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      {
        error:
          "Supabase server settings are missing. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
      },
      { status: 500 },
    );
  }

  const { error: authError, user } = await getAuthenticatedUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const { companyId, requestId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | AccessReviewBody
    | null;

  if (body?.decision !== "approved" && body?.decision !== "rejected") {
    return NextResponse.json(
      { error: "Choose approve or reject before saving." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const access = await canManageSupplierPageRoles(supabase, companyId, user);

  if (!access.canManage) {
    return NextResponse.json(
      { error: access.reason ?? "You cannot review supplier access requests." },
      { status: access.reason === "Supplier page not found." ? 404 : 403 },
    );
  }

  const { data: accessRequest, error: requestError } = await supabase
    .from("supplier_page_access_requests")
    .select("*")
    .eq("id", requestId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 500 });
  }

  if (!accessRequest) {
    return NextResponse.json(
      { error: "Supplier access request not found." },
      { status: 404 },
    );
  }

  const viewerContext = await getSupplierPageViewerContext(
    supabase,
    companyId,
    user,
  );
  const reviewDraft = reviewSupplierPageAccessRequest(
    viewerContext.access,
    body.decision,
    viewerContext.viewer,
  );

  if (body.decision === "approved") {
    const roleResult = await ensureApprovedAgentRole(supabase, companyId);

    if (roleResult.error || !roleResult.role) {
      return NextResponse.json(
        {
          error:
            roleResult.error?.message ??
            "The approved agent role could not be prepared.",
        },
        { status: 500 },
      );
    }

    const { error: memberError } = await supabase
      .from("supplier_page_members")
      .upsert(
        {
          assigned_by: user.id,
          company_id: companyId,
          role_id: roleResult.role.id,
          status: "active",
          user_id: accessRequest.user_id,
        },
        { onConflict: "company_id,user_id,role_id" },
      );

    if (memberError) {
      return NextResponse.json(
        { error: memberError.message },
        { status: 500 },
      );
    }
  }

  const { data: reviewedRequest, error: reviewError } = await supabase
    .from("supplier_page_access_requests")
    .update({
      admin_notes: body.adminNotes ?? null,
      reviewed_at: reviewDraft.reviewedAt,
      reviewed_by: user.id,
      status: reviewDraft.status,
    })
    .eq("id", requestId)
    .eq("company_id", companyId)
    .select("*")
    .single();

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }

  await Promise.all([
    supabase.from("notifications").insert({
      actor_id: user.id,
      body:
        body.decision === "approved"
          ? "Your supplier page access request was approved."
          : "Your supplier page access request was not approved.",
      href: `/suppliers/${companyId}`,
      title:
        body.decision === "approved"
          ? "Supplier access approved"
          : "Supplier access request updated",
      type: "system" as const,
      user_id: accessRequest.user_id,
    }),
    supabase.from("audit_logs").insert({
      action: `supplier_access_${body.decision}`,
      actor_id: user.id,
      entity_id: requestId,
      entity_type: "supplier_page_access_request",
      metadata: {
        company_id: companyId,
        requested_user_id: accessRequest.user_id,
      },
      summary: `Supplier access request ${body.decision}.`,
    }),
  ]);

  return NextResponse.json({
    message:
      body.decision === "approved"
        ? "Agent access approved."
        : "Agent access rejected.",
    request: reviewedRequest,
  });
}
