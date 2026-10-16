# Argon2id evaluation

Goal: replace PBKDF2 for the master-password key with Argon2id, keep old vaults and backups working, and be
honest about what is and is not verified.

## Candidates (measured in this project, not just read about)
| Library | Form | Size | Output matches the others | Speed here* |
|---|---|---|---|---|
| libsodium (`libsodium-wrappers-sumo` 0.8.4, ISC) | C library compiled to WebAssembly, asm.js fallback | 1.3 MB bundled | yes | 52 ms (19 MiB, t=2), 213 ms (64 MiB, t=3), 490 ms (128 MiB, t=3) |
| hash-wasm 4.12.0 (MIT) | WebAssembly | 29 KB | yes | 68 / 266 / 543 ms |
| @noble/hashes 2.4.0 (MIT) | pure JavaScript | 25 KB | yes | 391 / 1,640 / 3,068 ms |
*A fast server-class CPU under Node. Phones are usually several times slower (an estimate, not a measurement).
Use Settings > "Test speed on this device" on the devices you care about.

All three produce identical bytes for the same password, salt and parameters on all three parameter sets
(`tests/argon2.test.mjs` pins two of them). The app's own vault record is also opened in the browser-journey test
by an independent implementation (hash-wasm), which is the best evidence that the format is portable.

## "Audited"? What I could verify
- `@noble/hashes` states in its README that its audit covers everything **except** blake3, sha3-addons, sha1 and
  **argon2**. Its Argon2 is explicitly unaudited, and it is slow.
- `hash-wasm`: its README makes no audit claim.
- `libsodium`: the npm package README makes no audit claim either. The libsodium C library has had an independent
  audit (commissioned by Private Internet Access, 2017, per the libsodium documentation; I could not re-check this
  offline), and it is widely deployed and actively maintained. The WebAssembly build and the JavaScript wrapper are
  **not necessarily** covered by that audit.

Conclusion: none of the three is independently audited *as shipped to a browser*. libsodium has the strongest
assurance chain, so it was chosen, but treat "audited implementation" as **not fully met**. Before relying on this
for real secrets, get an independent review of the bundle or move key derivation behind a server you control.

## Decision and parameters
- Argon2id via libsodium `crypto_pwhash`, ALG `ARGON2ID13`, 32-byte output, parallelism 1 (libsodium fixes it).
- Default **64 MiB, 3 passes**. Settings offers 19 MiB with 2 passes (the OWASP minimum) and 128 MiB.
- RFC 9106 lists other recommended sets with more parallelism; a single lane is a deliberate simplification.
- Salt: 16 random bytes per vault and per backup. The derived key is imported as a non-extractable AES-GCM key and
  the raw bytes are zeroed.
- Parameters are bounded on load (8 MiB to 256 MiB, 1 to 10 passes, 1 lane) so a damaged or hostile file cannot
  force huge memory use.

## Compatibility (all tested in `tests/ui/journey.test.mjs`)
- Vault record v4 = PBKDF2 (600,000 rounds), v5 = Argon2id. Both are bound to the account with AES-GCM AAD.
- Existing v4 vaults open normally and **upgrade to v5 automatically at the next unlock** (the master password is
  in hand then). Tested with a PBKDF2 vault created outside the app.
- Backups: v1 to v3 (PBKDF2) still restore (v3 tested); new backups are v4 (Argon2id) when the library loaded.
- If `vendor/sodium.js` fails to load, new vaults and backups fall back to PBKDF2, and an Argon2id vault shows a
  clear message instead of "wrong password". The whole journey test also passes in this fallback mode.

## Costs and risks
- CSP needs `'wasm-unsafe-eval'` in `script-src` (not `'unsafe-eval'`). The bundle has no `eval` or `new Function`.
- One inert string reference to `XMLHttpRequest` exists in Emscripten's worker-only loader; the WebAssembly is
  embedded, so it is not used by this page, and `connect-src` blocks other origins anyway.
- 1.3 MB larger download and offline cache.
- Derivation runs on the main thread, so the page freezes for roughly 0.2 to 1.5 s during unlock. Moving it to a
  Web Worker is a sensible next step.
- 64 MiB of memory may be tight on very old phones; choose 19 MiB there.
- Supply chain: the file is vendored, its SHA-256 is pinned (`tests/vendor.test.mjs`), and rebuild steps are in
  `web/vendor/README.md`. Update it deliberately, never from a CDN.
