export type TravelXchangeRole =
  | "registered_user"
  | "verified_travel_professional"
  | "supplier"
  | "recruiter"
  | "trainer"
  | "advertiser"
  | "moderator"
  | "admin"
  | "super_admin";

export type VerificationTier =
  | "unverified"
  | "email_verified"
  | "travel_professional_verified"
  | "supplier_verified"
  | "recruiter_verified"
  | "trainer_verified"
  | "admin_verified";

export type Profile = {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  role: TravelXchangeRole;
  verification_tier: VerificationTier;
  company_id: string | null;
  onboarding_completed: boolean;
};

export type Company = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  name: string;
  company_type: string;
  website_url: string | null;
  description: string | null;
  verification_tier: VerificationTier;
  status: "draft" | "active" | "suspended";
};

export type UserRole = {
  id: string;
  created_at: string;
  user_id: string;
  role: TravelXchangeRole;
};

export type PostTopic =
  | "general"
  | "supplier_updates"
  | "questions"
  | "jobs"
  | "events"
  | "training";

export type Post = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  company_id: string | null;
  title: string | null;
  content: string;
  topic: PostTopic;
  image_url: string | null;
  visibility: "public" | "members";
  status: "draft" | "published" | "hidden" | "deleted";
};

export type Comment = {
  id: string;
  created_at: string;
  updated_at: string;
  post_id: string;
  created_by: string;
  content: string;
  status: "published" | "hidden" | "deleted";
};

export type PostLike = {
  id: string;
  created_at: string;
  post_id: string;
  user_id: string;
};

export type Follow = {
  id: string;
  created_at: string;
  follower_id: string;
  following_id: string;
};

export type ProfileExperience = {
  id: string;
  created_at: string;
  updated_at: string;
  profile_id: string;
  title: string;
  company_name: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  display_order: number;
};

export type ProfileSpecialism = {
  id: string;
  created_at: string;
  profile_id: string;
  name: string;
  category: string;
};

export type CompanyFollower = {
  id: string;
  created_at: string;
  company_id: string;
  user_id: string;
};

export type GroupCategory =
  | "general"
  | "cruise"
  | "luxury"
  | "specialist"
  | "touring_adventure"
  | "homeworking"
  | "compliance"
  | "supplier_updates"
  | "marketing";

export type Group = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  name: string;
  slug: string;
  description: string;
  category: GroupCategory;
  visibility: "public" | "members" | "private";
  image_url: string | null;
  status: "active" | "archived" | "hidden";
};

export type GroupMember = {
  id: string;
  created_at: string;
  group_id: string;
  user_id: string;
  role: "owner" | "moderator" | "member";
  status: "active" | "removed";
};

export type GroupPost = {
  id: string;
  created_at: string;
  updated_at: string;
  group_id: string;
  created_by: string;
  content: string;
  status: "published" | "hidden" | "deleted";
};

export type GroupPostWithAuthor = GroupPost & {
  author: Pick<Profile, "id" | "full_name" | "headline" | "role"> | null;
};

export type GroupWithStats = Group & {
  is_joined_by_current_user: boolean;
  member_count: number;
  post_count: number;
};

export type JobCategory =
  | "travel_sales"
  | "cruise"
  | "tour_operator"
  | "business_development"
  | "marketing"
  | "operations"
  | "customer_service"
  | "travel_technology"
  | "training"
  | "recruitment";

export type JobEmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "temporary"
  | "homeworking"
  | "freelance";

export type JobPackageType =
  | "basic"
  | "featured"
  | "sponsored_employer"
  | "recruiter_subscription";

export type Job = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  company_id: string | null;
  title: string;
  slug: string;
  category: JobCategory;
  employment_type: JobEmploymentType;
  location: string;
  is_remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  description: string;
  requirements: string | null;
  application_url: string | null;
  contact_email: string | null;
  package_type: JobPackageType;
  is_featured: boolean;
  visibility: "public" | "members";
  status: "draft" | "published" | "closed" | "hidden" | "deleted";
};

export type JobApplication = {
  id: string;
  created_at: string;
  job_id: string;
  user_id: string;
  cover_note: string | null;
  status: "interested" | "applied" | "shortlisted" | "rejected" | "withdrawn";
};

export type JobBookmark = {
  id: string;
  created_at: string;
  job_id: string;
  user_id: string;
};

export type JobWithCompany = Job & {
  company: Pick<Company, "id" | "name" | "company_type"> | null;
  is_bookmarked_by_current_user: boolean;
  has_registered_interest: boolean;
};

export type ArticleType =
  | "news"
  | "supplier_update"
  | "press_release"
  | "featured";

export type ArticleStatus = "draft" | "published" | "hidden" | "archived";

export type ArticleCategory = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  description: string | null;
  status: "active" | "hidden";
};

export type Article = {
  id: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  created_by: string;
  company_id: string | null;
  category_id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  article_type: ArticleType;
  image_url: string | null;
  is_featured: boolean;
  visibility: "public" | "members";
  status: ArticleStatus;
};

export type ArticleTag = {
  id: string;
  created_at: string;
  article_id: string;
  name: string;
};

export type ArticleWithMeta = Article & {
  author: Pick<Profile, "id" | "full_name" | "headline" | "role"> | null;
  category: Pick<ArticleCategory, "id" | "name" | "slug"> | null;
  company: Pick<Company, "id" | "name" | "company_type"> | null;
  tags: string[];
};

export type EventType =
  | "webinar"
  | "fam_trip"
  | "roadshow"
  | "conference"
  | "training_day"
  | "networking"
  | "virtual_event"
  | "trade_show";

export type EventDeliveryFormat = "online" | "in_person" | "hybrid";

export type EventStatus =
  | "draft"
  | "published"
  | "cancelled"
  | "hidden"
  | "archived";

export type Event = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  company_id: string | null;
  title: string;
  slug: string;
  description: string;
  event_type: EventType;
  delivery_format: EventDeliveryFormat;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  venue_name: string | null;
  location: string | null;
  registration_url: string | null;
  capacity: number | null;
  image_url: string | null;
  is_featured: boolean;
  visibility: "public" | "members";
  status: EventStatus;
};

export type EventRegistration = {
  id: string;
  created_at: string;
  event_id: string;
  user_id: string;
  note: string | null;
  status: "interested" | "registered" | "cancelled" | "attended";
};

export type EventWithMeta = Event & {
  company: Pick<Company, "id" | "name" | "company_type"> | null;
  creator: Pick<Profile, "id" | "full_name" | "headline" | "role"> | null;
  registration_count: number;
  is_registered_by_current_user: boolean;
};

export type FeedProfile = Pick<
  Profile,
  "id" | "full_name" | "headline" | "role" | "verification_tier"
>;

export type FeedPost = Post & {
  author: FeedProfile | null;
  like_count: number;
  comment_count: number;
  is_liked_by_current_user: boolean;
};

export type FeedComment = Comment & {
  author: Pick<Profile, "id" | "full_name"> | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      companies: {
        Row: Company;
        Insert: Partial<Company> & {
          created_by: string;
          name: string;
          company_type: string;
        };
        Update: Partial<Company>;
        Relationships: [];
      };
      user_roles: {
        Row: UserRole;
        Insert: Partial<UserRole> & {
          user_id: string;
          role: TravelXchangeRole;
        };
        Update: Partial<UserRole>;
        Relationships: [];
      };
      posts: {
        Row: Post;
        Insert: Partial<Post> & {
          created_by: string;
          content: string;
        };
        Update: Partial<Post>;
        Relationships: [];
      };
      comments: {
        Row: Comment;
        Insert: Partial<Comment> & {
          post_id: string;
          created_by: string;
          content: string;
        };
        Update: Partial<Comment>;
        Relationships: [];
      };
      post_likes: {
        Row: PostLike;
        Insert: Partial<PostLike> & {
          post_id: string;
          user_id: string;
        };
        Update: Partial<PostLike>;
        Relationships: [];
      };
      follows: {
        Row: Follow;
        Insert: Partial<Follow> & {
          follower_id: string;
          following_id: string;
        };
        Update: Partial<Follow>;
        Relationships: [];
      };
      profile_experience: {
        Row: ProfileExperience;
        Insert: Partial<ProfileExperience> & {
          profile_id: string;
          title: string;
        };
        Update: Partial<ProfileExperience>;
        Relationships: [];
      };
      profile_specialisms: {
        Row: ProfileSpecialism;
        Insert: Partial<ProfileSpecialism> & {
          profile_id: string;
          name: string;
        };
        Update: Partial<ProfileSpecialism>;
        Relationships: [];
      };
      company_followers: {
        Row: CompanyFollower;
        Insert: Partial<CompanyFollower> & {
          company_id: string;
          user_id: string;
        };
        Update: Partial<CompanyFollower>;
        Relationships: [];
      };
      groups: {
        Row: Group;
        Insert: Partial<Group> & {
          name: string;
          slug: string;
          description: string;
        };
        Update: Partial<Group>;
        Relationships: [];
      };
      group_members: {
        Row: GroupMember;
        Insert: Partial<GroupMember> & {
          group_id: string;
          user_id: string;
        };
        Update: Partial<GroupMember>;
        Relationships: [];
      };
      group_posts: {
        Row: GroupPost;
        Insert: Partial<GroupPost> & {
          group_id: string;
          created_by: string;
          content: string;
        };
        Update: Partial<GroupPost>;
        Relationships: [];
      };
      jobs: {
        Row: Job;
        Insert: Partial<Job> & {
          created_by: string;
          title: string;
          slug: string;
          description: string;
        };
        Update: Partial<Job>;
        Relationships: [];
      };
      job_applications: {
        Row: JobApplication;
        Insert: Partial<JobApplication> & {
          job_id: string;
          user_id: string;
        };
        Update: Partial<JobApplication>;
        Relationships: [];
      };
      job_bookmarks: {
        Row: JobBookmark;
        Insert: Partial<JobBookmark> & {
          job_id: string;
          user_id: string;
        };
        Update: Partial<JobBookmark>;
        Relationships: [];
      };
      article_categories: {
        Row: ArticleCategory;
        Insert: Partial<ArticleCategory> & {
          name: string;
          slug: string;
        };
        Update: Partial<ArticleCategory>;
        Relationships: [];
      };
      articles: {
        Row: Article;
        Insert: Partial<Article> & {
          created_by: string;
          title: string;
          slug: string;
          content: string;
        };
        Update: Partial<Article>;
        Relationships: [];
      };
      article_tags: {
        Row: ArticleTag;
        Insert: Partial<ArticleTag> & {
          article_id: string;
          name: string;
        };
        Update: Partial<ArticleTag>;
        Relationships: [];
      };
      events: {
        Row: Event;
        Insert: Partial<Event> & {
          created_by: string;
          title: string;
          slug: string;
          description: string;
          starts_at: string;
        };
        Update: Partial<Event>;
        Relationships: [];
      };
      event_registrations: {
        Row: EventRegistration;
        Insert: Partial<EventRegistration> & {
          event_id: string;
          user_id: string;
        };
        Update: Partial<EventRegistration>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      travel_xchange_role: TravelXchangeRole;
      verification_tier: VerificationTier;
    };
    CompositeTypes: Record<string, never>;
  };
};
