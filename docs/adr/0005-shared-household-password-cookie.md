# ADR-0005: Shared household password with a signed cookie, no user accounts

- Status: Accepted
- Date: 2026-09-05

## Context

The app is used by one household and exposed on the public internet through Render.
It must not be open to the world, but user accounts, password resets and roles are far more than the need.
`sissel` uses the same pattern with `APP_PASSWORD` and a one-year cookie, and it has worked well.

## Decision

- One shared password from the `APP_PASSWORD` environment variable, minimum 8 characters, required in every environment.
- `POST /api/auth/login` compares the submitted password with `crypto.timingSafeEqual` over SHA-256 digests, so the comparison is constant-time and length-independent.
- On success the server sets the cookie `treningslogg_auth` with value `hex(HMAC-SHA256(SESSION_SECRET, "treningslogg-v1"))`.
- Cookie attributes: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` 365 days, `Secure` in production.
- An `onRequest` guard on `/api/*` recomputes the expected value and compares with `timingSafeEqual`; `/api/auth/login` and `/api/health` are exempt.
- Login is rate limited to 5 attempts per minute per IP with `@fastify/rate-limit`.
- Rotating `SESSION_SECRET` invalidates every cookie; that is the logout-everyone mechanism.
- Static assets are public; all data is behind `/api`.

## Consequences

- No user table, no session table, no password reset flow.
- All household members see the same data; per-person data is out of scope by design.
- Brute-force protection relies on the rate limit and a strong password; the password must be at least 8 characters and should be generated.
- The scheme is stateless, so a database restore never affects logins.

## Alternatives considered

- Personal accounts with email and password: needed only if data must be per person, which it is not.
- No auth on a private network or VPN: rules out using the app on mobile data at the gym.
- Third-party login (Google, Vipps): more setup and a dependency for a household tool.
- A random session token stored in the database: adds a table and cleanup for no security gain at one shared secret.
