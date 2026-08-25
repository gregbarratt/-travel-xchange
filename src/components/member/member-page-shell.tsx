"use client";

import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/tx/workspace-shell";
import type { LaneItem } from "@/components/tx/context-lane";
import type { Profile } from "@/types/database";

/**
 * The signed-in page wrapper.
 *
 * This is now a thin adapter over the Travel Xchange workspace shell. It keeps
 * the props every page already passes, so the whole signed-in surface moved
 * onto the new shell without touching thirty page components.
 *
 * `activeLabel` is retained for compatibility and deliberately unused: the
 * shell resolves the active navigation state from the URL, so it follows the
 * page rather than whatever was clicked last.
 */

type MemberPageShellProps = {
  actions?: ReactNode;
  /** @deprecated The shell derives the active area from the current route. */
  activeLabel?: string;
  children: ReactNode;
  eyebrow: string;
  /** Context lane items. Feed-like pages only; the shell caps them at six. */
  lane?: LaneItem[];
  laneHeading?: string;
  title: string;
  viewerProfile: Profile | null;
};

export function MemberPageShell({
  actions,
  children,
  eyebrow,
  lane,
  laneHeading,
  title,
  viewerProfile,
}: MemberPageShellProps) {
  return (
    <WorkspaceShell
      actions={actions}
      eyebrow={eyebrow}
      lane={lane}
      laneHeading={laneHeading}
      profile={viewerProfile}
      title={title}
    >
      {children}
    </WorkspaceShell>
  );
}
