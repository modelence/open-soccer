#!/usr/bin/env node
// Runs after `npm install` at the project root. If the user has explicitly
// opted into the mobile app (the studio writes `mobile/.modelence-mobile-enabled`
// when scaffolding via "Create mobile app"), install Expo dependencies inside
// `mobile/` so the project stays usable across fresh clones and CI.
//
// No-ops when:
//   - the `mobile/` folder is absent, or
//   - the marker file is missing (template ships `mobile/` unhooked).

import { existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

const MARKER = 'mobile/.modelence-mobile-enabled';

if (!existsSync(MARKER)) {
  process.exit(0);
}

// Prefer `npm ci` when a lockfile is present: it wipes `mobile/node_modules`
// and installs exactly from `mobile/package-lock.json`, producing a complete,
// deterministic tree. Plain `npm install` against a partially-seeded
// `node_modules` can leave the tree half-populated (e.g. Expo's transitive
// `expo-constants` missing), which surfaces in Expo Go as
// "Unable to resolve module expo-constants ... build/Constants.js does not exist".
// Fall back to `npm install` only when there is no lockfile to install from.
const hasLockfile = existsSync('mobile/package-lock.json');
const command = hasLockfile
  ? 'npm ci --no-audit --no-fund --legacy-peer-deps'
  : 'npm install --no-audit --no-fund --legacy-peer-deps';

console.log(`[postinstall] mobile marker present — installing mobile dependencies (${command})`);
execSync(command, { stdio: 'inherit', cwd: 'mobile' });

// `npm ci` (and any reinstall) deletes and recreates `mobile/node_modules`,
// which invalidates Metro's cached module map. A dev server started against the
// stale cache fails in Expo Go with "App entry not found". Clear the Metro/Expo
// caches so the next `expo start` rebuilds them from the fresh install.
for (const cache of ['mobile/node_modules/.cache', 'mobile/.expo/dev']) {
  rmSync(cache, { recursive: true, force: true });
}
