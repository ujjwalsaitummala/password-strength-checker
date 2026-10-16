// Run: node tests/breach.test.mjs  (mirrors breachCount and the SHA-1 prefix logic in web/index.html)
import { webcrypto as c } from 'node:crypto';
import assert from 'node:assert/strict';
const enc = new TextEncoder();
function breachCount(text, sfx) { for (const l of text.split('\n')) { const [a, n] = l.trim().split(':'); if (a && a.toUpperCase() === sfx) return +n || 0; } return 0; }
const h = [...new Uint8Array(await c.subtle.digest('SHA-1', enc.encode('password')))].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
assert.equal(h, '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
assert.equal(h.slice(0, 5), '5BAA6');
const body = '0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:12345\r\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0\r\n';
assert.equal(breachCount(body, h.slice(5)), 12345);
assert.equal(breachCount(body, 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), 0); // padded fake entry
assert.equal(breachCount(body, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'), 0);
console.log('breach tests passed');
