const mobileAppConfigExample = {
  expo: {
    name: "Travel Xchange",
    slug: "travel-xchange",
    scheme: "travelxchange",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    extra: {
      supabaseAnonKeyEnv: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      supabaseUrlEnv: "EXPO_PUBLIC_SUPABASE_URL",
    },
  },
};

export default mobileAppConfigExample;
