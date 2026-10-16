// Run: node tests/vendor.test.mjs  (supply-chain checks for the vendored library)
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const u = f => new URL('../web/' + f, import.meta.url);
const sums = Object.fromEntries(fs.readFileSync(u('vendor/SHA256SUMS'), 'utf8').trim().split('\n').map(l => { const [h, f] = l.trim().split(/\s+/); return [f, h]; }));
for (const [f, h] of Object.entries(sums)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(u('vendor/' + f))).digest('hex'), h, 'hash mismatch: ' + f);
for (const f of ['LICENSE-libsodium-wrappers', 'LICENSE-libsodium-sumo', 'README.md']) assert.ok(fs.existsSync(u('vendor/' + f)), 'missing vendor/' + f);
const code = fs.readFileSync(u('vendor/sodium.js'), 'utf8');
for (const bad of ['new Function', 'eval(', 'importScripts', 'fetch(', 'WebSocket', 'sendBeacon'])
  assert.ok(!code.includes(bad), 'vendored bundle contains ' + bad);
const html = fs.readFileSync(u('index.html'), 'utf8');
assert.ok(html.indexOf('vendor/sodium.js') > 0 && html.indexOf('vendor/sodium.js') < html.indexOf('app.js'), 'sodium.js must load before app.js');
assert.ok(!/<script[^>]*src="https?:/i.test(html), 'index.html must load no third-party script by default');
console.log('vendor integrity tests passed');
