import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The context lane.
 *
 * Not a sidebar for leftovers: every item carries an action, and the lane is
 * capped at six so it stays scannable. Anything that is not actionable belongs
 * in the pane.
 */

export type LaneItem = {
  /** What it is. */
  title: string;
  /** Why it is here now - a count, a deadline, a status. */
  meta?: string;
  /** Where the action goes. Required: an item with nowhere to go is not one. */
  href: string;
  /** The action, in the imperative. */
  actionLabel: string;
};

export const maxLaneItems = 6;

export function ContextLane({
  className,
  heading = "Needs you",
  items,
}: {
  className?: string;
  heading?: string;
  items: LaneItem[];
}) {
  const visible = items.slice(0, maxLaneItems);

  if (visible.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label={heading}
      className={cn("tx-lane w-full shrink-0 xl:w-[var(--tx-lane-width)]", className)}
    >
      <div className="xl:sticky xl:top-[calc(var(--tx-topbar-height)+1.25rem)]">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-[var(--tx-text-subtle)]">
          {heading}
        </h2>
        <ul className="mt-2 space-y-2">
          {visible.map((item) => (
            <li key={`${item.href}-${item.title}`}>
              <Link
                className="tx-card block p-3 transition hover:border-[var(--tx-border-strong)] hover:bg-[var(--tx-surface-hover)]"
                href={item.href}
              >
                <p className="text-sm font-bold leading-5 text-[var(--tx-text)]">
                  {item.title}
                </p>
                {item.meta ? (
                  <p className="mt-0.5 text-xs font-semibold text-[var(--tx-text-muted)]">
                    {item.meta}
                  </p>
                ) : null}
                <p className="mt-2 text-xs font-bold text-[var(--tx-accent)]">
                  {item.actionLabel}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
