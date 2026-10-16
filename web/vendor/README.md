# vendor/sodium.js

Argon2id key derivation for the vault comes from **libsodium** (ISC license), the C library compiled to
WebAssembly by the libsodium maintainers and bundled here so the app loads **no code from any CDN**.

- Packages: `libsodium-wrappers-sumo` 0.8.4 and `libsodium-sumo` 0.8.4 (npm)
- Function used: `crypto_pwhash` with `ARGON2ID13` (output 32 bytes, parallelism 1)
- Bundled with esbuild 0.28.2 into one browser file (`window.sodium`). SHA-256 is in `SHA256SUMS`
  and checked by `tests/vendor.test.mjs`.
- Licenses: `LICENSE-libsodium-wrappers`, `LICENSE-libsodium-sumo`.

## Rebuild it yourself (to verify the file)
    mkdir kdf && cd kdf && npm init -y
    npm install libsodium-wrappers-sumo@0.8.4 esbuild@0.28.2
    printf "const sodium = require('libsodium-wrappers-sumo');\nwindow.sodium = sodium;\n" > entry.js
    npx esbuild entry.js --bundle --minify --format=iife --platform=browser \
      --external:node:* --external:fs --external:path --external:crypto --legal-comments=none --outfile=sodium.js
    sha256sum sodium.js
Different esbuild or npm versions may produce a different hash. If so, compare behavior with
`node tests/argon2.test.mjs` and review the diff before replacing the file.

## Requirements and limits
- The page needs `'wasm-unsafe-eval'` in `script-src` (set by `serve.py`, `web/_headers`, `hosting/nginx.conf`).
- The bundle contains no `eval`, `new Function`, network calls or dynamic imports (checked with grep).
- Argon2id output was cross-checked against two other implementations (hash-wasm and noble-hashes):
  all three produce identical bytes for the same inputs.
- Independent audit: see `docs/ARGON2_EVALUATION.md` for exactly what has and has not been audited.
