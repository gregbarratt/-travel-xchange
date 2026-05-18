"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  Circle,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  formatConversationDate,
  notificationTypeLabel,
} from "@/config/messages";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  AppNotification,
  NotificationWithActor,
  Profile,
} from "@/types/database";

const phase11SetupMessage =
  "The Phase 11 messaging tables are not installed yet. Run supabase/phase-11-messaging.sql in Supabase, then refresh this page.";

function isMissingMessagingTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, [
    "conversations",
    "conversation_members",
    "messages",
    "notifications",
  ]);
}

function attachActors(
  notifications: AppNotification[],
  actors: Pick<Profile, "id" | "full_name" | "headline" | "role">[],
): NotificationWithActor[] {
  const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

  return notifications.map((notification) => ({
    ...notification,
    actor: notification.actor_id
      ? actorMap.get(notification.actor_id) ?? null
      : null,
  }));
}

export function NotificationsCentre() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [isLoading, setIsLoading] = useState(configured);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadNotifications = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    setUserId(userData.user.id);

    const [{ data: profileData }, { data: notificationRows, error: notificationError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userData.user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
      ]);

    setViewerProfile(profileData);

    if (notificationError) {
      setError(
        isMissingMessagingTable(notificationError)
          ? phase11SetupMessage
          : notificationError.message,
      );
      setIsLoading(false);
      return;
    }

    const typedNotifications = (notificationRows ?? []) as AppNotification[];
    const actorIds = Array.from(
      new Set(
        typedNotifications
          .map((notification) => notification.actor_id)
          .filter(Boolean) as string[],
      ),
    );
    let actorRows: Pick<Profile, "id" | "full_name" | "headline" | "role">[] = [];

    if (actorIds.length > 0) {
      const { data: actorsData } = await supabase
        .from("profiles")
        .select("id, full_name, headline, role")
        .in("id", actorIds);

      actorRows = (actorsData ?? []) as Pick<
        Profile,
        "id" | "full_name" | "headline" | "role"
      >[];
    }

    setNotifications(attachActors(typedNotifications, actorRows));
    setError(null);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadNotifications]);

  async function markNotificationRead(notificationId: string) {
    if (!supabase || !userId) {
      return;
    }

    setIsUpdating(true);

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (updateError) {
      setError(updateError.message);
      setIsUpdating(false);
      return;
    }

    setIsUpdating(false);
    await loadNotifications();
  }

  async function markAllRead() {
    if (!supabase || !userId) {
      return;
    }

    setIsUpdating(true);

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (updateError) {
      setError(updateError.message);
      setIsUpdating(false);
      return;
    }

    setIsUpdating(false);
    await loadNotifications();
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;
  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "unread") {
      return !notification.is_read;
    }

    if (filter === "read") {
      return notification.is_read;
    }

    return true;
  });

  return (
    <MemberPageShell
      activeLabel="Notifications"
      actions={
        <Link
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          href="/messages"
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          Messages
        </Link>
      }
      eyebrow="Notifications"
      title="Notification centre"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so notifications cannot load.
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[#0f766e]">
              Phase 11 notifications
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
              Keep track of new member activity
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Notifications start with messages. Push notifications and richer
              alerts are prepared for later phases.
            </p>
          </div>
          <Button
            className="bg-[#0f766e] text-white hover:bg-[#115e59]"
            disabled={isUpdating || unreadCount === 0}
            onClick={markAllRead}
            type="button"
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            Mark all read
          </Button>
        </div>
      </section>

      {error ? (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "All", value: "all" },
                { label: "Unread", value: "unread" },
                { label: "Read", value: "read" },
              ].map((option) => (
                <button
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition",
                    filter === option.value
                      ? "border-[#0f766e] bg-[#e0f2f1] text-[#0f766e]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  key={option.value}
                  onClick={() => setFilter(option.value as typeof filter)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading notifications...
            </div>
          ) : null}

          {!isLoading && filteredNotifications.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
              <Bell
                className="mx-auto size-8 text-[#0f766e]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">
                No notifications in this view
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Send a test message to yourself from the messages page if you
                only have one account.
              </p>
            </div>
          ) : null}

          {filteredNotifications.map((notification) => (
            <article
              className={cn(
                "rounded-md border bg-white p-5 shadow-sm",
                notification.is_read
                  ? "border-slate-200"
                  : "border-[#0f766e] ring-2 ring-[#0f766e]/10",
              )}
              key={notification.id}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {!notification.is_read ? (
                      <Circle
                        className="size-3 fill-[#0f766e] text-[#0f766e]"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {notificationTypeLabel(notification.type)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatConversationDate(notification.created_at)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-slate-950">
                    {notification.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {notification.body ?? "You have a new update."}
                  </p>
                  {notification.actor ? (
                    <p className="mt-2 text-xs text-slate-500">
                      From {notification.actor.full_name ?? "Travel Xchange member"}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {notification.href ? (
                    <Link
                      className={cn(buttonVariants({ variant: "outline" }))}
                      href={notification.href}
                    >
                      <ExternalLink className="size-4" aria-hidden="true" />
                      Open
                    </Link>
                  ) : null}
                  {!notification.is_read ? (
                    <Button
                      className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      disabled={isUpdating}
                      onClick={() => markNotificationRead(notification.id)}
                      type="button"
                      variant="outline"
                    >
                      <CheckCheck className="size-4" aria-hidden="true" />
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </main>

        <aside className="space-y-5">
          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Notification summary
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Total
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {notifications.length}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Unread
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {unreadCount}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                Later upgrades
              </h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Push notifications, email digests, and realtime unread badges are
              reserved for later phases.
            </p>
          </article>
        </aside>
      </div>
    </MemberPageShell>
  );
}
