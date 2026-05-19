# Travel Xchange API Layer

Phase 18 adds a small client-side API layer for future mobile readiness.

The web app currently talks to Supabase directly in many components. The future
Expo app should avoid duplicating that logic screen by screen. Instead, it can
call clear API resources such as feed, jobs, events, messages, and profile.

Current status:

- `client.ts` provides a typed fetch wrapper.
- `resources.ts` groups future mobile API calls by product area.
- The `/api/mobile/*` routes are not built yet.

When the mobile app phase begins, add real Next.js API routes or Supabase edge
functions behind these resource names.
