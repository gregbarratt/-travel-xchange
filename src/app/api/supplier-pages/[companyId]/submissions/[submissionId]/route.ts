import { NextRequest, NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { reviewSupplierPageSubmission } from "@/lib/suppliers/access-control";
import {
  canManageSupplierPageRoles,
  getSupplierPageViewerContext,
  listPendingSupplierPageSubmissions,
} from "@/lib/suppliers/server";

type RouteContext = {
  params: Promise<{ companyId: string; submissionId: string }>;
};

type SubmissionReviewBody = {
  decision?: "approved" | "rejected";
  rejectionReason?: string | null;
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

  const { companyId, submissionId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | SubmissionReviewBody
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
      { error: access.reason ?? "You cannot review this supplier content." },
      { status: access.reason === "Supplier page not found." ? 404 : 403 },
    );
  }

  const viewerContext = await getSupplierPageViewerContext(
    supabase,
    companyId,
    user,
  );
  const reviewDraft = reviewSupplierPageSubmission(
    viewerContext.access,
    body.decision,
    viewerContext.viewer,
  );

  const { data: submission, error } = await supabase
    .from("supplier_page_content_submissions")
    .update({
      rejection_reason:
        body.decision === "rejected" ? body.rejectionReason ?? null : null,
      reviewed_at: reviewDraft.reviewedAt,
      reviewed_by: user.id,
      status: reviewDraft.status,
    })
    .eq("id", submissionId)
    .eq("company_id", companyId)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!submission) {
    return NextResponse.json(
      { error: "Supplier content submission not found." },
      { status: 404 },
    );
  }

  await supabase.from("moderation_actions").insert({
    action: `supplier_content_${body.decision}`,
    metadata: {
      company_id: companyId,
      section_key: submission.section_key,
      submission_id: submission.id,
    },
    moderator_id: user.id,
    notes: body.rejectionReason ?? null,
    reason: null,
    target_id: submission.id,
    target_type: "supplier_page_content_submission",
  });

  const submissionsResult = await listPendingSupplierPageSubmissions(
    supabase,
    companyId,
  );

  return NextResponse.json({
    submission,
    submissions: submissionsResult.submissions,
  });
}
