# Password Strength Checker

A local-first password security toolkit for a college project and portfolio. It combines a password analyzer, secure generator, passphrase generator, encrypted local vault, password-health dashboard, breach-check option, phishing-link heuristics, security audit, learning mode, encrypted backup/restore, and a Matrix-themed responsive interface.

## Security model

This release deliberately uses **local profiles only**. There is no backend, no third-party sign-in, no cloud sync, and no master-password recovery. A profile name is just a local label/namespace, not authentication. The master password protects the vault.

- Vault entries use AES-256-GCM with authenticated additional data binding records to their profile ID and format version.
- New vaults use Argon2id via the bundled libsodium library when available, with PBKDF2-SHA256 fallback. Older vaults can be upgraded after successful unlock.
- Vault data is encrypted in browser localStorage. Plaintext entries and the key exist in memory while unlocked, so same-origin malicious scripts or malware can still access them.
- The optional breach check sends only the first five characters of a SHA-1 password hash to the Pwned Passwords range API. The password and full hash are not sent.
- Keep an encrypted backup and its backup password. Losing browser data or forgetting the master password can permanently lose access.
- This is not a professionally audited password manager. Passing automated tests does not prove security; complete `RELEASE_CHECKLIST.md` and record real-browser/deployed-host results in `docs/VERIFICATION_LOG.md`.

## Run locally

Requires Python 3.10+ for the local server and Node.js 20+ for the full automated test suite.

```powershell
python serve.py
```

Open `http://localhost:8000/`, choose **Continue with local vault**, enter a profile name, and create a strong master password. Use localhost or HTTPS so WebCrypto is available. See `SETUP.md` for Windows steps and deployment notes.

## Test

```powershell
python -m unittest
npm test
npm run test:ui
npm run report
```

`npm run test:ui` checks for its test dependencies, installs them only if they are missing, and runs the browser-journey suite with Argon2id and then with the PBKDF2 fallback. If npm fails with `EAI_AGAIN` or `ENOTFOUND`, it could not resolve/reach the registry; check `npm ping` and your network. A skipped suite is unverified, not passed.

## Features

- Password strength scoring, entropy estimates, common-password and pattern detection, suggestions and guessing-time estimates.
- Random password generator and memorable passphrase generator using cryptographic randomness.
- Optional privacy-preserving breach check.
- Local encrypted vault with master-password unlock, inactivity auto-lock, re-authentication before reveal, search, categories, editing, deletion and activity history.
- Password health dashboard for weak/reused entries, security audit and Security Center.
- Versioned encrypted backup export, verification and restore.
- Phishing-link heuristics, learning mode, privacy page, offline PWA support and Matrix animation controls.
- Python CLI analyzer with shared test vectors to keep the Python and browser analyzers aligned.

## Deployment security headers

Use a host that can send HTTP security headers. `web/_headers` is for compatible static hosts; `hosting/nginx.conf` is an nginx example; `serve.py` sends the same baseline headers locally. GitHub Pages cannot set arbitrary response headers, so it is not the preferred host for a security-focused release.

Check the actual deployed URL:

```powershell
python tools/check_headers.py https://YOUR-ACTUAL-SITE-URL/
```

The checker validates response headers and ensures page scripts are same-origin. No live-host verification is claimed until this command has been run against your actual URL.

## Project files

- `web/index.html`, `web/app.js`: interface and application logic.
- `web/vendor/sodium.js`: bundled libsodium used for Argon2id.
- `web/sw.js`: offline cache; `web/_headers`, `hosting/nginx.conf`: deployment headers.
- `password_checker.py`, `shared/rules.json`, `shared/test_vectors.json`: analyzer and shared rules.
- `tests/`, `tests/ui/`: automated tests; `tools/`: security report and deployed-header checker.
- `SECURITY.md`, `docs/ARCHITECTURE.md`, `docs/ARGON2_EVALUATION.md`, `docs/DEMO_SCRIPT.md`: security limitations and presentation support.
