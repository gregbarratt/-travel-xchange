import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatusTone = "blue" | "green" | "amber" | "red" | "slate";

const statusToneClasses: Record<StatusTone, string> = {
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  blue: "bg-[#eef5ff] text-[#063b86] border-[#b8cae8]",
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  red: "bg-rose-50 text-rose-800 border-rose-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
};

export function AdminStatusBadge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-2 py-1 text-xs font-bold capitalize",
        statusToneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

export function AdminEmptyState({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="tx-card p-8 text-center">
      <h2 className="text-lg font-extrabold text-[#061b4f]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#4d6b9e]">
        {children}
      </p>
    </div>
  );
}

export function getStatusTone(status: string): StatusTone {
  if (["active", "approved", "complete", "published", "resolved"].includes(status)) {
    return "green";
  }

  if (["draft", "in_review", "open", "pending", "reviewing"].includes(status)) {
    return "amber";
  }

  if (["deleted", "hidden", "rejected", "suspended"].includes(status)) {
    return "red";
  }

  return "blue";
}
