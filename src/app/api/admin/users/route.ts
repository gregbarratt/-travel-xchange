import { NextRequest, NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type {
  Profile,
  TravelXchangeRole,
  VerificationTier,
} from "@/types/database";

type AdminUserBody = {
  email?: string;
  fullName?: string;
  role?: TravelXchangeRole;
  verificationTier?: VerificationTier;
};

const validRoles: TravelXchangeRole[] = [
  "registered_user",
  "verified_travel_professional",
  "supplier",
  "recruiter",
  "trainer",
  "advertiser",
  "moderator",
  "admin",
  "super_admin",
];

const validVerificationTiers: VerificationTier[] = [
  "unverified",
  "email_verified",
  "travel_professional_verified",
  "supplier_verified",
  "recruiter_verified",
  "trainer_verified",
  "admin_verified",
];

export async function GET(request: NextRequest) {
  const result = await authorizeAdmin(request);

  if ("response" in result) {
    return result.response;
  }

  const { supabase } = result;
  const [{ data: profiles, error: profileError }, authUsersResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(80),
      listAuthUsers(supabase),
    ]);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (authUsersResult.error) {
    return NextResponse.json(
      { error: authUsersResult.error },
      { status: 500 },
    );
  }

  const emailsById = new Map(
    authUsersResult.users.map((user) => [user.id, user.email ?? null]),
  );

  return NextResponse.json({
    profiles: ((profiles ?? []) as Profile[]).map((profile) => ({
      ...profile,
      email: emailsById.get(profile.id) ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const result = await authorizeAdmin(request, { requireSuperAdmin: true });

  if ("response" in result) {
    return result.response;
  }

  const { actorId, supabase } = result;
  const body = (await request.json().catch(() => null)) as
    | AdminUserBody
    | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const fullName = body?.fullName?.trim() ?? "";
  const role = body?.role ?? "registered_user";
  const verificationTier = body?.verificationTier ?? "email_verified";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Choose a valid role." }, { status: 400 });
  }

  if (!validVerificationTiers.includes(verificationTier)) {
    return NextResponse.json(
      { error: "Choose a valid verification tier." },
      { status: 400 },
    );
  }

  const existingUsersResult = await listAuthUsers(supabase);

  if (existingUsersResult.error) {
    return NextResponse.json(
      { error: existingUsersResult.error },
      { status: 500 },
    );
  }

  let authUser =
    existingUsersResult.users.find(
      (user) => user.email?.toLowerCase() === email,
    ) ?? null;
  let invited = false;

  if (!authUser) {
    const origin =
      request.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_SITE_URL;
    const redirectTo = origin ? `${origin.replace(/\/$/, "")}/login` : undefined;
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName || email.split("@")[0],
        },
        redirectTo,
      });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    authUser = inviteData.user;
    invited = true;
  }

  if (!authUser) {
    return NextResponse.json(
      { error: "The user account could not be prepared." },
      { status: 500 },
    );
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", authUser.id)
    .maybeSingle();

  const profileName =
    fullName ||
    existingProfile?.full_name ||
    authUser.user_metadata?.full_name ||
    email.split("@")[0];

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        full_name: profileName,
        id: authUser.id,
        onboarding_completed: true,
        role,
        verification_tier: verificationTier,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error: roleError } = await supabase.from("user_roles").upsert(
    {
      role,
      user_id: authUser.id,
    },
    { onConflict: "user_id,role" },
  );

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    action: invited ? "profile.admin_invited" : "profile.admin_promoted",
    actor_id: actorId,
    entity_id: authUser.id,
    entity_type: "profile",
    metadata: {
      email,
      invited,
      role,
      verification_tier: verificationTier,
    },
    summary: invited
      ? `Invited ${email} as ${role}.`
      : `Updated ${email} to ${role}.`,
  });

  return NextResponse.json({
    message: invited
      ? "User invited and profile prepared."
      : "Existing user updated.",
    profile: {
      ...(profile as Profile),
      email,
    },
  });
}

async function authorizeAdmin(
  request: NextRequest,
  options: { requireSuperAdmin?: boolean } = {},
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

  const supabase = createSupabaseAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;
  const isAdmin =
    role === "moderator" || role === "admin" || role === "super_admin";

  if (!isAdmin) {
    return {
      response: NextResponse.json(
        { error: "Only platform admins can manage users here." },
        { status: 403 },
      ),
    };
  }

  if (options.requireSuperAdmin && role !== "super_admin") {
    return {
      response: NextResponse.json(
        { error: "Only Super Admins can create or promote users." },
        { status: 403 },
      ),
    };
  }

  return { actorId: user.id, supabase };
}

async function listAuthUsers(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const users = [];

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      return { error: error.message, users: [] };
    }

    users.push(...data.users);

    if (data.users.length < 1000 || users.length >= data.total) {
      break;
    }
  }

  return { error: null, users };
}
