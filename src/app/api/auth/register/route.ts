import { NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { TravelXchangeRole, VerificationTier } from "@/types/database";

const publicRegistrationRoles = new Set<TravelXchangeRole>([
  "registered_user",
  "verified_travel_professional",
  "supplier",
  "recruiter",
  "trainer",
  "advertiser",
]);

type RegistrationPayload = {
  email?: string;
  password?: string;
  fullName?: string;
  role?: TravelXchangeRole;
  location?: string;
  companyName?: string;
  companyType?: string;
  websiteUrl?: string;
  agentNumber?: string;
  iataNumber?: string;
  abtaNumber?: string;
  atolTtaNumber?: string;
  approvalNote?: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWebsiteUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

function getRequestedTier(role: TravelXchangeRole): VerificationTier {
  if (role === "supplier") {
    return "supplier_verified";
  }

  if (role === "recruiter") {
    return "recruiter_verified";
  }

  if (role === "trainer") {
    return "trainer_verified";
  }

  if (role === "verified_travel_professional") {
    return "travel_professional_verified";
  }

  return "email_verified";
}

function buildRegistrationNotes(payload: Required<RegistrationPayload>) {
  const lines = [
    "Public registration request.",
    `Requested role: ${payload.role}`,
    `Company / supplier / business: ${payload.companyName}`,
    `Company type: ${payload.companyType}`,
  ];

  if (payload.location) {
    lines.push(`Location: ${payload.location}`);
  }

  if (payload.websiteUrl) {
    lines.push(`Website: ${payload.websiteUrl}`);
  }

  if (payload.agentNumber) {
    lines.push(`Agent / agency number: ${payload.agentNumber}`);
  }

  if (payload.iataNumber) {
    lines.push(`IATA number: ${payload.iataNumber}`);
  }

  if (payload.abtaNumber) {
    lines.push(`ABTA number: ${payload.abtaNumber}`);
  }

  if (payload.atolTtaNumber) {
    lines.push(`ATOL / TTA number: ${payload.atolTtaNumber}`);
  }

  if (payload.approvalNote) {
    lines.push("", "Applicant note:", payload.approvalNote);
  }

  return lines.join("\n");
}

function getErrorMessage(error: { message?: string } | null) {
  return error?.message ?? "Something went wrong while creating the account.";
}

export async function POST(request: Request) {
  if (process.env.TRAVEL_XCHANGE_PUBLIC_REGISTRATION !== "true") {
    return NextResponse.json(
      {
        error:
          "Public registration is temporarily closed while Travel Xchange prepares private beta access.",
      },
      { status: 403 },
    );
  }

  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      {
        error:
          "Registration is not configured yet. Add the Supabase server key before accepting public applications.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as RegistrationPayload | null;

  if (!body) {
    return NextResponse.json(
      { error: "Please complete the registration form." },
      { status: 400 },
    );
  }

  const role = cleanText(body.role) as TravelXchangeRole;
  const payload: Required<RegistrationPayload> = {
    abtaNumber: cleanText(body.abtaNumber),
    agentNumber: cleanText(body.agentNumber),
    approvalNote: cleanText(body.approvalNote),
    atolTtaNumber: cleanText(body.atolTtaNumber),
    companyName: cleanText(body.companyName),
    companyType: cleanText(body.companyType),
    email: cleanText(body.email).toLowerCase(),
    fullName: cleanText(body.fullName),
    iataNumber: cleanText(body.iataNumber),
    location: cleanText(body.location),
    password: cleanText(body.password),
    role,
    websiteUrl: normalizeWebsiteUrl(cleanText(body.websiteUrl)) ?? "",
  };

  if (
    !payload.email ||
    !payload.password ||
    !payload.fullName ||
    !payload.role ||
    !payload.location ||
    !payload.companyName ||
    !payload.companyType ||
    !payload.websiteUrl ||
    !payload.approvalNote
  ) {
    return NextResponse.json(
      {
        error: "Please complete every required field.",
      },
      { status: 400 },
    );
  }

  if (payload.password.length < 6) {
    return NextResponse.json(
      { error: "Please use a password with at least 6 characters." },
      { status: 400 },
    );
  }

  if (!publicRegistrationRoles.has(payload.role)) {
    return NextResponse.json(
      { error: "Please choose a valid Travel Xchange role." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const metadata = {
    abta_number: payload.abtaNumber || null,
    agent_number: payload.agentNumber || null,
    approval_note: payload.approvalNote || null,
    atol_tta_number: payload.atolTtaNumber || null,
    company_name: payload.companyName,
    company_type: payload.companyType,
    full_name: payload.fullName,
    iata_number: payload.iataNumber || null,
    requested_role: payload.role,
    registration_source: "public_registration_form",
    website_url: payload.websiteUrl || null,
  };

  const { data: createdUser, error: createUserError } =
    await supabase.auth.admin.createUser({
      email: payload.email,
      email_confirm: true,
      password: payload.password,
      user_metadata: metadata,
    });

  if (createUserError || !createdUser.user) {
    const message = getErrorMessage(createUserError);

    return NextResponse.json(
      {
        error: message.toLowerCase().includes("already")
          ? "An account with this email already exists. Please log in or use forgotten password."
          : message,
      },
      { status: 400 },
    );
  }

  const userId = createdUser.user.id;
  const requestedTier = getRequestedTier(payload.role);
  const notes = buildRegistrationNotes(payload);

  const { data: existingCompany } = await supabase
    .from("companies")
    .select("id, name, company_type")
    .eq("status", "active")
    .ilike("name", payload.companyName)
    .maybeSingle();

  let companyId = existingCompany?.id ?? null;
  const approvalRoute: "company_admin" | "travel_xchange_admin" = existingCompany
    ? "company_admin"
    : "travel_xchange_admin";

  if (!companyId) {
    const { data: draftCompany, error: companyError } = await supabase
      .from("companies")
      .insert({
        company_type: payload.companyType,
        created_by: userId,
        description:
          "Created from public registration and waiting for Travel Xchange admin approval.",
        name: payload.companyName,
        status: "draft",
        website_url: payload.websiteUrl || null,
      })
      .select("id")
      .single();

    if (companyError || !draftCompany) {
      return NextResponse.json(
        { error: getErrorMessage(companyError) },
        { status: 400 },
      );
    }

    companyId = draftCompany.id;
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    company_id: null,
    full_name: payload.fullName,
    headline: `${payload.companyName} registration pending approval`,
    id: userId,
    location: payload.location || null,
    onboarding_completed: true,
    role: "registered_user",
    verification_tier: "email_verified",
  });

  if (profileError) {
    return NextResponse.json(
      { error: getErrorMessage(profileError) },
      { status: 400 },
    );
  }

  await supabase.from("user_roles").upsert(
    {
      role: "registered_user",
      user_id: userId,
    },
    { onConflict: "user_id,role" },
  );

  if (approvalRoute === "company_admin" && companyId) {
    await supabase.from("supplier_page_access_requests").upsert(
      {
        company_id: companyId,
        message: notes,
        metadata: {
          ...metadata,
          approval_route: approvalRoute,
          requested_tier: requestedTier,
        },
        status: "pending",
        user_id: userId,
      },
      { onConflict: "company_id,user_id" },
    );
  }

  await supabase.from("verification_requests").insert({
    company_id: companyId,
    metadata: {
      ...metadata,
      approval_route: approvalRoute,
      existing_company_matched: Boolean(existingCompany),
    },
    notes:
      approvalRoute === "company_admin"
        ? `${notes}\n\nCompany match found. Supplier/company admin should approve supplier page access.`
        : `${notes}\n\nNo active company match was found. Travel Xchange admin should review the draft company and applicant.`,
    requested_tier: requestedTier,
    status: "pending",
    user_id: userId,
  });

  await supabase.from("audit_logs").insert({
    action: "registration.request_created",
    actor_id: userId,
    entity_id: companyId,
    entity_type: "registration_request",
    metadata: {
      approval_route: approvalRoute,
      company_id: companyId,
      requested_role: payload.role,
      requested_tier: requestedTier,
    },
    summary:
      approvalRoute === "company_admin"
        ? "Public registration created and routed to company admin approval."
        : "Public registration created and routed to Travel Xchange admin approval.",
  });

  return NextResponse.json({
    approvalRoute,
    message:
      approvalRoute === "company_admin"
        ? "Your free account has been created. Your company admin will review your access request."
        : "Your free account has been created. Travel Xchange admin will review your company and access request.",
  });
}
