#!/usr/bin/env node
// Applies the profile-level part of this distribution to an existing DSH profile:
//  - enables the shipped session-search bundle (no installation needed)
//  - appends a managed block to cordis.patch.yml (Russian UI locale)
// Idempotent: safe to re-run after updates.
//
// Usage: node scripts/apply-profile.mjs [--profile <profileDir>]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const i = args.indexOf('--profile');
const profileDir = i >= 0 && args[i + 1]
  ? args[i + 1]
  : (process.env.DSH_PROFILE_DIR || join(homedir(), '.dsh', 'profiles', 'desktop'));

const pkgPath = join(profileDir, 'package.json');
const patchPath = join(profileDir, 'cordis.patch.yml');
if (!existsSync(pkgPath)) {
  console.error(`No package.json in ${profileDir} — launch DeepSeek Harness once to create the profile.`);
  process.exit(1);
}

// 1. shipped bundles that need no pnpm install (resolved from the DSH installation)
const SHIPPED = ['@deepseek-ai/dsh-experimental-session-search'];
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.dsh ??= {};
pkg.dsh.profile ??= {};
pkg.dsh.profile.bundles ??= [];
let added = 0;
for (const name of SHIPPED) {
  if (!pkg.dsh.profile.bundles.includes(name)) { pkg.dsh.profile.bundles.push(name); added++; }
}
if (added) writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`bundles: +${added} (session-search)`);

// 2. managed block in cordis.patch.yml
const BEGIN = '# >>> dsh-powerpack managed block';
const END = '# <<< dsh-powerpack managed block';
const BLOCK = `${BEGIN}
# Russian interface locale. The block is appended by the installer; re-running it
# replaces nothing and duplicates nothing.
- id: locale
  name: "@deepseek-ai/dsh-client-locale"
  config:
    preference: ru
${END}
`;
let patch = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : '';
if (patch.includes(BEGIN)) {
  console.log('cordis.patch.yml: managed block already present');
} else {
  if (patch && !patch.endsWith('\n')) patch += '\n';
  patch += (patch ? '\n' : '') + BLOCK;
  writeFileSync(patchPath, patch, 'utf8');
  console.log('cordis.patch.yml: managed block appended');
}
