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
