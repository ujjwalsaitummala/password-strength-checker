import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const deps = ['jsdom', 'fake-indexeddb', 'hash-wasm'];
const missing = deps.filter(name => !fs.existsSync(path.join(here, 'node_modules', name, 'package.json')));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;

function run(command, args, cwd, label, timeout = 120_000) {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    timeout,
    env: process.env,
    windowsHide: true,
    shell: process.platform === 'win32' && /\.(cmd|bat)$/i.test(command),
  });
  if (result.error) {
    console.error(`Could not run ${label}: ${result.error.message}`);
    if (result.error.code === 'ETIMEDOUT') console.error('The command timed out. Check your network and try again.');
    return result.status ?? 1;
  }
  return result.status ?? 1;
}

if (missing.length) {
  console.log(`UI test dependencies missing: ${missing.join(', ')}.`);
  console.log('Installing only because required dependencies are absent. Once installed, reruns do not contact npm unless a dependency is missing.');
  const rc = run(npm, ['install', '--no-audit', '--no-fund', '--fetch-retries=0', '--fetch-timeout=30000'], here, 'install UI test dependencies');
  if (rc !== 0) {
    console.error('\nUI tests could not start because dependency installation failed. This is not a test pass or an application failure.');
    console.error('Check `npm ping`, then rerun `npm run test:ui` when npm registry access is available.');
    process.exit(rc);
  }
}

const stillMissing = deps.filter(name => !fs.existsSync(path.join(here, 'node_modules', name, 'package.json')));
if (stillMissing.length) {
  console.error(`Dependency install finished but these packages are still missing: ${stillMissing.join(', ')}`);
  process.exit(1);
}

for (const [label, args] of [
  ['Argon2id browser journey', ['journey.test.mjs']],
  ['PBKDF2 fallback browser journey', ['journey.test.mjs', '--no-argon']],
]) {
  const rc = run(node, args, here, label);
  if (rc !== 0) process.exit(rc);
}
console.log('\nBoth UI journey modes passed.');
