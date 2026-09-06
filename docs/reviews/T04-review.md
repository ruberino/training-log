# Review follow-up: T04 — Treningslogg

Review of commit `3a5e2c2` (T04), now on `main`, 2026-09-06.
Verdict: approved with required follow-up.
The auth plugin matches ADR-0005 point by point; the remaining items are consistency with the T02 follow-up, two test gaps and one docs record.
Do them in the same round as `docs/reviews/T02-review.md`, before T05 continues.

## What was verified

The password comparison is `timingSafeEqual` over SHA-256 digests; the cookie is `treningslogg_auth` with `hex(HMAC-SHA256(SESSION_SECRET, "treningslogg-v1"))`, `HttpOnly`, `SameSite=Lax`, `Path=/`, one year, and `Secure` only in production.
The guard exempts exactly `/api/auth/login` and `/api/health`; the login route alone is rate limited to 5 per minute with `global: false`; `trustProxy` behaviour is tested both ways; rotating `SESSION_SECRET` invalidates an existing cookie; logout clears the cookie; `loginSchema` is strict.
`test/server/auth.test.ts`, `errors.test.ts` and `health.test.ts` pass in the current tree (16 tests).
The guard reaches every route regardless of registration order: a probe confirmed that an `onRequest` hook added by a `fastify-plugin` wrapped plugin applies to routes registered by earlier plugins as well.

Accepted deviation: the guard runs before routing, so an unauthenticated request to an unknown `/api` path gets `401`, not `404`; T02's not-found case now needs a cookie.
F3 records it.

## F1 — Required: one branch for Fastify 4xx errors, Norwegian default message

`isRateLimitError` and the 429 branch in `app.ts` are the special case of `docs/reviews/T02-review.md` F1.
Implement that general branch and delete `isRateLimitError`.
`RateLimitedError` keeps its class, since `RATE_LIMITED` is in the `ApiError` union, with the default message `For mange forsøk. Prøv igjen om et minutt.` (T02-review F3).

Acceptance: the sixth login attempt still returns `429 RATE_LIMITED`, and the body message is the Norwegian default.

## F2 — Required: tests for the login body

Section 7 says every body is validated with zod and unknown properties are rejected.
`loginSchema` is strict but no test exercises it.

Steps:

1. Add `.min(1).max(200)` to `password` in `loginSchema`.
2. Add tests: `{}` returns `400 VALIDATION_ERROR` with `details` naming `password`; `{ password: 123 }` returns 400; `{ password: 'x', extra: 1 }` returns 400; an empty password returns 400.

Acceptance: the four tests pass and the existing login tests stay green.

## F3 — Required: record the deviation and the per-route 401 test in the docs commit

Add to the F0 docs commit, verbatim.

In `docs/architecture.md` section 9, "Authentication (ADR-0005)", after the bullet that starts with "The guard is an `onRequest` hook":

```md
- The guard runs before routing, so an unauthenticated request to an unknown `/api` path gets `401`, not `404`.
```

In `AGENTS.md`, "Conventions that apply to every task", after the bullet that starts with "Request and response shapes":

```md
- Every API test file has one test that its endpoint returns `401` without the cookie.
```

`test/server/exercises.test.ts` in T05 is the first file this applies to.

## F4 — Note for T07

Logout is behind the guard, as ADR-0005 lists only login and health as exempt.
A client whose cookie is already invalid gets `401` from logout; the client shell in T07 treats that as logged out.

## Done

With the T02 follow-up round: all four scripts plus `npm run format:check` exit 0, commit bodies carry the summaries, fast-forward merge into `main`.
