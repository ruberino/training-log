# ADR-0006: Mobile-first installable web app instead of a native app

- Status: Accepted
- Date: 2026-09-05

## Context

The app is used on a phone in a gym.
It needs a home screen icon, a full-screen feel and fast numeric entry.
It does not need camera, push notifications or offline writes in the MVP.

## Decision

- The React SPA is a Progressive Web App: a `manifest.webmanifest` with name "Treningslogg", `display: standalone`, theme colour and 192/512 px icons, plus the iOS meta tags for home screen installation.
- No service worker in the MVP; the app is online-only and shows a clear error when the network fails.
- Layout is designed for a 360 px wide viewport first, with a bottom navigation bar and 44 px tap targets, and must remain usable on desktop.
- Numeric inputs use `inputmode="decimal"` so the phone shows a numeric keypad.

## Consequences

- One codebase and one deployment for phone and desktop.
- Installation is "Add to Home Screen" in the browser; no app store.
- Without a service worker there is no offline mode; adding one later is additive.
- iOS Safari PWA limitations (cookie lifetime, storage eviction) are accepted; the auth cookie lives one year and re-login is one field.

## Alternatives considered

- React Native or Expo app: a second codebase and a store or sideload process for a household tool.
- Service worker with offline queue from day one: valuable but complex to get right; deferred until the online version is proven.
