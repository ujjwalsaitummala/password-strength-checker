# Security notes and limitations

This is a local-first college/portfolio project, not a production-grade password manager. It has no backend, no third-party sign-in, no cross-device synchronization, and no master-password recovery. The local profile name is a namespace/label only, not proof of identity.

## Findings and controls

| # | Finding / threat | Status |
|---|---|---|
| 1 | Saved passwords readable directly from localStorage | Mitigated: entries are encrypted with AES-256-GCM; plaintext is still present in memory while unlocked |
| 2 | Ciphertext copied between local profiles | Mitigated: authenticated additional data binds records to profile ID and format version |
| 3 | Weak master-password guessing | Partly mitigated: Argon2id when available, PBKDF2-SHA256 fallback, strength guidance and in-page throttling; offline guessing remains possible |
| 4 | Forgot master password or browser data cleared | Open limitation: no recovery; keep a verified encrypted backup and its password |
| 5 | Malicious same-origin script or malware while unlocked | Open risk: can access plaintext in memory; deploy only trusted code and use strict headers |
| 6 | Third-party sign-in token decoded only in browser | Fixed: removed the client-only OAuth flow; no Google/Facebook sign-in scripts ship in this release |
| 7 | Plaintext backup export | Mitigated: backup export is encrypted and import validates the file; test restore before relying on a backup |
| 8 | Password sent to breach-check provider | Mitigated by k-anonymity: only a five-character SHA-1 hash prefix is sent after explicit user action; full hash and password are not sent |
| 9 | Missing or weak response security headers | Mitigated in local server and provided host configs; actual deployed host must still be checked with `tools/check_headers.py` |
| 10 | Incorrect analyzer or cryptographic behavior | Partly mitigated by Python/Node tests and browser-journey tests; test success is not a security audit |
| 11 | Unreviewed bundled Argon2 implementation | Open limitation: library integrity and known-answer tests exist, but no independent professional audit was performed |
| 12 | Unsupported browser or insecure origin | Mitigated by using a current browser over HTTPS or localhost; verify actual browsers/devices manually |

## Deployment

- Serve over HTTPS (or `http://localhost` for development).
- Configure `web/_headers` on a compatible static host or use `hosting/nginx.conf` for nginx. GitHub Pages cannot set arbitrary response headers; its meta CSP does not replace all response headers.
- Verify your actual deployed URL with `python tools/check_headers.py https://YOUR-ACTUAL-SITE-URL/`.
- The project has not received an independent security audit. Do not claim it is production-grade or guaranteed secure.
