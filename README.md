# Treningslogg

A small web app for a household to log the weight or repetitions they lift for an exercise, over time.
The home screen always answers "where am I at?": the latest value per exercise, when it was registered, and the delta since last time.

See `docs/architecture.md` for the full design and `docs/adr/` for the decisions behind it.
`docs/tasks.md` holds the ordered implementation tasks.

## Running locally

Requires Node.js 22 or later.

```bash
npm install
cp .env.example .env
# edit .env and set APP_PASSWORD and SESSION_SECRET
npm run dev
```

This runs the Fastify API on `http://localhost:3000` and the Vite dev server on `http://localhost:5173`, with `/api` proxied to the Fastify process.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Runs the server and the client dev servers together. |
| `npm run build` | Builds the client into `dist/client`. |
| `npm start` | Runs the server; serves the built client when `NODE_ENV=production`. |
| `npm test` | Runs the test suite with Vitest. |
| `npm run typecheck` | Type-checks the client/shared and server/shared code separately. |
| `npm run lint` | Lints the codebase with ESLint. |
| `npm run format` | Formats the codebase with Prettier. |
| `npm run db:generate` | Generates a Drizzle SQL migration from `src/server/db/schema.ts`. |
