import type { TravelXchangeRole } from "@/types/database";

export const roleOptions: Array<{ label: string; value: TravelXchangeRole }> = [
  { label: "Registered User", value: "registered_user" },
  {
    label: "Verified Travel Professional",
    value: "verified_travel_professional",
  },
  { label: "Supplier", value: "supplier" },
  { label: "Recruiter", value: "recruiter" },
  { label: "Trainer", value: "trainer" },
  { label: "Advertiser", value: "advertiser" },
];

export const companyTypeOptions = [
  { label: "No company yet", value: "" },
  { label: "Travel agency", value: "travel_agency" },
  { label: "Tour operator", value: "tour_operator" },
  { label: "Cruise line", value: "cruise_line" },
  { label: "Airline", value: "airline" },
  { label: "Hotel or accommodation", value: "hotel" },
  { label: "Tourist board", value: "tourist_board" },
  { label: "Recruitment company", value: "recruiter" },
  { label: "Training provider", value: "training_provider" },
  { label: "Travel technology provider", value: "travel_technology" },
  { label: "Advertising partner", value: "advertising_partner" },
  { label: "Other industry partner", value: "other" },
];

export function getRoleLabel(role: TravelXchangeRole) {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}
