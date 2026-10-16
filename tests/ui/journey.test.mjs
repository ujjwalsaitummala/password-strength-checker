// Browser-level journey test (jsdom runs the real web/index.html with real WebCrypto).
// Run: cd tests/ui && npm install && npm test
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { indexedDB } from 'fake-indexeddb';
const ARGON = !process.env.NO_ARGON && !process.argv.includes('--no-argon'); // --no-argon works on Windows too
const hw = ARGON ? await import('hash-wasm') : null;

const dir = process.env.WEB_DIR ? new URL('file://' + process.env.WEB_DIR.replace(/\/?$/, '/')) : new URL('../../web/', import.meta.url);
const app = fs.readFileSync(new URL('app.js', dir), 'utf8');
const html = fs.readFileSync(new URL('index.html', dir), 'utf8')
  
  .replace(/<script src="[^"]+"[^>]*><\/script>/g, m => (m.includes('app.js') ? '<script>' + app + '</script>' : (ARGON && m.includes('vendor/sodium.js') ? '<script>' + fs.readFileSync(new URL('vendor/sodium.js', dir), 'utf8') + '</script>' : '')));
const blobs = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost:8000/web/index.html',
  beforeParse(w) {
    Object.defineProperty(w, 'crypto', { value: webcrypto });
    w.indexedDB = indexedDB; w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
    w.matchMedia = () => ({ matches: false });
    w.HTMLCanvasElement.prototype.getContext = () => ({ fillRect() {}, fillText() {}, set fillStyle(v) {}, set font(v) {} });
    w.URL.createObjectURL = b => { blobs.push(b); return 'blob:test'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {};
    Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async () => {} } });
    w.fetch = async () => ({ ok: true, text: async () => '' });
    w.confirm = () => true; w.localStorage.setItem('settings-mpv', JSON.stringify({ mem: 19456 })); // small Argon2 memory keeps the test fast
    w.Blob.prototype.text = function () { return new Promise(r => { const fr = new w.FileReader(); fr.onload = () => r(fr.result); fr.readAsText(this); }); }; // jsdom lacks Blob.text()
  },
});
const w = dom.window, d = w.document, $ = i => d.getElementById(i);
assert.equal($('gbtn'), null, 'third-party sign-in UI must be disabled in local-first release');
assert.ok(!html.includes('accounts.google.com/gsi/client'), 'no Google sign-in script should be loaded');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, label, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return; await sleep(25); } throw new Error('timeout: ' + label); }
const hidden = i => $(i).classList.contains('hide');
const msg = () => $('msg').textContent;
const MASTER = 'Correct-Horse-Battery-9!', PROFILE = 'Test User', UID = 'local:test user';
let prompts = []; w.prompt = () => prompts.shift();
let pass = 0; const ok = n => { pass++; console.log('  ok -', n); };

// 1. checker
$('chk').value = 'p@ssword'; $('chk').dispatchEvent(new w.Event('input'));
assert.match($('rep').textContent, /Very Weak/); assert.ok(!hidden('sug')); assert.ok($('crack').textContent.includes('Offline'));
$('hl').checked = true; $('hl').dispatchEvent(new w.Event('change')); assert.ok(!hidden('hlv')); ok('weak password flagged, suggestion + guess times + highlight shown');
$('chk').value = ''; $('chk').dispatchEvent(new w.Event('input'));

// 2. sign-in -> master password setup
$('lp-name').value = PROFILE; $('lp-go').click();
assert.ok(!hidden('mk')); assert.match($('mkt').textContent, /Create/);
$('mpw').value = 'short'; $('mpw2').value = 'short'; $('mgo').click(); await until(() => /12\+/.test(msg()), 'weak master'); ok('weak master password rejected');
$('mpw').value = MASTER; $('mpw2').value = 'different'; $('mgo').click(); await until(() => /do not match/.test(msg()), 'mismatch'); ok('mismatch rejected');
$('mpw2').value = MASTER; $('mgo').click(); await until(() => !hidden('open'), 'vault open'); ok('master password created, vault opened');

// 3. generate -> save prompt -> save
$('mPp').click(); assert.ok(!hidden('ppopts')); $('gen').click(); assert.ok($('out').textContent.split('-').length >= 7); ok('passphrase generated');
$('mPw').click(); $('gen').click(); const gen = $('out').textContent; assert.equal(gen.length, 16); assert.ok(!hidden('ask')); ok('password generated, save prompt shown');
$('yes').click(); assert.ok(!hidden('sf')); assert.equal($('spw').value, gen);
$('site').value = 'Example'; $('usr').value = 'alice@example.com'; $('save').click();
await until(() => /Saved/.test(msg()), 'saved');
const raw = w.localStorage.getItem('mpv3:' + UID);
assert.ok(raw && !raw.includes(gen) && !raw.includes('Example') && !raw.includes('alice')); ok('entry saved; stored record is ciphertext only');
if (ARGON) {
  const r0 = JSON.parse(w.localStorage.getItem('mpv3:' + UID)); assert.equal(r0.v, 5); assert.equal(r0.kdf, 'argon2id');
  const kb = await hw.argon2id({ password: MASTER, salt: Buffer.from(r0.s, 'base64'), parallelism: r0.p, iterations: r0.t, memorySize: r0.m, hashLength: 32, outputType: 'binary' });
  const ik = await webcrypto.subtle.importKey('raw', kb, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const pt = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(r0.i, 'base64'), additionalData: new TextEncoder().encode('mpv|5|' + UID) }, ik, Buffer.from(r0.d, 'base64'));
  assert.ok(JSON.parse(new TextDecoder().decode(pt)).items.some(x => x.site === 'Example')); ok('vault record opens with an independent Argon2id implementation (hash-wasm)');
}

async function save(site, usr, pw) { w.eval(`pending=${JSON.stringify(pw)};openSave()`); $('site').value = site; $('usr').value = usr; $('save').click(); await until(() => /Saved/.test(msg()) && $('list').textContent.includes(site) || $('list').textContent.length > 0, 'save ' + site); await sleep(60); }
await save('Dup1', 'u', 'aaaaaa'); await save('Dup2', 'u', 'aaaaaa');
assert.match($('dash').textContent, /Weak: 2/); assert.match($('dash').textContent, /Reused: 2/); ok('dashboard counts weak and reused');

// 4. XSS
await save('<img src=x id=pwn onerror=alert(1)>', 'u', 'Zx9!qLm2#Vb7'); assert.equal(d.querySelectorAll('#list img').length, 0); assert.equal($('pwn'), null); ok('HTML in a site name is rendered as text');

// 5. search
$('q').value = 'dup1'; $('q').dispatchEvent(new w.Event('input')); assert.ok($('list').textContent.includes('Dup1') && !$('list').textContent.includes('Example')); $('q').value = ''; $('q').dispatchEvent(new w.Event('input')); ok('search filters entries');

// 6. edit
const btn = (site, label) => [...d.querySelectorAll('#list .e')].find(e => e.textContent.includes(site)).querySelectorAll('button')[['Show','Copy','Log','Edit','Delete'].indexOf(label)];
prompts = ['Example Renamed', 'bob@example.com', 'Banking']; btn('Example', 'Edit').click(); await until(() => /Updated/.test(msg()), 'edit'); assert.ok($('list').textContent.includes('Example Renamed') && $('list').textContent.includes('Banking')); ok('entry edited');

// 7. lock / wrong / right
w.eval("lockVault('Locked')"); assert.ok(!hidden('mk')); assert.ok(hidden('open')); assert.equal($('list').textContent, ''); assert.equal(w.eval('V'), null);
$('mpw').value = 'wrong-master-password!'; $('mgo').click(); await until(() => /Wrong master/.test(msg()), 'wrong'); ok('lock clears vault; wrong master password refused');
$('mpw').value = MASTER; $('mgo').click(); await until(() => !hidden('open'), 'unlock'); assert.ok($('list').textContent.includes('Example Renamed')); ok('unlock restores entries');

// 8. re-auth before reveal
w.eval('V.ok=0'); prompts = ['nope-nope-nope-1']; btn('Dup1', 'Show').click(); await until(() => /Wrong master/.test(msg()), 'reauth wrong');
assert.ok(!$('list').textContent.includes('aaaaaa')); 
w.eval('V.ok=0'); prompts = [MASTER]; btn('Dup1', 'Show').click(); await until(() => $('list').textContent.includes('aaaaaa'), 'reveal'); ok('reveal needs the master password');

// 9. report (no secrets)
$('rptb').click(); const rep = $('rptx').textContent;
assert.ok(rep.includes('Password Security Report') && rep.includes('Dup1') && !rep.includes('aaaaaa') && !rep.includes('alice') && !rep.includes('bob@')); ok('security report lists sites, no passwords or usernames');

// 10. backup / restore
prompts = ['backup-password-123']; blobs.length = 0; $('exp').click(); await until(() => blobs.length, 'export');
const backup = await blobs[0].text(); assert.ok(!backup.includes('aaaaaa') && !backup.includes('Dup1')); assert.equal(JSON.parse(backup).v, ARGON ? 4 : 3);
for (const site of ['Dup1', 'Dup2']) { btn(site, 'Delete').click(); await sleep(120); }
assert.ok(!$('list').textContent.includes('Dup1'));
async function restore(text, pw) { prompts = [pw]; const f = new w.File([text], 'b.json'); Object.defineProperty($('fi'), 'files', { value: [f], configurable: true }); $('fi').dispatchEvent(new w.Event('change')); }
await restore(backup, 'wrong-backup-pass'); await until(() => /Wrong backup/.test(msg()), 'bad restore'); ok('wrong backup password rejected');
await restore('{"junk":1}', 'x'); await until(() => /Not a valid/.test(msg()), 'invalid file'); ok('invalid backup file rejected');
await restore(backup, 'backup-password-123'); await until(() => /Restored/.test(msg()), 'restore'); assert.ok($('list').textContent.includes('Dup1')); ok('encrypted backup restored');

// 10b. review history, self-check, learning mode
prompts = ['2', 'Brand-New-9x!qLm2']; btn('Dup1', 'Log').click(); await until(() => /Logged/.test(msg()), 'log');
assert.ok($('list').textContent.includes('Password changed')); assert.equal(w.eval("V.items.find(x=>x.site==='Dup1').pw"), 'Brand-New-9x!qLm2'); ok('review history logs a password change');
w.eval("V.items.find(x=>x.site==='Dup2').t='2020-01-01';render()"); assert.match($('dash').textContent, /Review due: 1/); assert.ok($('list').textContent.includes('review due')); ok('overdue review is flagged');
prompts = ['3']; btn('Dup2', 'Log').click(); await until(() => /Review due: 0/.test($('dash').textContent), 'resolved'); ok('logging an action clears the reminder');
$('rptb').click(); assert.ok($('rptx').textContent.includes('Recent security actions') && $('rptx').textContent.includes('Issue resolved') && !$('rptx').textContent.includes('Brand-New')); ok('report lists logged actions without passwords');
d.querySelector('#drawer [data-v=audit]').click(); await until(() => $('au-list').children.length > 0 && !/Press|Unlock/.test($('au-list').textContent), 'audit auto-run');
assert.ok($('au-cards').textContent.includes('Password issues')); assert.match($('au-score').textContent, /\/ 100/); assert.ok($('au-list').textContent.includes('weak password')); assert.ok($('au-list').textContent.includes('Evidence:') && $('au-list').textContent.includes('Fix:'));
assert.ok($('au-charts').querySelectorAll('svg').length >= 5); assert.ok($('au-list').textContent.includes('Security headers could not be checked'));
[...$('au-list').querySelectorAll('button')].find(b => b.textContent === 'View entries').click(); assert.ok(!hidden('v-vault') && !hidden('flt') && $('flt').textContent.includes('Showing')); [...$('flt').querySelectorAll('button')][0].click(); assert.ok(hidden('flt'));
blobs.length = 0; d.querySelector('#drawer [data-v=audit]').click(); $('au-exp').click(); const rp = await blobs[0].text(); assert.ok(rp.includes('Security audit report') && !rp.includes('aaaaaa') && !rp.includes('Brand-New') && !rp.includes('alice'));
$('sc-man').querySelector('input').click(); assert.match($('sc-sum').textContent, /Manual: 1 of 6/); ok('security audit: score, findings with evidence and fix, charts, entry filter, export');
d.querySelector('#drawer [data-v=center]').click(); assert.ok(!hidden('v-center') && $('v-center').textContent.includes('no recovery')); ok('security center page');
$('ln-samples').querySelector('button').click(); assert.match($('ln-out').textContent, /bits/); assert.ok($('ln-out').textContent.includes('year'));
[...$('qz').querySelectorAll('button')][0].click(); assert.match($('qz').textContent, /Correct|Not quite/); assert.ok(!$('qz').querySelector('.hide'));
$('lc').value = '12'; $('lc').dispatchEvent(new w.Event('input')); assert.ok($('calc').textContent.includes('12 random characters')); ok('learning mode: sample breakdown, quiz and calculator work');

// 10a. verify backup without touching the vault, AAD binding, local profile
async function verify(text, pw) { prompts = [pw]; const f = new w.File([text], 'b.json'); Object.defineProperty($('vf'), 'files', { value: [f], configurable: true }); $('vf').dispatchEvent(new w.Event('change')); }
const nBefore = w.eval('V.items.length'); await verify(backup, 'backup-password-123'); await until(() => /Backup is valid/.test(msg()), 'verify'); assert.equal(w.eval('V.items.length'), nBefore);
await verify(backup, 'wrong-backup-pass'); await until(() => /Wrong backup/.test(msg()), 'verify wrong'); ok('verify backup checks the file without changing the vault');
const big = new w.File([new Array(5.5 * 1024 * 1024).fill('x').join('')], 'big.json'); Object.defineProperty($('vf'), 'files', { value: [big], configurable: true }); $('vf').dispatchEvent(new w.Event('change')); await until(() => /too large/.test(msg()), 'size limit'); ok('oversized backup file rejected');
const rec = JSON.parse(w.localStorage.getItem('mpv3:' + UID)); assert.equal(rec.v, ARGON ? 5 : 4);
w.eval("lockVault('x')"); w.localStorage.setItem('mpv3:local:other profile', JSON.stringify(rec));
await w.eval("startSession('local:other profile','other profile','Other')"); $('mpw').value = MASTER; $('mgo').click(); await until(() => /Wrong master/.test(msg()), 'aad swap');
assert.equal(w.eval('V'), null); ok('encrypted record copied to another local profile cannot be opened (AAD binding)');
w.localStorage.removeItem('mpv3:local:other profile'); w.eval("lockVault('x',true)");
await w.eval("startSession('local:demo','demo','demo')"); assert.match($('mkt').textContent, /Create/); w.eval("lockVault('x',true)"); ok('local vault profile needs no third-party sign-in');
if (ARGON) {
  const te = new TextEncoder(), lid = 'local:legacy', LP = 'Legacy-master-Pass-77!';
  const ls = webcrypto.getRandomValues(new Uint8Array(16)), li = webcrypto.getRandomValues(new Uint8Array(12));
  const lk = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt: ls, iterations: 600000, hash: 'SHA-256' }, await webcrypto.subtle.importKey('raw', te.encode(LP), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const lc = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv: li, additionalData: te.encode('mpv|4|' + lid) }, lk, te.encode(JSON.stringify({ items: [{ site: 'LegacySite', usr: 'u', pw: 'Legacy-pw-9x!qLm', nt: '', cat: 'General', t: '2026-01-01' }], log: [], sc: [] })));
  w.localStorage.setItem('mpv3:' + lid, JSON.stringify({ v: 4, it: 600000, s: Buffer.from(ls).toString('base64'), i: Buffer.from(li).toString('base64'), d: Buffer.from(lc).toString('base64') }));
  await w.eval(`startSession('${lid}','legacy','Legacy')`); $('mpw').value = LP; $('mgo').click(); await until(() => !hidden('open'), 'legacy unlock');
  assert.ok($('list').textContent.includes('LegacySite')); const up = JSON.parse(w.localStorage.getItem('mpv3:' + lid)); assert.equal(up.v, 5); assert.equal(up.kdf, 'argon2id');
  assert.ok(w.eval('V.log.map(e=>e.d).join()').includes('upgraded to Argon2id')); w.eval("lockVault('x',true)"); ok('an older PBKDF2 vault opens and upgrades to Argon2id automatically');
}
$('lp-name').value = PROFILE; $('lp-go').click(); $('mpw').value = MASTER; $('mgo').click(); await until(() => !hidden('open'), 'reopen'); assert.ok(w.eval('V.items.length') > 0);
if (ARGON) {
  const te = new TextEncoder(), bs = webcrypto.getRandomValues(new Uint8Array(16)), bi = webcrypto.getRandomValues(new Uint8Array(12));
  const bk3 = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt: bs, iterations: 600000, hash: 'SHA-256' }, await webcrypto.subtle.importKey('raw', te.encode('old-backup-pass-123'), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const bc = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv: bi, additionalData: te.encode('mpv-backup|3') }, bk3, te.encode(JSON.stringify([{ site: 'OldBackup', usr: 'u', pw: 'Old-pw-9x!qLm', nt: '', cat: 'General', t: '2026-01-01' }])));
  await restore(JSON.stringify({ v: 3, it: 600000, kdf: 'PBKDF2-SHA256', s: Buffer.from(bs).toString('base64'), i: Buffer.from(bi).toString('base64'), d: Buffer.from(bc).toString('base64') }), 'old-backup-pass-123');
  await until(() => /Restored 1 new entry/.test(msg()), 'v3 backup'); assert.ok($('list').textContent.includes('OldBackup')); ok('a backup made with the older PBKDF2 format still restores');
}

// 10c. checklist, activity timeline, link check, privacy center
const dt = btn('Dup1', 'Log').closest('.e').querySelector('details'); assert.match(dt.querySelector('summary').textContent, /Checklist \d\/6/);
dt.querySelector('input').click(); await until(() => w.eval("V.items.find(x=>x.site==='Dup1').ck&&V.items.find(x=>x.site==='Dup1').ck.mfa") === true, 'mfa tick'); ok('per-account checklist saves a tick');
d.querySelector('#drawer [data-v=act]').click(); assert.ok(!hidden('v-act'));
const act = $('act-list').textContent; assert.ok(act.includes('Saved Example') && act.includes('Unlocked') && act.includes('failed attempt') && act.includes('Checklist updated') && act.includes('Backup restored')); assert.ok(!act.includes('Brand-New') && !act.includes('aaaaaa')); ok('activity timeline lists events without passwords');
d.querySelector('#drawer [data-v=ph]').click(); $('ph-in').value = 'paypa1.com'; $('ph-in').dispatchEvent(new w.Event('input')); assert.match($('ph-out').textContent, /High risk/);
$('ph-in').value = 'https://www.google.com'; $('ph-in').dispatchEvent(new w.Event('input')); assert.match($('ph-out').textContent, /No red flags found/); ok('link check flags look-alikes and never says safe');
d.querySelector('#drawer [data-v=priv]').click(); assert.ok($('pv-list').textContent.includes('Encrypted vault for ' + UID));
$('pv-prefs').click(); assert.equal(w.localStorage.getItem('settings-mpv'), null); assert.ok(w.localStorage.getItem('mpv3:' + UID)); ok('clearing preferences leaves the vault');
prompts = ['no']; w.eval('V.ok=Date.now()'); $('pv-del').click(); await until(() => /cancelled/i.test(msg()), 'del cancel'); assert.ok(w.localStorage.getItem('mpv3:' + UID));
prompts = ['DELETE']; w.eval('V.ok=Date.now()'); $('pv-del').click(); await until(() => w.eval('S') === null, 'deleted');
assert.equal(w.localStorage.getItem('mpv3:' + UID), null); assert.match(msg(), /deleted/); ok('vault deletion needs the exact word and removes the encrypted record');

// 11. sign out removes everything from the screen
$('out2').click(); assert.ok(hidden('open') && !hidden('signin') && w.eval('S') === null); ok('sign out returns to the sign-in screen');

// 13. side menu, three-dot menu, settings
assert.equal($('drawer').classList.contains('open'), false); $('mb').click(); assert.ok($('drawer').classList.contains('open')); assert.equal($('mb').getAttribute('aria-expanded'), 'true');
d.querySelector('#drawer [data-v=gen]').click(); assert.ok(!hidden('v-gen') && !$('drawer').classList.contains('open')); ok('side menu opens, navigates and closes');
d.querySelector('#drawer [data-v=set]').click(); assert.ok(!hidden('v-set')); assert.equal(d.querySelector('[data-v=set]').getAttribute('aria-current'), 'page'); ok('Settings opens from the side menu');
const setv = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('input')); };
setv('s-theme', 'purple'); assert.equal(d.documentElement.style.getPropertyValue('--g'), '#c3a6ff');
setv('s-fs', '18'); assert.equal(d.documentElement.style.getPropertyValue('--fs'), '18px');
setv('s-bl', '5'); assert.equal(d.documentElement.style.getPropertyValue('--bl'), '5px');
setv('s-idle', '15'); assert.equal(w.eval('IDLE'), 15 * 60000);
setv('s-clip', '0'); assert.equal(w.eval('ST.clip'), 0);
setv('s-len', '24'); assert.equal($('len').value, '24'); assert.ok(JSON.parse(w.localStorage.getItem('settings-mpv')).theme === 'purple');
assert.ok(!w.localStorage.getItem('settings-mpv').includes(MASTER)); ok('settings apply live and are saved without secrets');
$('s-reset').click(); assert.equal(d.documentElement.style.getPropertyValue('--g'), '#8fd0ff'); assert.equal(w.eval('ST.idle'), 5); ok('reset restores defaults');

// 12. accessibility basics
assert.equal($('msg').getAttribute('role'), 'status'); assert.ok($('chk').getAttribute('aria-label')); d.querySelector('[data-v=check]').click(); assert.equal(d.querySelector('[data-v=check]').getAttribute('aria-current'), 'page'); ok('status region, labels and aria-current present');
console.log(`UI journey tests passed (${pass} checks)`); w.close(); process.exit(0);
