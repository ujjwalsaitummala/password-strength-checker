// Run: node tests/analyzer.test.mjs
// Checks the web analyzer against the shared rules and the vectors produced by the Python analyzer.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const html = fs.readFileSync(new URL('web/app.js', root), 'utf8');
const rules = JSON.parse(fs.readFileSync(new URL('shared/rules.json', root), 'utf8'));
const vectors = JSON.parse(fs.readFileSync(new URL('shared/test_vectors.json', root), 'utf8'));
const a = html.indexOf('const RULES='), b = html.indexOf('const RC=');
const code = html.slice(a, b) + ';return {analyze,RULES}';
const { analyze, RULES } = new Function(code)();
assert.deepEqual(RULES, rules, 'web rules differ from shared/rules.json');
for (const v of vectors) {
  const r = analyze(v.pw);
  assert.equal(r.r, v.rating, 'rating ' + v.pw);
  assert.deepEqual([...r.kinds].sort(), v.kinds, 'kinds ' + v.pw);
  assert.ok(Math.abs(r.bits - v.bits) < 1e-4, 'bits ' + v.pw + ' ' + r.bits + ' vs ' + v.bits);
}
console.log('analyzer parity tests passed:', vectors.length, 'vectors');
