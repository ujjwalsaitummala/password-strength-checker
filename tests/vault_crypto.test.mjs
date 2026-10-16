// Run: node tests/vault_crypto.test.mjs  (mirrors the vault's key derivation + AES-GCM logic)
import { webcrypto as c } from 'node:crypto';
import assert from 'node:assert/strict';
const enc = new TextEncoder(), dec = new TextDecoder();
async function mkKey(pw, salt, it) {
  const k = await c.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return c.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: it, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const salt = c.getRandomValues(new Uint8Array(16)), iv = c.getRandomValues(new Uint8Array(12));
const data = JSON.stringify([{ site: 'x', pw: 'secret' }]);
const ct = await c.subtle.encrypt({ name: 'AES-GCM', iv }, await mkKey('correct horse 1234', salt, 600000), enc.encode(data));
assert.equal(dec.decode(await c.subtle.decrypt({ name: 'AES-GCM', iv }, await mkKey('correct horse 1234', salt, 600000), ct)), data);
await assert.rejects(c.subtle.decrypt({ name: 'AES-GCM', iv }, await mkKey('wrong password 99', salt, 600000), ct));
const bad = new Uint8Array(ct); bad[0] ^= 1;
await assert.rejects(c.subtle.decrypt({ name: 'AES-GCM', iv }, await mkKey('correct horse 1234', salt, 600000), bad));
// AAD binds a record to its account and format version
const aad = id => enc.encode('mpv|4|' + id);
const ct2 = await c.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad('google:a@gmail.com') }, await mkKey('correct horse 1234', salt, 600000), enc.encode(data));
assert.equal(dec.decode(await c.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad('google:a@gmail.com') }, await mkKey('correct horse 1234', salt, 600000), ct2)), data);
await assert.rejects(c.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad('google:b@gmail.com') }, await mkKey('correct horse 1234', salt, 600000), ct2));
await assert.rejects(c.subtle.decrypt({ name: 'AES-GCM', iv }, await mkKey('correct horse 1234', salt, 600000), ct2));
console.log('vault crypto tests passed');
