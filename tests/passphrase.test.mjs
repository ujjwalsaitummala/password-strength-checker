// Run: node tests/passphrase.test.mjs  (checks the real word list inside web/app.js)
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
const m = html.match(/const WORDS=\[\.\.\.new Set\("([^"]+)"\.split\(' '\)\)\]/);
assert.ok(m, 'word list not found');
const raw = m[1].split(' '), words = [...new Set(raw)];
assert.equal(raw.length, words.length, 'duplicate words in list');
assert.ok(words.length >= 350, 'list too small');
for (const w of words) assert.match(w, /^[a-z]{3,10}$/, w);
const bitsPerWord = Math.log2(words.length);
assert.ok(7 * bitsPerWord + Math.log2(10) + Math.log2(8) >= 60, '7 words + extras should rate Strong');
console.log('passphrase tests passed:', words.length, 'words,', bitsPerWord.toFixed(2), 'bits/word');
