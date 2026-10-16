# Real-world verification log

Automated tests cannot replace this. Fill it in on real browsers and devices, with the date. Leave a cell empty until you
have actually run the check.

| Check | Chrome (desktop) | Firefox (desktop) | Android | iPhone | Notes |
|---|---|---|---|---|---|
| App loads from http://localhost via serve.py | | | | | |
| `vendor/sodium.js` loads (Network tab 200) and new vault is Argon2id (Security Center) | | | | | |
| Unlock time with 64 MiB (Settings > Test speed) | | | | | ms: |
| Create vault, save, lock, wrong password, unlock | | | | | |
| Auto-lock after the chosen time | | | | | |
| Show/Copy ask for master password again | | | | | |
| Export backup, wipe, restore; Verify rejects wrong password | | | | | |
| Old PBKDF2 backup restores (if you have one) | | | | | |
| No third-party sign-in scripts requested in Network panel | | | | | |
| Offline: checker, generator, unlock | | | | | |
| Install as app (PWA) | | | | | |
| Keyboard-only run, screen reader spot-check | | | | | |
| Phone layout: menu, forms, nothing overflows | | | | | |
| `python tools/check_headers.py https://your-site/` all PASS | | | | | URL: |
| CSP console shows no violations (try CSP_REPORT_ONLY=1 first) | | | | | |

Tested by: ________  Date: ________  App version / commit: ________

## Automated test results (Windows, 2026-10-16)

Recorded from the project owner's PowerShell output. These are automated results only; the real-browser/device and live-host rows above remain blank until manually completed.

- `npm ping`: PASS (npm registry responded).
- `npm run test:ui`: PASS — Argon2id browser journey, 43 checks; PBKDF2 fallback journey, 40 checks.
- `python -m unittest`: PASS — 32 tests.
- `npm test`: PASS — Python tests plus analyzer parity (28 vectors), vault crypto, breach check, passphrase, static security checks, phishing heuristics (18 cases), Argon2id known-answer vectors (2), and vendor integrity.
- `npm run report`: PASS — all 11 automated report suites passed after the Windows same-file copy issue was corrected.
- `python tools/check_headers.py http://127.0.0.1:8000/`: PASS — all applicable local HTTP header checks passed; HSTS was skipped because the URL uses HTTP.

The Node.js `[DEP0190]` warning appeared after the UI tests but did not cause them to fail. It remains a non-blocking deprecation warning. These results do not constitute an independent security audit or live HTTPS verification.
