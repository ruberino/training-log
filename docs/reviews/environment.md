# Environment notes

Facts about this machine and the toolchain that tasks depend on.
Verified by the reviewing agent on 2026-09-06 in a clean checkout; the machine runs Windows 11, Node 24.14.0 and npm 11.9.0.

## E1 — `npm ci` with npm 11 fails on `better-sqlite3` 13.0.3; the fix is npm 12

- `better-sqlite3` 13 ships prebuilt binaries inside the package under `prebuilds/<platform>-<arch>.node` and has no install script; `lib/binding.js` falls back to them when `build/Release` is missing.
- npm 11.9 still runs `node-gyp rebuild` for the package on `npm ci`, ignoring its `gypfile: false`, and the build fails on a machine without Python and MSVC with `gyp ERR! find Python`.
- npm 12.0.2 skips install scripts by default, prints `npm warn install-scripts better-sqlite3@13.0.3 (install: node-gyp rebuild)`, and `npm ci` exits 0; the module then loads from the bundled prebuild.
- `node:22-alpine`, the production base image, carries npm 10 and no compiler, so the Dockerfile must install npm 12 in every stage that runs `npm ci`.
- npm 12 declares `engines.node` as `^22.22.2 || ^24.15.0 || >=26.0.0`, so `node:22-alpine` images from 22.22.2 on take it cleanly, while this host on Node 24.14.0 can only install it globally with `--force`.
  Until the host runs Node 24.15 or newer, `npx npm@12 ci` works without a global install (verified 2026-09-06); the README states both.

Consequences for tasks: `engines.npm >= 12` and a README requirement (T03 follow-up F2 in this repository); the Dockerfile in T13 runs `npm install -g npm@12` before `npm ci`; the CI workflow in T14 runs `npm install -g npm@12` before `npm ci`.

## E2 — The first Fastify test on a cold module cache exceeds Vitest's 5 s default timeout

Reproduced on a fresh `node_modules`: the first `app.inject()` test timed out at 5 s, the second run took 160 ms, identical with the `forks` and `threads` pools.
The pool is not the cause; Vitest 3 already defaults to `forks`.
Mitigation: `testTimeout: 15000` in `vitest.config.ts` (T02 follow-up F2).
