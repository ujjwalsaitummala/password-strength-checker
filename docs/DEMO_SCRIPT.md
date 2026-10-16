# Demonstration script (about 10 minutes)

1. **Checker** (1 min): type `p@ssword`, show Very Weak, the guess times and "Show highlighted breakdown". Type a long
   random passphrase. Click "Check if this password was leaked" (explain the 5-character hash prefix).
2. **Generator** (1 min): password and passphrase modes, then "Save this password?" -> Yes.
3. **Local vault** (2 min): Continue with local vault, create a master password (show the strength bar and the
   12+ rule), save an entry with the checklist, show that Show/Copy ask for the master password again.
4. **Lock and unlock** (1 min): lock, enter a wrong password (message), then the right one. Mention Argon2id and the
   automatic upgrade of older vaults (Settings > Test speed).
5. **Security audit** (2 min): run it, explain score, severity, evidence, fix and "View entries". Show the charts.
6. **Backup** (1 min): Export, then Privacy > "Verify a backup file" (valid, wrong password, damaged file).
7. **Link check** (1 min): `paypa1.com`, `paypal.com.secure-login.net`, `https://www.google.com`. Say it never says "safe".
8. **Security Center + Privacy** (1 min): status overview, what is stored, what contacts the internet.
9. **Evidence** (1 min): `npm test`, `npm run report`, `python tools/check_headers.py <your site>`.

## Likely viva questions
- *Why can't you recover a forgotten master password?* The key comes only from it. Recovery would need a second
  secret or a server. The answer is an encrypted backup.
- *Why Argon2id over PBKDF2?* Memory-hard, so GPUs gain less. Trade-off: library size, WebAssembly CSP, unlock time.
- *Is the library audited?* Not as shipped. See `docs/ARGON2_EVALUATION.md`: I checked three candidates and was explicit.
- *What does AAD do?* Binds a ciphertext to its account and format version, so records cannot be swapped.
- *Why is there no Google sign-in?* This app has no backend, so client-side token decoding would not be trustworthy authentication. The local vault avoids making that claim.
- *What can still go wrong?* XSS or a malicious extension while unlocked, a weak master password, losing browser data
  without a backup. All in SECURITY.md.
- *How did you test?* Python and Node unit tests, shared test vectors across two analyzers, a simulated-browser journey
  (with and without Argon2id), header checks. Real Chrome/Firefox runs are logged in `docs/VERIFICATION_LOG.md`.
- *Is the breach check private?* Yes: k-anonymity, 5 hex characters of a SHA-1 hash, padded response.
- *Is the phishing check reliable?* No. A heuristic over about 30 brands; it flags tricks and never proves safety.
