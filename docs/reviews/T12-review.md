# Review follow-up: T12 — Treningslogg

Review of commit `06fb10b` (T12) on `task/T12-pwa-manifest`, 2026-09-06.
Verdict: approved for fast-forward merge after F1 and F2.

## What was verified

All five scripts exit 0 on the branch; 172 tests pass.
`manifest.webmanifest` has `name`, `short_name`, `start_url`, `display: standalone`, `background_color`, `theme_color` and the 192 and 512 px icons; the built `dist/client` carries the manifest and both icon files.
`index.html` has `viewport-fit=cover`, `theme-color`, the two `apple-mobile-web-app-*` tags, and the manifest, apple-touch-icon and favicon links.
The bottom navigation, the main padding and both floating `Registrer` buttons account for `env(safe-area-inset-bottom)`.
The empty-state link that measured 21 px is now a 44 px target; the login form is capped and centred on desktop.
The twelve screenshots under `docs/reviews/screenshots/T12/` show no horizontal overflow at 360 px, and the manifest test plus the production static test cover what can be automated.
The Android and iOS installation checks are recorded as pending, not done; Ruben chose to defer them, and the report says so.

## F1 — Required before merge: the toast is unpositioned

Visible in `mobile-04-status-with-data.png` and `desktop-04-status-with-data.png`: `Lagret` renders as plain text at the bottom-left edge of the document, under the fixed navigation, because `ToastProvider` appends a bare `<div role="status">` after its children.
A toast the user cannot see is not a toast.

Steps: position it `fixed`, horizontally centred, above the navigation (`bottom-[calc(5rem+env(safe-area-inset-bottom))]`), with a dark rounded background, white text and padding; keep `role="status"`.
Add an assertion in `Toast.test.tsx` that the rendered element has the `fixed` class.

## F2 — Required before merge: a pre-commit hook refuses commits on `main`

The commit-on-main slip has happened twice in two tasks; a rule kept in memory is not a guard.

Steps, as their own `chore:` commit:

1. Add `.githooks/pre-commit`, executable, with:

```sh
#!/bin/sh
branch=$(git symbolic-ref --short HEAD 2>/dev/null)
if [ "$branch" = "main" ]; then
  echo "Refusing to commit on main. Create a task branch first." >&2
  exit 1
fi
```

2. Add `"prepare": "git config core.hooksPath .githooks || exit 0"` to `package.json` scripts, so `npm install` on a clone wires the hook and a Docker build without git still succeeds.
3. Run `npm install` once here and verify `git config core.hooksPath` prints `.githooks`; then verify the hook fires by attempting an empty commit on `main` in a scratch clone or by `git stash`-free means such as `git commit --allow-empty` on `main` and expecting the refusal.
4. Add one README line under "Running locally": "`npm install` also installs a git hook that refuses commits on `main`."

Acceptance: `git commit --allow-empty -m test` on `main` is refused; the same command on a task branch succeeds (and is then discarded with `git reset --hard HEAD~1`).

## Recommendation, no action now

On desktop the page content spans the full 1280 px; a `mx-auto w-full max-w-lg` wrapper around the routed content would centre it while leaving the fixed navigation and buttons as they are.

## Done

F1 and F2 as two commits on the T12 branch, then fast-forward merge and send the hashes.
The phone installation checks stay open in this file until Ruben has run them; record his answer here when he does.
