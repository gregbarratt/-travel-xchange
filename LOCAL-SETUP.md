# Running Travel Xchange on your own computer

This guide takes you from a blank computer to the site running at
`http://localhost:3000`. It should take about ten minutes.

You do not need Supabase or Stripe keys to get started. The site runs without
them, and the parts that need those services stay switched off until you add
the keys.

## 1. Install Node.js

Node.js is the program that runs the website on your computer.

1. Go to https://nodejs.org
2. Download the **LTS** version.
3. Run the installer and accept the default options.
4. Close and reopen your terminal window afterwards, so it picks up the change.

This project needs **Node 20.9 or newer**. To check what you have, open a
terminal and run:

```bash
node -v
```

If that prints something like `v22.22.2`, you are ready. If it prints a lower
number than `v20.9.0`, or says the command is not found, install the LTS
version again.

> On Windows, "terminal" means PowerShell or Windows Terminal.
> On a Mac, it means the Terminal app.

## 2. Get the code

If you already have the project folder on your computer, skip to step 3.

Otherwise, install Git from https://git-scm.com, then run:

```bash
git clone https://github.com/gregbarratt/-travel-xchange.git
cd -travel-xchange
```

## 3. Run the setup command

From inside the project folder, run:

```bash
npm run setup
```

This one command does everything:

- checks your Node version is new enough
- creates your private `.env.local` settings file
- installs the packages the site needs
- tells you which services are connected and which are not

It is safe to run more than once. It never overwrites an existing `.env.local`,
so your keys are never lost.

## 4. Start the site

```bash
npm run dev
```

Wait for it to print `Ready`, then open this address in your browser:

```text
http://localhost:3000
```

To stop the site, click on the terminal window and press `Ctrl` and `C`
together.

## What works before you add any keys

| Area | Works without keys? |
| --- | --- |
| Home page, pricing, legal pages, coming-soon page | Yes |
| Page layout, navigation, design | Yes |
| Login, registration, profiles, jobs, messages | No — needs Supabase |
| Memberships, checkout, billing | No — needs Stripe |

Pages that need a missing service still load. They show their switched-off state
instead of crashing.

## Adding your keys

Open the `.env.local` file in the project folder with any text editor and
replace the placeholder values.

**Supabase** — turns on login, profiles, jobs, and messages:

1. Open your project at https://supabase.com
2. Go to **Project Settings**, then **API**.
3. Copy these three values into `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The `SUPABASE_SERVICE_ROLE_KEY` is a private admin key. Keep it on your own
computer and never paste it into a web page or a chat message.

**Stripe** — turns on memberships and payments. See the "Stripe setup" section
of `README.md` for which Price IDs to copy.

After changing `.env.local`, stop the site with `Ctrl` + `C` and start it again
with `npm run dev`. Settings are only read at startup.

`.env.local` is ignored by Git, so your keys are never uploaded to GitHub.

## Checking your work

Before saving a phase to GitHub, run these three commands:

```bash
npm test     # runs the automated tests
npm run lint # checks code style
npm run build # makes the production version
```

All three should finish without errors. `npm run lint` currently reports four
warnings about `<img>` tags, which are expected and safe to ignore.

## If something goes wrong

**`npm` is not recognised, or scripts are disabled (Windows)**

Use `npm.cmd` instead of `npm`:

```bash
npm.cmd run setup
npm.cmd run dev
```

**Port 3000 is already in use**

Another program is using that address. Either close it, or start this site on a
different port:

```bash
npm run dev -- --port 3001
```

Then open `http://localhost:3001` instead.

**The setup command fails partway through**

Delete the `node_modules` folder and try once more:

```bash
rm -rf node_modules
npm run setup
```

On Windows PowerShell, use this to delete the folder:

```bash
Remove-Item -Recurse -Force node_modules
```

**Login does nothing, or a page says a service is unavailable**

That service has no keys yet. Run `npm run setup` again and read the list it
prints at step 4 — it names the exact settings that are still missing.

**Changes to `.env.local` are not showing up**

Stop the site and start it again. Settings are only read at startup.
