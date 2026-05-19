import type { TravelXchangeApiClient } from "@/lib/api/client";
import type {
  AppNotification,
  ArticleWithMeta,
  ConversationWithMeta,
  CourseWithMeta,
  EventWithMeta,
  FeedPost,
  GroupWithStats,
  JobWithCompany,
  Profile,
  QuestionWithMeta,
} from "@/types/database";

export function createTravelXchangeApi(client: TravelXchangeApiClient) {
  return {
    account: {
      getCurrentProfile: () => client.get<Profile>("/api/mobile/profile"),
      updateProfile: (body: Partial<Profile>) =>
        client.patch<Profile>("/api/mobile/profile", body),
    },
    discovery: {
      search: (query: string) =>
        client.get<unknown[]>(
          `/api/mobile/search?q=${encodeURIComponent(query.trim())}`,
        ),
    },
    events: {
      list: () => client.get<EventWithMeta[]>("/api/mobile/events"),
    },
    feed: {
      createPost: (body: { content: string; topic: string }) =>
        client.post<FeedPost>("/api/mobile/feed", body),
      list: () => client.get<FeedPost[]>("/api/mobile/feed"),
    },
    groups: {
      list: () => client.get<GroupWithStats[]>("/api/mobile/groups"),
    },
    jobs: {
      list: () => client.get<JobWithCompany[]>("/api/mobile/jobs"),
    },
    messages: {
      listConversations: () =>
        client.get<ConversationWithMeta[]>("/api/mobile/messages"),
    },
    news: {
      list: () => client.get<ArticleWithMeta[]>("/api/mobile/news"),
    },
    notifications: {
      list: () => client.get<AppNotification[]>("/api/mobile/notifications"),
    },
    support: {
      listQuestions: () =>
        client.get<QuestionWithMeta[]>("/api/mobile/support/questions"),
    },
    training: {
      listCourses: () => client.get<CourseWithMeta[]>("/api/mobile/training"),
    },
  };
}
