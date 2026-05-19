# Travel Xchange Shared

This package contains small, platform-neutral definitions that can be reused by
the web app now and a future Expo or React Native mobile app later.

It should not import from Next.js, React, browser-only APIs, or server-only
helpers. Keep it simple so mobile can adopt it without pulling in web code.

Phase 18 includes:

- Shared role and verification labels
- Shared route keys and mobile navigation planning
- Shared API result shapes

The future mobile app can import these definitions once the repository is moved
to a proper workspace setup.
