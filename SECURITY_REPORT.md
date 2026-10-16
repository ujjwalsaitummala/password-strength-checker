# Security regression report

Generated: 2026-10-16 21:42 | Python 3.14.0 on Windows

This report lists **automated test results**. It is not a penetration test and not an independent audit.

## Automated test results

| Suite | Result | Detail |
|---|---|---|
| Python tests (analyzer, privacy rules, security headers, report tool) | PASS | 32 tests |
| Analyzer parity: web vs Python on shared vectors | PASS | analyzer parity tests passed: 28 vectors |
| Vault encryption round trip | PASS | vault crypto tests passed |
| Breach-check hashing and parsing | PASS | breach tests passed |
| Passphrase word list | PASS | passphrase tests passed: 420 words, 8.71 bits/word |
| Static security checks (XSS patterns, inline scripts, hosts) | PASS | security static checks passed |
| Link-check (phishing heuristics) cases | PASS | phish tests passed: 18 cases |
| Argon2id known-answer vectors (vendored libsodium) | PASS | argon2 known-answer tests passed: 2 vectors |
| Vendored library integrity | PASS | vendor integrity tests passed |
| Browser-journey tests (jsdom, real WebCrypto, Argon2id) | PASS | UI journey tests passed (43 checks) |
| Browser-journey tests without Argon2id (PBKDF2 fallback) | PASS | UI journey tests passed (40 checks) |

Summary: 11 passed, 0 failed, 0 skipped.

## Security findings (from SECURITY.md)

### Mitigated or fixed

- #1 Saved passwords readable directly from localStorage (Mitigated: entries are encrypted with AES-256-GCM; plaintext)
- #2 Ciphertext copied between local profiles (Mitigated: authenticated additional data binds records to pr)
- #6 Third-party sign-in token decoded only in browser (Fixed: removed the client-only OAuth flow; no Google/Faceboo)
- #7 Plaintext backup export (Mitigated: backup export is encrypted and import validates t)
- #8 Password sent to breach-check provider (Mitigated by k-anonymity: only a five-character SHA-1 hash p)
- #9 Missing or weak response security headers (Mitigated in local server and provided host configs; actual )
- #12 Unsupported browser or insecure origin (Mitigated by using a current browser over HTTPS or localhost)

### Open, accepted or needing your verification

- #3 Weak master-password guessing (Partly mitigated: Argon2id when available, PBKDF2-SHA256 fallback, strength guid)
- #4 Forgot master password or browser data cleared (Open limitation: no recovery; keep a verified encrypted backup and its password)
- #5 Malicious same-origin script or malware while unlocked (Open risk: can access plaintext in memory; deploy only trusted code and use stri)
- #10 Incorrect analyzer or cryptographic behavior (Partly mitigated by Python/Node tests and browser-journey tests; test success is)
- #11 Unreviewed bundled Argon2 implementation (Open limitation: library integrity and known-answer tests exist, but no independ)

## Manual and deployment verification (not covered by automated tests)

Release checklist items confirmed: 0 of 32. Unticked items are unverified.

## What this report does not cover

- Penetration testing or attacks by a human tester (no pentest findings are included).
- Testing in real Chrome and Firefox, and on real phones.
- Backend authentication and synchronization (not part of this local-first app).
- The hosting environment and external breach-check API.
