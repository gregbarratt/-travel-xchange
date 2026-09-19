#!/usr/bin/env node

// One-command local setup for Travel Xchange.
// Run with: npm run setup
//
// This checks Node, creates .env.local, installs packages, and reports which
// services are connected. It never overwrites an existing .env.local.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const envExamplePath = join(projectRoot, ".env.example");
const envLocalPath = join(projectRoot, ".env.local");

const MINIMUM_NODE_VERSION = [20, 9, 0];

let hasWarning = false;

function step(message) {
  console.log(`\n${message}`);
}

function ok(message) {
  console.log(`  OK   ${message}`);
}

function warn(message) {
  hasWarning = true;
  console.log(`  NOTE ${message}`);
}

function fail(message) {
  console.error(`\nSetup stopped: ${message}\n`);
  process.exit(1);
}

function checkNodeVersion() {
  step("1. Checking Node.js");

  const current = process.versions.node.split(".").map(Number);
  const required = MINIMUM_NODE_VERSION.join(".");

  for (let index = 0; index < MINIMUM_NODE_VERSION.length; index += 1) {
    const currentPart = current[index] ?? 0;
    const requiredPart = MINIMUM_NODE_VERSION[index];

    if (currentPart > requiredPart) break;
    if (currentPart < requiredPart) {
      fail(
        `Node ${required} or newer is needed, but this computer has ${process.versions.node}.\n` +
          "Install the latest LTS release from https://nodejs.org and run npm run setup again.",
      );
    }
  }

  ok(`Node ${process.versions.node}`);
}

function createEnvFile() {
  step("2. Preparing .env.local");

  if (existsSync(envLocalPath)) {
    ok(".env.local already exists, leaving it untouched");
    return;
  }

  if (!existsSync(envExamplePath)) {
    fail(".env.example is missing, so .env.local cannot be created.");
  }

  copyFileSync(envExamplePath, envLocalPath);
  ok("Created .env.local from .env.example");
}

function installDependencies() {
  step("3. Installing packages (this can take a minute)");

  const result = spawnSync("npm", ["install", "--no-audit", "--no-fund"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    fail("npm install did not finish. Scroll up to see the error and try again.");
  }

  ok("Packages installed");
}

// Reads .env.local directly rather than process.env, because Next.js loads that
// file at run time and this script does not.
function readEnvLocal() {
  const values = new Map();

  for (const line of readFileSync(envLocalPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    values.set(key, value);
  }

  return values;
}

// A key counts as unset when it is blank or still holds an .env.example placeholder.
function isPlaceholder(value) {
  if (!value) return true;

  return [
    "your-project-ref",
    "your-supabase-anon-key",
    "server-only-never-share",
  ].some((placeholder) => value.includes(placeholder));
}

function reportServices() {
  step("4. Checking connected services");

  const env = readEnvLocal();

  const services = [
    {
      name: "Supabase (login, profiles, jobs, messages)",
      keys: [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
      ],
    },
    {
      name: "Stripe (memberships and payments)",
      keys: ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
    },
  ];

  for (const service of services) {
    const missing = service.keys.filter((key) => isPlaceholder(env.get(key)));

    if (missing.length === 0) {
      ok(service.name);
    } else {
      warn(`${service.name} is not connected yet — add ${missing.join(", ")} to .env.local`);
    }
  }
}

function printNextSteps() {
  console.log("\n----------------------------------------------------------");
  console.log("Setup finished. Start the app with:\n");
  console.log("  npm run dev\n");
  console.log("Then open http://localhost:3000 in your browser.");
  console.log("Press Ctrl+C in this window to stop the app.");

  if (hasWarning) {
    console.log(
      "\nThe pages above marked NOTE still load, but anything needing that\n" +
        "service will be switched off until its keys are added to .env.local.\n" +
        "See LOCAL-SETUP.md for where to find those keys.",
    );
  }

  console.log("----------------------------------------------------------\n");
}

console.log("Travel Xchange — local setup");

checkNodeVersion();
createEnvFile();
installDependencies();
reportServices();
printNextSteps();
