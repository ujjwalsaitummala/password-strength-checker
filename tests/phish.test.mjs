// Run: node tests/phish.test.mjs  (extracts the phishing-check code from web/app.js)
import fs from 'node:fs';
import assert from 'node:assert/strict';
const js = fs.readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
const a = js.indexOf('/*PH-START*/'), b = js.indexOf('/*PH-END*/');
assert.ok(a > 0 && b > a, 'markers missing');
const { phish } = new Function(js.slice(a, b) + ';return {phish}')();
const cases = [
  ['https://www.google.com/search?q=x', 'none'], ['https://accounts.google.com/signin', 'none'], ['https://sbi.co.in', 'none'], ['https://example.org/', 'none'],
  ['purchase.com', 'none'], ['paypa1.com', 'high'], ['g00gle.com', 'high'], ['micros0ft.com', 'high'], ['paypal.com.secure-login.net', 'high'],
  ['google.com.evil.net', 'high'], ['amazon-verify-account.top', 'high'], ['https://xn--pple-43d.com', 'high'], ['http://192.168.1.5/login', 'high'],
  ['https://user@evil.com', 'high'], ['not a url %%', 'high'], ['goggle.com', 'medium'], ['bit.ly/abc', 'medium'], ['http://example.com', 'medium'],
];
for (const [u, level] of cases) assert.equal(phish(u).level, level, u + ' -> ' + phish(u).level);
assert.equal(phish(''), null);
assert.ok(phish('www.google.com').legit && !phish('paypa1.com').legit);
console.log('phish tests passed:', cases.length, 'cases');
