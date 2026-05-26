import { NextRequest, NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { ensureApprovedAgentRole, isPlatformAdmin } from "@/lib/suppliers/server";

type SupplierAccessBody = {
  companyId?: string;
  userId?: string;
};

export async function POST(request: NextRequest) {
  const result = await authorizePlatformAdmin(request);

  if ("response" in result) {
    return result.response;
  }

  const { actorId, supabase } = result;
  const body = (await request.json().catch(() => null)) as
    | SupplierAccessBody
    | null;

  if (!body?.companyId || !body.userId) {
    return NextResponse.json(
      { error: "Choose a supplier page and an agent before adding access." },
      { status: 400 },
    );
  }

  const roleResult = await ensureApprovedAgentRole(supabase, body.companyId);

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
        assigned_by: actorId,
        company_id: body.companyId,
        role_id: roleResult.role.id,
        status: "active",
        user_id: body.userId,
      },
      { onConflict: "company_id,user_id,role_id" },
    );

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  await Promise.all([
    supabase.from("supplier_page_access_requests").upsert(
      {
        admin_notes: "Approved manually by platform admin.",
        company_id: body.companyId,
        reviewed_at: new Date().toISOString(),
        reviewed_by: actorId,
        status: "approved",
        user_id: body.userId,
      },
      { onConflict: "company_id,user_id" },
    ),
    supabase.from("notifications").insert({
      actor_id: actorId,
      body: "A Travel Xchange admin has approved your supplier page access.",
      href: `/suppliers/${body.companyId}`,
      title: "Supplier access approved",
      type: "system" as const,
      user_id: body.userId,
    }),
    supabase.from("audit_logs").insert({
      action: "supplier_access.manually_approved",
      actor_id: actorId,
      entity_id: body.userId,
      entity_type: "profile",
      metadata: {
        company_id: body.companyId,
      },
      summary: "Platform admin manually approved supplier page access.",
    }),
  ]);

  return NextResponse.json({ message: "Agent added to supplier access." });
}

export async function DELETE(request: NextRequest) {
  const result = await authorizePlatformAdmin(request);

  if ("response" in result) {
    return result.response;
  }

  const { actorId, supabase } = result;
  const body = (await request.json().catch(() => null)) as
    | SupplierAccessBody
    | null;

  if (!body?.companyId || !body.userId) {
    return NextResponse.json(
      { error: "Choose a supplier page and an agent before removing access." },
      { status: 400 },
    );
  }

  const roleResult = await ensureApprovedAgentRole(supabase, body.companyId);

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
    .update({
      assigned_by: actorId,
      status: "removed",
    })
    .eq("company_id", body.companyId)
    .eq("user_id", body.userId)
    .eq("role_id", roleResult.role.id);

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  await Promise.all([
    supabase
      .from("supplier_page_access_requests")
      .update({
        admin_notes: "Access removed manually by platform admin.",
        reviewed_at: new Date().toISOString(),
        reviewed_by: actorId,
        status: "cancelled",
      })
      .eq("company_id", body.companyId)
      .eq("user_id", body.userId),
    supabase.from("audit_logs").insert({
      action: "supplier_access.removed",
      actor_id: actorId,
      entity_id: body.userId,
      entity_type: "profile",
      metadata: {
        company_id: body.companyId,
      },
      summary: "Platform admin removed supplier page access.",
    }),
  ]);

  return NextResponse.json({ message: "Agent access removed." });
}

async function authorizePlatformAdmin(request: NextRequest) {
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

  const supabase = createSupabaseAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isPlatformAdmin(profile)) {
    return {
      response: NextResponse.json(
        { error: "Only platform admins can manage supplier access here." },
        { status: 403 },
      ),
    };
  }

  return { actorId: user.id, supabase };
}
