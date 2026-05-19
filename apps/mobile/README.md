# Travel Xchange Mobile Preparation

Phase 18 does not build the mobile app. It creates a safe place for the future
Expo app plan so the web app can keep moving without being disrupted.

Future mobile app target:

- Expo with React Native and TypeScript
- Supabase Auth for login
- The same profile, role, verification, feed, groups, jobs, events, training,
  support, messages, and notification concepts as the web app
- Shared definitions from `packages/shared`
- API calls through `src/lib/api` or matching mobile-safe service wrappers

Do not install Expo dependencies yet. That should happen in the dedicated mobile
build phase when the web MVP is more stable.

## Suggested future setup

When it is time to build the mobile app:

1. Convert the repo to a simple workspace setup.
2. Create the Expo app in this folder.
3. Connect the mobile app to Supabase using the same project URL and anon key.
4. Reuse shared role, verification, navigation, and API result definitions.
5. Build login, onboarding, dashboard tabs, and push notifications step by step.

## First mobile screens to build later

- Welcome and login
- Register
- Onboarding
- Home feed
- Search
- Messages
- Notifications
- Profile
