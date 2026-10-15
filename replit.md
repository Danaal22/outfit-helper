# Outfit Helper

An editorial-style personal outfit stylist and clothes/shoes catalog.

## Application

- Next.js App Router app: `artifacts/outfit-helper`
- Pages and native Next API routes run in the same process and origin.
- The previous Express service is retired and has no services or workflows.
- The mockup sandbox is design-only and is not required to host the application.
- MongoDB Atlas with Mongoose is the product database. Do not migrate it to PostgreSQL.
- Account passwords use bcrypt; sessions use JWT in an HTTP-only cookie.
- AI uses Gemini: Replit-managed proxy here, or `GEMINI_API_KEY` on external hosts.
- Checkout is disabled because no payment integration was connected.

## Run and verify

- `pnpm --filter @workspace/outfit-helper dev`
- `pnpm --filter @workspace/outfit-helper build`
- `pnpm --filter @workspace/outfit-helper start`
- `pnpm --filter @workspace/outfit-helper seed:catalog` — only seeds an empty catalog
- `pnpm run typecheck` — workspace checks
- `/api/healthz` — public process health, deliberately independent of MongoDB and AI

## Sources of truth

- `lib/api-spec/openapi.yaml` — API contracts; regenerate shared clients after changes
- `artifacts/outfit-helper/src/server` — database, auth, AI, and seed logic
- `artifacts/outfit-helper/src/app` — Next pages, layout, providers, API handlers
- `artifacts/outfit-helper/src/App.tsx` and `src/index.css` — existing editorial UI
- `artifacts/outfit-helper/README.md` — external hosting setup and environment names

## Hosting

Import `artifacts/outfit-helper` as one Next.js project, not multi-service hosting.
Shared generated libraries remain pnpm workspace dependencies, so allow workspace
files outside the selected app root. Required secrets are `MONGODB_URI`, `JWT_SECRET`,
and the relevant server-only Gemini credentials. Never commit actual values.

Preserve existing MongoDB collection names and JWT/cookie formats during future edits
so the framework migration does not invalidate user data or sessions.

## Preview gotcha

The Replit preview proxy uses loopback origins as well as the public development
domain. Keep those development-only origins allowed by Next and keep its HMR
WebSocket paths registered in the artifact service, or preview hydration and hot
reload may stall. These development allowances do not enable cross-origin access
to production account routes.
