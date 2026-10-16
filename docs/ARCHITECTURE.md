# Architecture

Everything runs in the browser. There is no application server or database; `serve.py` is only a static-file development server that adds security headers.

```mermaid
flowchart LR
  U[User] --> UI[Screens: Checker, Generator, Vault, Audit, Link check, Learn, Activity, Privacy, Security Center, Settings]
  UI --> AN[Analyzer: shared rules and test vectors]
  UI --> GEN[Generator: crypto.getRandomValues]
  UI --> VAULT[Vault logic: app.js]
  VAULT -->|master password| KDF[Argon2id via bundled libsodium, or PBKDF2 fallback]
  KDF --> ENC[AES-256-GCM with authenticated additional data]
  ENC --> LS[(localStorage ciphertext)]
  VAULT --> BK[Encrypted backup: export, verify, restore]
  UI -.explicit opt-in.-> HIBP[Pwned Passwords range API: five-character hash prefix]
```

## Trust boundaries
- The local profile name is a namespace/label only, not authentication. The master password is the vault protection.
- Plaintext entries and the derived key exist in memory while the vault is unlocked. Same-origin malicious scripts or device malware can access them.
- On disk, vault records contain ciphertext, salt, IV and KDF parameters. App settings are stored separately and should not contain secrets.
- Network access is not required for analysis, generation or local vault operations. The optional breach check sends a partial SHA-1 hash prefix only.

## Storage formats
- Vault record `mpv3:<profile-id>`: PBKDF2 format v4 or Argon2id format v5; authenticated additional data binds the record to its version and profile ID.
- Backup file: PBKDF2 format v3 or Argon2id format v4; authenticated additional data binds the backup format version.

## Code map
- `web/index.html`: markup and styles; `web/app.js`: application logic; `web/vendor/sodium.js`: bundled libsodium; `web/sw.js`: offline cache.
- `web/_headers` and `hosting/nginx.conf`: deployment security headers; `serve.py`: local server with headers.
- `shared/rules.json` and `shared/test_vectors.json`: analyzer parity; `tests/` and `tests/ui/`: automated tests; `tools/`: report and deployed-header checker.
