# Mobile Authentication Flow Plan

This is the planned mobile sign-in flow for a future Expo app.

1. User opens the app.
2. App checks for an existing Supabase session.
3. If no session exists, show login and register screens.
4. After sign-in, check whether the user's Travel Xchange profile exists.
5. If onboarding is incomplete, send the user to mobile onboarding.
6. If onboarding is complete, show the main mobile tabs.
7. Store the Supabase session using secure mobile storage.
8. Use deep links for password reset and email confirmation.

Important future checks:

- Make sure Supabase redirect URLs include the mobile app scheme.
- Do not store service role keys in the mobile app.
- Keep private admin actions on secure server routes.
- Add push notification permission after the user understands the value.
