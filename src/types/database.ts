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
