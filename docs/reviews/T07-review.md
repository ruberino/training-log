# Review follow-up: T07 — Treningslogg

Review of commit `ca2dcf9` (T07) on `task/T07-client-shell`, 2026-09-06.
Verdict: approved for fast-forward merge after F1.

## What was verified

All five scripts exit 0 on the branch; 106 tests pass; nothing under `src/client` imports from `src/server`; every file under `test/client/` that runs tests starts with the jsdom pragma.
`fetchJson` sends JSON with `credentials: 'same-origin'`, parses the error body into `ApiRequestError` with `status`, `code`, `details` and `requestId`, returns `undefined` on 204, and calls `onUnauthorized` on a 401 from every path except the login endpoint; five tests cover it.
`useMe`, `useLogin` and `useLogout` exist; logout clears the query cache on settle, so a 401 there counts as logged out.
`App` has the section 8 routes nested under `RequireAuth` and `AppShell`; `RequireAuth` shows `Laster …` while pending and redirects to `/login` on error; the bridge component wires the 401 handler to the router and the query cache.
`AppShell` has the three tabs with the active one highlighted and 44 px touch targets; `LoginPage` has `type="password"`, `autocomplete="current-password"`, and shows `Feil passord` on 401, `Prøv igjen om litt` on 429 and `Noe gikk galt` otherwise; tests cover 401 and 429.
The Vite proxy bypass is the right fix for `src/client/api/` sharing the `/api` prefix; the documented directory name stays.
The RTL cleanup setup file closes a real gap for every future client test, and the README and compose comments now say what was actually verified about hot reload.
All UI text is Norwegian.

## F1 — Required before merge: the toast timer

`showToast` starts a new 3 s timeout on every call and never clears the previous one.
A second toast within 3 s disappears when the first timer fires, and a timer can fire after the provider unmounts.

Steps:

1. Keep the timeout id in a `useRef`; clear it at the start of `showToast` and in a `useEffect` cleanup on unmount.
2. Remove `inputMode="text"` from the password input in `LoginPage`; it has no effect on a password field.
3. Add `test/client/Toast.test.tsx` with `vi.useFakeTimers()`: the text appears after `showToast`, is gone after 3 s, and a second `showToast` at 2 s keeps its text visible at 4 s.

Acceptance: the three assertions pass and `npm test` stays green.

## Done

F1 as a `fix:` commit on the T07 branch, then fast-forward merge and send the hash.
