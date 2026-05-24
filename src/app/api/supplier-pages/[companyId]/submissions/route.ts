import { NextRequest, NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createSupplierPageSubmissionDraft } from "@/lib/suppliers/access-control";
import {
  canManageSupplierPageRoles,
  getSupplierPageSectionVisibility,
  getSupplierPageViewerContext,
  isSupplierPageSectionKey,
  listPendingSupplierPageSubmissions,
  listSupplierPageReviewerIds,
  supplierVisibilityTableNames,
} from "@/lib/suppliers/server";
import type { SupplierPageContentSubmission } from "@/types/database";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

type SubmissionCreateBody = {
  content?: string;
  sectionKey?: string;
  title?: string;
};

const missingPhaseMessage =
  "The supplier content approval tables are not installed yet. Run supabase/phase-24-supplier-visibility-approval.sql in Supabase, then refresh this page.";

export async function GET(request: NextRequest, context: RouteContext) {
  const result = await authorizeSubmissionReviewer(request, context);

  if ("response" in result) {
    return result.response;
  }

  const { companyId, supabase } = result;
  const submissionsResult = await listPendingSupplierPageSubmissions(
    supabase,
    companyId,
  );

  if (submissionsResult.error) {
    return NextResponse.json(
      {
        error: isMissingTableError(
          submissionsResult.error,
          supplierVisibilityTableNames,
        )
          ? missingPhaseMessage
          : submissionsResult.error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ submissions: submissionsResult.submissions });
}

export async function POST(request: NextRequest, context: RouteContext) {
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

  const { companyId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | SubmissionCreateBody
    | null;
  const sectionKey = body?.sectionKey ?? "";

  if (!isSupplierPageSectionKey(sectionKey)) {
    return NextResponse.json(
      { error: "Choose a valid supplier page section." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
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

  const sectionVisibilityResult = await getSupplierPageSectionVisibility(
    supabase,
    companyId,
    sectionKey,
  );

  if (sectionVisibilityResult.error) {
    return NextResponse.json(
      {
        error: isMissingTableError(
          sectionVisibilityResult.error,
          supplierVisibilityTableNames,
        )
          ? missingPhaseMessage
          : sectionVisibilityResult.error.message,
      },
      { status: 500 },
    );
  }

  let submissionDraft;

  try {
    submissionDraft = createSupplierPageSubmissionDraft({
      actorAccess: viewerContext.access,
      content: body?.content ?? "",
      createdBy: user.id,
      sectionKey,
      sectionVisibility: sectionVisibilityResult.visibility ?? "public",
      title: body?.title ?? "",
      viewer: viewerContext.viewer,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The supplier content could not be submitted.",
      },
      { status: 400 },
    );
  }

  const { data: submission, error } = await supabase
    .from("supplier_page_content_submissions")
    .insert({
      company_id: companyId,
      content: submissionDraft.content,
      created_by: submissionDraft.createdBy,
      section_key: submissionDraft.sectionKey,
      status: submissionDraft.status,
      title: submissionDraft.title,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (submissionDraft.reviewerNotificationRequired) {
    await notifySupplierReviewers(
      supabase,
      companyId,
      submission as SupplierPageContentSubmission,
      user.id,
    );
  }

  return NextResponse.json({
    message:
      submissionDraft.status === "approved"
        ? "Supplier content published."
        : "Supplier content sent for approval.",
    submission,
  });
}

async function authorizeSubmissionReviewer(
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
  const access = await canManageSupplierPageRoles(supabase, companyId, user);

  if (!access.canManage) {
    return {
      response: NextResponse.json(
        { error: access.reason ?? "You cannot review this supplier content." },
        { status: access.reason === "Supplier page not found." ? 404 : 403 },
      ),
    };
  }

  return { companyId, supabase, user };
}

async function notifySupplierReviewers(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  companyId: string,
  submission: SupplierPageContentSubmission,
  actorId: string,
) {
  const reviewerIds = await listSupplierPageReviewerIds(supabase, companyId);

  if (reviewerIds.length === 0) {
    return;
  }

  await supabase.from("notifications").insert(
    reviewerIds.map((reviewerId) => ({
      actor_id: actorId,
      body: `${submission.title} is waiting for approval on a supplier page.`,
      href: `/suppliers/${companyId}`,
      title: "Supplier content needs review",
      type: "system" as const,
      user_id: reviewerId,
    })),
  );
}
