"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  MessageCircle,
  Plus,
  Search,
  SendHorizontal,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { SelectField, TextareaField } from "@/components/ui/field";
import { formatConversationDate, initials } from "@/config/messages";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Conversation,
  ConversationMember,
  ConversationMemberWithProfile,
  ConversationWithMeta,
  DirectMessage,
  DirectMessageWithAuthor,
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

function buildConversationRows(
  conversations: Conversation[],
  members: ConversationMember[],
  messages: DirectMessage[],
  profiles: Pick<Profile, "id" | "full_name" | "headline" | "role">[],
  currentUserId: string,
): ConversationWithMeta[] {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const memberMap = members.reduce<Map<string, ConversationMemberWithProfile[]>>(
    (map, member) => {
      const rows = map.get(member.conversation_id) ?? [];

      rows.push({
        ...member,
        profile: profileMap.get(member.user_id) ?? null,
      });
      map.set(member.conversation_id, rows);

      return map;
    },
    new Map(),
  );
  const newestMessageMap = messages.reduce<Map<string, DirectMessage>>(
    (map, message) => {
      const existing = map.get(message.conversation_id);

      if (
        !existing ||
        new Date(message.created_at).getTime() >
          new Date(existing.created_at).getTime()
      ) {
        map.set(message.conversation_id, message);
      }

      return map;
    },
    new Map(),
  );

  return conversations
    .map((conversation) => {
      const conversationMembers = memberMap.get(conversation.id) ?? [];
      const otherMembers = conversationMembers.filter(
        (member) => member.user_id !== currentUserId,
      );
      const currentMembership = conversationMembers.find(
        (member) => member.user_id === currentUserId,
      );
      const lastReadTime = currentMembership?.last_read_at
        ? new Date(currentMembership.last_read_at).getTime()
        : 0;
      const unreadCount = messages.filter(
        (message) =>
          message.conversation_id === conversation.id &&
          message.sender_id !== currentUserId &&
          new Date(message.created_at).getTime() > lastReadTime,
      ).length;
      const displayTitle =
        conversation.title ||
        otherMembers
          .map((member) => member.profile?.full_name)
          .filter(Boolean)
          .join(", ") ||
        "Conversation with yourself";

      return {
        ...conversation,
        display_title: displayTitle,
        last_message: newestMessageMap.get(conversation.id) ?? null,
        members: conversationMembers,
        other_members: otherMembers,
        unread_count: unreadCount,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
}

function buildMessageRows(
  messages: DirectMessage[],
  profiles: Pick<Profile, "id" | "full_name" | "headline" | "role">[],
): DirectMessageWithAuthor[] {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return messages.map((message) => ({
    ...message,
    author: profileMap.get(message.sender_id) ?? null,
  }));
}

export function MessagesCentre() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<
    Pick<Profile, "id" | "full_name" | "headline" | "role">[]
  >([]);
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [messages, setMessages] = useState<DirectMessageWithAuthor[]>([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [newConversationText, setNewConversationText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(configured);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadMessages = useCallback(
    async (preferredConversationId?: string) => {
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

      const [
        { data: profileData },
        { data: allProfilesData },
        { data: myMembershipRows, error: membershipsError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id, full_name, headline, role")
          .order("full_name", { ascending: true })
          .limit(100),
        supabase
          .from("conversation_members")
          .select("*")
          .eq("user_id", userData.user.id)
          .eq("status", "active"),
      ]);

      setViewerProfile(profileData);

      if (membershipsError) {
        setError(
          isMissingMessagingTable(membershipsError)
            ? phase11SetupMessage
            : membershipsError.message,
        );
        setIsLoading(false);
        return;
      }

      const profileRows = (allProfilesData ?? []) as Pick<
        Profile,
        "id" | "full_name" | "headline" | "role"
      >[];

      setProfiles(profileRows);

      if (!recipientId && profileRows.length > 0) {
        setRecipientId(
          profileRows.find((profile) => profile.id !== userData.user.id)?.id ??
            profileRows[0].id,
        );
      }

      const myMemberships = (myMembershipRows ?? []) as ConversationMember[];
      const conversationIds = myMemberships.map(
        (membership) => membership.conversation_id,
      );

      if (conversationIds.length === 0) {
        setConversations([]);
        setMessages([]);
        setSelectedConversationId(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const [conversationResult, memberResult, messageResult] = await Promise.all([
        supabase
          .from("conversations")
          .select("*")
          .in("id", conversationIds)
          .eq("status", "active")
          .order("updated_at", { ascending: false }),
        supabase
          .from("conversation_members")
          .select("*")
          .in("conversation_id", conversationIds)
          .eq("status", "active"),
        supabase
          .from("messages")
          .select("*")
          .in("conversation_id", conversationIds)
          .eq("status", "sent")
          .order("created_at", { ascending: false }),
      ]);

      const issue =
        conversationResult.error ?? memberResult.error ?? messageResult.error;

      if (issue) {
        setError(
          isMissingMessagingTable(issue) ? phase11SetupMessage : issue.message,
        );
        setIsLoading(false);
        return;
      }

      const conversationRows = (conversationResult.data ?? []) as Conversation[];
      const memberRows = (memberResult.data ?? []) as ConversationMember[];
      const messageRows = (messageResult.data ?? []) as DirectMessage[];
      const builtConversations = buildConversationRows(
        conversationRows,
        memberRows,
        messageRows,
        profileRows,
        userData.user.id,
      );
      const nextConversationId =
        preferredConversationId ??
        selectedConversationId ??
        builtConversations[0]?.id ??
        null;

      setConversations(builtConversations);
      setSelectedConversationId(nextConversationId);

      if (nextConversationId) {
        const selectedMessages = messageRows
          .filter((message) => message.conversation_id === nextConversationId)
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );

        setMessages(buildMessageRows(selectedMessages, profileRows));

        await supabase
          .from("conversation_members")
          .update({ last_read_at: new Date().toISOString() })
          .eq("conversation_id", nextConversationId)
          .eq("user_id", userData.user.id);
      } else {
        setMessages([]);
      }

      setError(null);
      setIsLoading(false);
    },
    [recipientId, router, selectedConversationId, supabase],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMessages();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMessages]);

  async function createNotifications(
    conversationId: string,
    recipientIds: string[],
    messagePreview: string,
  ) {
    if (!supabase || !userId) {
      return;
    }

    const targetIds = recipientIds.length > 0 ? recipientIds : [userId];

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert(
        targetIds.map((targetId) => ({
          actor_id: userId,
          body: messagePreview.slice(0, 180),
          href: `/messages`,
          title: "New message",
          type: "message",
          user_id: targetId,
        })),
      );

    if (notificationError && !isMissingMessagingTable(notificationError)) {
      setActionError(notificationError.message);
    }
  }

  async function handleCreateConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !userId) {
      return;
    }

    const firstMessage = newConversationText.trim();

    if (!recipientId || !firstMessage) {
      setActionError("Choose a member and write the first message.");
      return;
    }

    setIsCreating(true);
    setActionError(null);

    const { data: conversationId, error: conversationError } = await supabase.rpc(
      "create_direct_conversation",
      {
        first_message: firstMessage,
        target_user_id: recipientId,
      },
    );

    if (conversationError) {
      setActionError(
        isMissingMessagingTable(conversationError)
          ? phase11SetupMessage
          : conversationError.message,
      );
      setIsCreating(false);
      return;
    }

    setNewConversationText("");
    setSelectedConversationId(conversationId);
    setIsCreating(false);
    await loadMessages(conversationId);
  }

  async function handleSendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !userId || !selectedConversationId) {
      return;
    }

    const content = replyText.trim();

    if (!content) {
      setActionError("Write a message before sending.");
      return;
    }

    setIsSending(true);
    setActionError(null);

    const { error: messageError } = await supabase.from("messages").insert({
      content,
      conversation_id: selectedConversationId,
      sender_id: userId,
      status: "sent",
    });

    if (messageError) {
      setActionError(
        isMissingMessagingTable(messageError)
          ? phase11SetupMessage
          : messageError.message,
      );
      setIsSending(false);
      return;
    }

    const selectedConversation = conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    );
    const recipientIds =
      selectedConversation?.members
        .map((member) => member.user_id)
        .filter((memberId) => memberId !== userId) ?? [];

    await createNotifications(selectedConversationId, recipientIds, content);

    setReplyText("");
    setIsSending(false);
    await loadMessages(selectedConversationId);
  }

  const filteredConversations = conversations.filter((conversation) => {
    const text = [
      conversation.display_title,
      conversation.last_message?.content,
      ...conversation.members.map((member) => member.profile?.headline ?? ""),
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(searchTerm.trim().toLowerCase());
  });
  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const recipientOptions = profiles.map((profile) => ({
    label:
      profile.full_name ??
      profile.headline ??
      `Member ${profile.id.slice(0, 8)}`,
    value: profile.id,
  }));
  const unreadCount = conversations.reduce(
    (total, conversation) => total + conversation.unread_count,
    0,
  );

  return (
    <MemberPageShell
      activeLabel="Messages"
      actions={
        <Link
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          href="/notifications"
        >
          <Bell className="size-4" aria-hidden="true" />
          Notifications
        </Link>
      }
      eyebrow="Messages"
      title="Member messages"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so messages cannot load.
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[#0f766e]">
              Phase 11 messaging
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
              Start conversations with Travel Xchange members
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              This is the first private messaging version. Realtime delivery,
              attachments, blocking, and moderation controls come later.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Conversations
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-950">
                {conversations.length}
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
        </div>
      </section>

      {error ? (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {actionError ? (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
          {actionError}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <form
            className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
            onSubmit={handleCreateConversation}
          >
            <div className="flex items-center gap-2">
              <Plus className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                New conversation
              </h2>
            </div>

            <div className="mt-4 space-y-4">
              <SelectField
                label="Send to"
                name="recipient"
                onChange={(event) => setRecipientId(event.target.value)}
                options={recipientOptions}
                value={recipientId}
              />
              <TextareaField
                className="min-h-28"
                label="First message"
                name="first_message"
                onChange={(event) => setNewConversationText(event.target.value)}
                placeholder="Hi, I wanted to ask about..."
                value={newConversationText}
              />
              <Button
                className="w-full bg-[#0f766e] text-white hover:bg-[#115e59]"
                disabled={
                  !configured ||
                  isLoading ||
                  isCreating ||
                  recipientOptions.length === 0
                }
                type="submit"
              >
                <SendHorizontal className="size-4" aria-hidden="true" />
                {isCreating ? "Starting..." : "Start conversation"}
              </Button>
            </div>
          </form>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                Search conversations
              </span>
              <span className="relative mt-2 block">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by member or message..."
                  value={searchTerm}
                />
              </span>
            </label>

            <div className="mt-4 space-y-3">
              {isLoading ? (
                <p className="rounded-md border border-slate-200 p-4 text-sm text-slate-600">
                  Loading conversations...
                </p>
              ) : null}

              {!isLoading && filteredConversations.length === 0 ? (
                <div className="rounded-md border border-slate-200 p-5 text-center">
                  <Users
                    className="mx-auto size-7 text-[#0f766e]"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    No conversations yet. Start one with yourself for testing if
                    you only have one account.
                  </p>
                </div>
              ) : null}

              {filteredConversations.map((conversation) => (
                <button
                  className={cn(
                    "w-full rounded-md border p-3 text-left transition",
                    selectedConversationId === conversation.id
                      ? "border-[#0f766e] bg-[#e0f2f1]"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversationId(conversation.id);
                    void loadMessages(conversation.id);
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">
                        {conversation.display_title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
                        {conversation.last_message?.content ??
                          "No messages yet"}
                      </p>
                    </div>
                    {conversation.unread_count > 0 ? (
                      <span className="rounded-full bg-[#0f766e] px-2 py-0.5 text-xs font-semibold text-white">
                        {conversation.unread_count}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatConversationDate(
                      conversation.last_message?.created_at ??
                        conversation.updated_at,
                    )}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main className="rounded-md border border-slate-200 bg-white shadow-sm">
          {selectedConversation ? (
            <>
              <div className="border-b border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-md bg-[#082f49] text-sm font-semibold text-white">
                    {initials(selectedConversation.display_title)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-semibold tracking-normal text-slate-950">
                      {selectedConversation.display_title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedConversation.members.length} member
                      {selectedConversation.members.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-[560px] space-y-4 overflow-y-auto p-5">
                {messages.length === 0 ? (
                  <div className="rounded-md border border-slate-200 p-6 text-center text-sm leading-6 text-slate-600">
                    No messages in this conversation yet.
                  </div>
                ) : null}

                {messages.map((message) => {
                  const isOwnMessage = message.sender_id === userId;

                  return (
                    <div
                      className={cn(
                        "flex",
                        isOwnMessage ? "justify-end" : "justify-start",
                      )}
                      key={message.id}
                    >
                      <article
                        className={cn(
                          "max-w-2xl rounded-md px-4 py-3 text-sm leading-6",
                          isOwnMessage
                            ? "bg-[#0f766e] text-white"
                            : "border border-slate-200 bg-slate-50 text-slate-700",
                        )}
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs opacity-80">
                          <span>
                            {isOwnMessage
                              ? "You"
                              : message.author?.full_name ?? "Member"}
                          </span>
                          <span>-</span>
                          <span>{formatConversationDate(message.created_at)}</span>
                        </div>
                        <p className="whitespace-pre-line">{message.content}</p>
                      </article>
                    </div>
                  );
                })}
              </div>

              <form
                className="border-t border-slate-200 p-5"
                onSubmit={handleSendReply}
              >
                <TextareaField
                  className="min-h-24"
                  label="Reply"
                  name="reply"
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="Write your reply..."
                  value={replyText}
                />
                <div className="mt-4 flex justify-end">
                  <Button
                    className="bg-[#0f766e] text-white hover:bg-[#115e59]"
                    disabled={isSending}
                    size="lg"
                    type="submit"
                  >
                    <SendHorizontal className="size-4" aria-hidden="true" />
                    {isSending ? "Sending..." : "Send message"}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex min-h-[480px] items-center justify-center p-8 text-center">
              <div>
                <MessageCircle
                  className="mx-auto size-9 text-[#0f766e]"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-lg font-semibold text-slate-950">
                  Select or start a conversation
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Messages will appear here once you start a conversation with a
                  Travel Xchange member.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </MemberPageShell>
  );
}
