# UI journey tests

From the project root, run:

```powershell
npm run test:ui
```

The runner checks for `jsdom`, `fake-indexeddb`, and `hash-wasm` first. It only calls `npm install` when one or more are missing, so rerunning the tests after a successful install does not unnecessarily contact the npm registry.

The command runs both journeys:

- Argon2id enabled (using the bundled `web/vendor/sodium.js` implementation in the app and `hash-wasm` for an independent test vector).
- PBKDF2 fallback (`--no-argon`).

If installation fails with `EAI_AGAIN`, `ENOTFOUND`, or a registry timeout, that indicates npm registry/network resolution failed before the tests ran. It is **not** a passing test and does not by itself indicate an application bug. Fix network access or install the declared dependencies, then rerun the command.

You can also run the modes individually after dependencies are installed:

```powershell
cd tests\ui
npm test
npm run test:fallback
```
