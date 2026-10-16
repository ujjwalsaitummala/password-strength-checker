// Run: node tests/argon2.test.mjs  (known-answer tests for the vendored libsodium Argon2id)
// Expected values were produced by hash-wasm and noble-hashes: all three implementations agree.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
// Run the bundle like a browser would (no Node `process`), in its own context.
const ctx = vm.createContext({ crypto: webcrypto, TextEncoder, TextDecoder, console, setTimeout, clearTimeout });
ctx.window = ctx; ctx.self = ctx;
vm.runInContext(fs.readFileSync(new URL('../web/vendor/sodium.js', import.meta.url), 'utf8'), ctx);
const sodium = ctx.sodium;
await sodium.ready;
const salt = vm.runInContext('new Uint8Array(16).fill(7)', ctx), pw = 'correct horse battery staple';
const hex = a => Buffer.from(a).toString('hex');
const kdf = (t, m) => hex(sodium.crypto_pwhash(32, pw, salt, t, m * 1024, sodium.crypto_pwhash_ALG_ARGON2ID13));
assert.equal(kdf(2, 19456), '799f12b9e17710824482d829835acb69f5a9355bf774c4f07342823b11b90928');
assert.equal(kdf(3, 65536), '6ad10af97f1744119bd7135c85121dc589794f9c5d646200b8ad4d6becf15084');
assert.notEqual(kdf(2, 19456), hex(sodium.crypto_pwhash(32, pw + 'x', salt, 2, 19456 * 1024, sodium.crypto_pwhash_ALG_ARGON2ID13)));
assert.throws(() => sodium.crypto_pwhash(32, pw, vm.runInContext('new Uint8Array(8)', ctx), 2, 19456 * 1024, sodium.crypto_pwhash_ALG_ARGON2ID13));
console.log('argon2 known-answer tests passed: 2 vectors');
process.exit(0);
