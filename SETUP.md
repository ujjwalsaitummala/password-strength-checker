# Setup

This is a **local-first password security tool**. It does not use Google/Facebook sign-in or any third-party identity provider. A profile name only identifies a vault on this browser; the master password protects the encrypted vault. Do not treat the profile name as authentication.

## Run on Windows
1. Install Python 3.10+ and Node.js 20+ (Node is needed for automated tests).
2. Double-click `run.bat` and choose the local server option, or open PowerShell in this folder and run `python serve.py`.
3. Open `http://localhost:8000/` in a current browser.
4. Choose **Continue with local vault**, enter a profile name, and create a strong master password.

Use `http://localhost` or HTTPS; browser encryption APIs are unavailable on many insecure origins. The server sends a strict Content Security Policy and other security headers.

## Run tests
From the project root:

```powershell
python -m unittest
npm test
npm run test:ui
npm run report
```

The UI tests require npm to download `jsdom`, `fake-indexeddb`, and `hash-wasm`. If installation fails with `EAI_AGAIN` or `ENOTFOUND`, check `npm ping` and your DNS/network before retrying. Do not mark skipped browser tests as passed.

## Deploy
Host the `web/` folder on an HTTPS static host that supports the headers in `web/_headers`, or configure the equivalent in your server using `hosting/nginx.conf`. GitHub Pages cannot send custom HTTP security headers; for a security-focused release, use a host that can. Verify your deployed URL with:

```powershell
python tools/check_headers.py https://YOUR-ACTUAL-SITE-URL/
```

## Important limitations
- Data is stored in this browser. Clearing site data or losing the backup and its password may permanently lose access.
- There is no backend, account synchronization, or master-password recovery.
- The optional breach check sends only the first five characters of a SHA-1 password hash to the Pwned Passwords range API.
- This project has not had an independent security audit. Passing tests do not guarantee security.
