"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BriefcaseBusiness,
  FileText,
  Megaphone,
  ShieldCheck,
  Users,
} from "lucide-react";

import { AdminEmptyState, AdminStatusBadge, getStatusTone } from "@/components/admin/admin-ui";
import { AdminPageShell, phase14SetupMessage } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { AuditLog, Database, ModerationReport } from "@/types/database";

type TableName = keyof Database["public"]["Tables"];

type AdminCount = {
  href: string;
  icon: typeof Users;
  label: string;
  table: TableName;
  value: number;
};

const countCards: Array<Omit<AdminCount, "value">> = [
  { href: "/admin/users", icon: Users, label: "Members", table: "profiles" },
  { href: "/admin/posts", icon: FileText, label: "Posts", table: "posts" },
  { href: "/admin/reports", icon: AlertTriangle, label: "Reports", table: "reports" },
  {
    href: "/admin/verification",
    icon: ShieldCheck,
    label: "Verification",
    table: "verification_requests",
  },
  { href: "/admin/jobs", icon: BriefcaseBusiness, label: "Jobs", table: "jobs" },
  { href: "/admin/articles", icon: Megaphone, label: "Articles", table: "articles" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function AdminDashboard() {
  return (
    <AdminPageShell
      activeHref="/admin"
      description="Review platform activity, see what needs moderation, and jump into the owner tools for users, content, verification, advertising, jobs, and articles."
      title="Admin dashboard"
    >
      {({ userId }) => <AdminDashboardContent userId={userId} />}
    </AdminPageShell>
  );
}

function AdminDashboardContent({ userId }: { userId: string }) {
  const configured = isSupabaseConfigured();
  const [counts, setCounts] = useState<AdminCount[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadDashboard = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const loadedCounts: AdminCount[] = [];

    for (const card of countCards) {
      const { count, error: countError } = await supabase
        .from(card.table)
        .select("*", { count: "exact", head: true });

      if (countError) {
        setError(
          isMissingTableError(countError, [
            "reports",
            "moderation_actions",
            "audit_logs",
            "verification_requests",
          ])
            ? phase14SetupMessage
            : countError.message,
        );
        setIsLoading(false);
        return;
      }

      loadedCounts.push({ ...card, value: count ?? 0 });
    }

    const [
      { data: reportData, error: reportError },
      { data: auditData, error: auditError },
    ] = await Promise.all([
      supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const firstError = reportError ?? auditError;

    if (firstError) {
      setError(
        isMissingTableError(firstError, [
          "reports",
          "moderation_actions",
          "audit_logs",
          "verification_requests",
        ])
          ? phase14SetupMessage
          : firstError.message,
      );
      setIsLoading(false);
      return;
    }

    setCounts(loadedCounts);
    setReports((reportData ?? []) as ModerationReport[]);
    setAuditLogs((auditData ?? []) as AuditLog[]);
    setError(null);
    setIsLoading(false);
  }, [supabase]);

  async function handleCreateAuditCheck() {
    if (!supabase) {
      return;
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      action: "admin.health_check",
      actor_id: userId,
      entity_type: "admin_dashboard",
      summary: "Admin dashboard test action recorded.",
    });

    if (auditError) {
      setError(auditError.message);
      return;
    }

    await loadDashboard();
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  if (isLoading) {
    return (
      <div className="tx-card p-6 text-sm text-[#4d6b9e]">
        Loading admin dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="tx-card border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {counts.map((card) => {
          const Icon = card.icon;

          return (
            <Link className="tx-card p-5 transition hover:-translate-y-0.5" href={card.href} key={card.table}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#4d6b9e]">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-[#061b4f]">
                    {card.value}
                  </p>
                </div>
                <span className="flex size-11 items-center justify-center rounded-lg bg-[#eef5ff] text-[#063b86]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="tx-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-[#061b4f]">
              Latest reports
            </h2>
            <Link className="text-sm font-bold text-[#f52968]" href="/admin/reports">
              View all
            </Link>
          </div>

          {reports.length === 0 ? (
            <AdminEmptyState title="No reports yet">
              Reported posts, comments, users, and companies will appear here
              once members start flagging content.
            </AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-3">
              {reports.map((report) => (
                <div className="rounded-lg border border-[#d9e4f5] p-4" key={report.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold capitalize text-[#061b4f]">
                      {report.content_type} report
                    </p>
                    <AdminStatusBadge tone={getStatusTone(report.status)}>
                      {report.status.replaceAll("_", " ")}
                    </AdminStatusBadge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
                    {report.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="tx-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-[#061b4f]">
              Audit trail
            </h2>
            <Button className="tx-action" onClick={handleCreateAuditCheck} type="button">
              Record test action
            </Button>
          </div>

          {auditLogs.length === 0 ? (
            <AdminEmptyState title="No audit logs yet">
              Admin actions will be recorded here, so there is a clear history
              of moderation and owner changes.
            </AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-3">
              {auditLogs.map((log) => (
                <div className="rounded-lg border border-[#d9e4f5] p-4" key={log.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-[#061b4f]">{log.summary}</p>
                    <span className="text-xs font-medium text-[#4d6b9e]">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#4d6b9e]">
                    {log.action}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
