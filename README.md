# Travel Xchange

Travel Xchange is a professional community platform for the travel industry.
It will be built phase by phase so each part can be tested, saved, and pushed
to GitHub before the next phase begins.

## Phase 0 status

Phase 0 creates the project foundation only. It does not include real product
features yet.

Built in this phase:

- Next.js app with TypeScript
- Tailwind CSS
- shadcn/ui foundation
- Basic public homepage
- Public placeholder routes for `/about`, `/pricing`, and `/contact`
- Starter folders for shared components, future features, Supabase helpers, and
  shared types
- `.env.example` for future private settings

## Main tools

- Node.js runs the app locally.
- Git tracks each phase as a saved checkpoint.
- GitHub stores the project online.
- Vercel will host the web app later.
- Supabase will provide login, database, and storage later.
- Stripe will provide subscriptions and payments later.

## Project folders

- `src/app` contains website routes and pages.
- `src/components` contains reusable interface pieces.
- `src/config` contains shared site and navigation settings.
- `src/features` is reserved for product features added in later phases.
- `src/lib` contains helper code and future service connections.
- `src/types` contains shared TypeScript types.
- `public` contains public files such as icons and images.

## Local setup

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

On Windows PowerShell, if `npm` is blocked by script permissions, use:

```bash
npm.cmd run dev
```

## Environment settings

Copy `.env.example` to `.env.local` when real service keys are needed.

Do not commit `.env.local` to GitHub. It is for private keys only.

## GitHub workflow

At the end of every phase:

1. Test the app locally.
2. Fix any errors.
3. Save the phase with Git.
4. Push the phase to GitHub.
5. Start the next phase only after the push is complete.
