# Review follow-up: T01 — Treningslogg

Review of commit `a8b6bfe` (T01) and commit `86bdea4` (Docker dev sandbox), both now on `main`, 2026-09-06.
Verdict: T01 is approved and meets every acceptance criterion in `docs/tasks.md`.
The items below are repository hygiene, one scope note, and the dependency policy the architect settled after the review.

Work this on a new branch off `main`, named `chore/T01-review-followup`, and fast-forward merge it into `main` when done; F0 records that rule.
Keep it out of `task/T02-server-skeleton`.
If `git branch --merged main` does not list `task/T02-server-skeleton` when you start, do F0 to F4 now and F5 on a second branch after T02 has landed, so the upgrade does not collide with T02's changes.
The rules in `AGENTS.md` apply.
F0 contains architect-approved text for `docs/architecture.md` and `AGENTS.md`; insert it verbatim and make no other change to those files or to any ADR.
If an item below conflicts with them, stop and ask.

## What was verified

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all exit 0 on `86bdea4`.
`test/shared/dates.test.ts` covers format, calendar validity and leap years, including `2026-02-30` and `2023-02-29`.
The production bundle contains the text "Treningslogg".
Dependencies are pinned to exact versions and match the sibling app `receipt-scanner`, except `@vitejs/plugin-react`; F5 aligns both.

## F0 — Record two architect decisions

Do this first, as its own commit with the subject `docs: record dependency version policy and no-remote merge rule`.
Both decisions were taken by the architect on 2026-09-06 after this review.

1. In `docs/architecture.md` section 3, replace the sentence that starts with "Pin exact versions in `package.json` when scaffolding" with:

```md
The versions in the table are floors, not targets.
Pin exact versions in `package.json` and take the newest stable release on npm for every dependency, including a newer major, unless one of these stops it:

- a peer dependency range of another pinned package excludes it;
- it needs a different Node.js major than the Dockerfile uses, which is an ADR decision, so ask;
- `lint`, `typecheck`, `test` and `build` cannot pass with configuration changes only, or the upgrade contradicts a task or an ADR, so ask;
- the release is a pre-release, or its release notes call it unstable.

In those cases take the newest release that does work and record the reason in the commit body, one line per package.
Dependencies shared with the sibling app are pinned to the same version in both repositories.
```

2. In `AGENTS.md`, replace the bullet that starts with "New dependencies are pinned" with:

```md
- Dependencies are pinned to exact versions at the newest stable release, per the policy in `docs/architecture.md` section 3.
```

3. In `AGENTS.md`, under "Working a task", add this bullet after the "Done means" bullet:

```md
- The repository has no remote yet, so finish a task by fast-forward merging its branch into `main`; rebase onto `main` first when `main` has moved.
  Write what would have been the PR description in the body of the branch's last commit.
```

Acceptance: `git show --stat HEAD` for the docs commit lists exactly `docs/architecture.md` and `AGENTS.md`.

## F1 — Line endings: add `.gitattributes`

Windows checkouts with `core.autocrlf=true` rewrite the working tree to CRLF while the index stays LF.
Today 19 of 35 tracked files are CRLF in the working tree, so `npx prettier --check .` reports 20 files even though the committed content is fine.

Steps:

1. Add `.gitattributes` with the single line `* text=auto eol=lf` and commit it.
2. Confirm `git status --porcelain` prints nothing, then run `git rm -r --cached . -q && git reset --hard -q` so Git rewrites every tracked file with LF.

Acceptance: `git ls-files --eol | grep -v 'i/lf w/lf'` prints nothing.

## F2 — Prettier scope and a check script

`docs/*.md` fail `prettier --check` because Prettier reflows Markdown tables; the docs are owned by the architecture work and are not formatted by Prettier.
There is a `format` script but nothing that verifies formatting, so CI in T14 has nothing to call.

Steps:

1. Add `.prettierignore` with `docs/`, `dist/`, `data/` and `package-lock.json`.
2. Add `"format:check": "prettier --check ."` to `package.json` and to the scripts table in `README.md`.
   Leave `lint` as it is.
3. Run `npm run format:check` and fix anything it reports.

Acceptance: `npm run format:check` exits 0.

## F3 — Docker dev sandbox: document it and stop exposing the Vite dev server on the host

Commit `86bdea4` added `docker-compose.dev.yml` and set `server.host: true` in `vite.config.ts`.
Neither belongs to a task in `docs/tasks.md`, and the file is not in the layout in `docs/architecture.md` section 5, so it must be documented where a developer will find it.
`server.host: true` also makes the dev server listen on every network interface when `npm run dev` runs directly on the host.
The container needs that; the host does not.

Steps:

1. Add a "Docker dev sandbox" subsection to `README.md`: what the file is for, that it is not the production image (T13 owns that), the command `docker compose -f docker-compose.dev.yml up`, and the ports 28300 (API) and 28173 (client).
2. In `vite.config.ts`, replace `host: true` with `host: process.env.DEV_IN_CONTAINER === '1'`, and add `DEV_IN_CONTAINER: '1'` to the `environment` block in `docker-compose.dev.yml`.
3. Add a comment above `APP_PASSWORD` and `SESSION_SECRET` in `docker-compose.dev.yml` saying the values are for the local sandbox only and must never be reused.

Acceptance: `npm run dev:client` on the host prints only a `localhost` URL.
If Docker is available, the client is reachable on `http://localhost:28173` from the container; if not, say so in the commit body.

## F4 — Commit subject style

Two of the three commits on `main` use a plain subject; the docs commit and the sibling app use the `type: subject` form.
From now on use `type: subject` with one of `feat`, `fix`, `chore`, `docs`, `test`.
Leave history as it is.

## F5 — Dependency versions: newest stable release, identical in both apps

T01 pinned the newest release inside each major named in section 3.
The policy recorded in F0 asks for the newest stable release overall, so most of the stack moves up one or more majors.
The sibling app has the same instruction, and every shared dependency must end on the same version in both `package.json` files.

Snapshot of `npm outdated` on 2026-09-06, for orientation only; the registry is the source of truth:

| Package | Pinned | Latest |
| --- | --- | --- |
| `vite` | 7.3.6 | 8.2.2 |
| `vitest` | 3.2.7 | 5.0.0 |
| `@vitejs/plugin-react` | 5.2.0 | 6.1.1 |
| `eslint` | 9.39.5 | 10.10.0 |
| `typescript` | 5.9.3 | 7.0.2 |
| `react-router` | 7.18.3 | 8.3.1 |
| `pino` | 9.14.0 | 10.3.1 |
| `@types/node` | 22.20.1 | 26.4.1 |

Steps:

1. Read `../receipt-scanner/package.json`.
   For every dependency both apps share, pin the version `receipt-scanner` has when it is newer than yours; that repository may have gone first.
2. For the rest, run `npm outdated` and apply the section 3 policy package by package: pin the newest stable release, run `npm install`, run the four scripts.
   Move packages that depend on each other in one step: `vite` with `vitest`, `@vitejs/plugin-react` and `@tailwindcss/vite`; `eslint` with `typescript-eslint` and `eslint-plugin-react-hooks`; `typescript` with `typescript-eslint`.
   The peer dependency ranges of the newest `typescript-eslint` and `@tailwindcss/vite` decide how far `typescript`, `eslint` and `vite` can go.
3. `@types/node` follows the Node.js major in `engines`, so it stays on 22.x until an ADR changes the runtime.
   `jsdom` 30.0.1 is newer than the registry's `latest` tag; keep it.
4. For every major that a rule in section 3 stops, write one line in the commit body naming the package, the version taken and the reason.

Acceptance: the four scripts exit 0; every dependency shared with `receipt-scanner` has the identical version in both `package.json` files; every package that `npm outdated` still lists is named in the commit body.

## Done

All four scripts plus `npm run format:check` exit 0.
The body of the branch's last commit carries the script summary, the skipped-major lines from F5, and anything you noticed but did not change.
Then fast-forward merge the branch into `main`, per the `AGENTS.md` rule from F0.
