# Release checklist

Tick every box before demonstrating or publishing.

## Automated (run on your machine)
- [x] `python -m unittest` (currently 32 tests, including security-header checks)
- [x] `npm run report` and read SECURITY_REPORT.md; confirm results reflect this run, and treat any SKIPPED suite as unverified
- [x] `npm test` (analyzer parity, crypto, breach, passphrase, security static checks)
- [x] `npm run test:ui` (runs both browser-journey modes: 43 checks with Argon2id and 40 with the PBKDF2 fallback; requires Node.js and network access for dependency installation)

## Setup and hosting
- [ ] Served over HTTPS (or http://localhost) with the security headers: `curl -I https://your-site/`
- [ ] `python tools/check_headers.py https://your-site/` shows all PASS
- [ ] Network tab: `vendor/sodium.js` loads (200) and a new vault shows Argon2id in Security Center
- [ ] Settings > Test speed on a real phone: Argon2id unlock time is acceptable (about 0.2 to 1.5 s); lower memory if not
- [ ] Network tab confirms no third-party sign-in scripts are requested
- [ ] Tried with `CSP_REPORT_ONLY=1 python serve.py` first; no CSP violations in the browser console
- [ ] Policy enforced and the app works without third-party sign-in scripts

## Manual run in Chrome AND Firefox
- [ ] Create a local vault profile and a master password (a weak one is rejected)
- [ ] Generate a password and a passphrase; save through the "Save this password?" prompt
- [ ] Wrong master password 5 times: pause message appears; correct one still works afterwards
- [ ] Wait for auto-lock (set 1 minute in Settings): vault locks, entries hidden, unlock works
- [ ] Show / Copy ask for the master password again after 60 s; clipboard clears
- [ ] Edit, search, delete an entry; dashboard counts update
- [ ] Check for breaches (internet on) and Security report; report has no passwords or usernames
- [ ] Export backup, delete entries, restore; wrong backup password is refused
- [ ] Sign out; reload; sign in again; data is still there
- [ ] Offline (DevTools > Network > Offline): checker and generator work; "Unlock offline" appears; local vault unlock still works without internet
- [ ] Install as an app (PWA) works
- [ ] Log Reviewed / Password changed / Issue resolved on an entry; "review due" appears and clears
- [ ] Security audit page: run it, read each finding, fix what you can, export the report
- [ ] Verify a backup file (Privacy) says valid for a fresh backup and rejects a wrong password
- [ ] Security Center page reads correctly
- [ ] Learn page: samples, quiz and calculator work
- [ ] Link check: try a real brand, a look-alike and a shortened link; results make sense
- [ ] Activity timeline shows your actions; Privacy page lists stored data; deleting the vault works (use a test account)
- [ ] Account checklist: tick multi-factor on an entry; the dashboard count drops

## Mobile and accessibility
- [ ] Phone-size screen: side menu, forms and buttons are usable, nothing overflows
- [ ] Keyboard only: Tab reaches everything, focus is visible, Enter unlocks, Esc closes menu/report
- [ ] Screen reader announces status messages (spot-check with NVDA or VoiceOver)
- [ ] Settings: animation off, text size large, reduced-motion OS setting respected

## Documentation
- [ ] README, SECURITY.md (limits) and this checklist reviewed; demo script prepared

## Record results
- [ ] Fill in `docs/VERIFICATION_LOG.md` while you test (do not tick it from memory)
