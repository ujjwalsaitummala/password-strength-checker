// Run: node tests/security.test.mjs  (static checks on web/ that guard against XSS and unsafe patterns)
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = f => fs.readFileSync(new URL('../web/' + f, import.meta.url), 'utf8');
const html = read('index.html'), js = read('app.js'), sw = read('sw.js');
for (const bad of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function', 'srcdoc'])
  assert.ok(!js.includes(bad), 'unsafe pattern in web/app.js: ' + bad);
assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), 'inline <script> found; keep code in app.js so the CSP can block inline scripts');
assert.ok(!/\son[a-z]+\s*=/i.test(html), 'inline event handler attribute found');
assert.ok(!/localStorage\.setItem\([^)]*\.pw\b/.test(js), 'plaintext password written to localStorage');
assert.ok(html.includes("object-src 'none'") && html.includes("base-uri 'none'"), 'baseline CSP missing');
for (const host of (html + js).match(/https?:\/\/[^"'\s)]+/g) || [])
  assert.ok(/api\.pwnedpasswords\.com|localhost|www\.w3\.org/.test(host), 'unexpected external host: ' + host);
assert.ok(!/<script[^>]*src="https?:/i.test(html), 'index.html must not load third-party scripts');
assert.ok(!js.includes('function jwt(') && !js.includes('google.accounts.id'), 'client-side OAuth token decoding must not be used as authentication');
assert.ok(!html.includes('accounts.google.com/gsi/client'), 'no Google sign-in script should be present in the local-first release');
assert.ok(sw.includes('u.origin!==location.origin'), 'service worker must ignore cross-origin requests');
console.log('security static checks passed');
