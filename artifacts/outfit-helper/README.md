# Outfit Helper — Next.js

The website and backend run together in **one Next.js App Router application**.
No Express server or separate frontend service is required.

## Hosting on Vercel

Import the repository as a **single project**, not “Services”.

- **Root Directory:** `artifacts/outfit-helper`
- **Framework Preset:** Next.js
- **Install Command:** use automatic pnpm workspace detection (`pnpm install`)
- **Build Command:** `pnpm run build`
- **Output Directory:** leave the Next.js default
- Allow access to workspace files outside the root directory if the host offers this setting.

The repository remains a pnpm workspace because the app shares its generated API
types, Zod validation, and React Query client with local libraries under `lib/`.
Always install dependencies from the repository so workspace packages resolve.
Other workspace artifacts are not required for this deployment.

## Environment variables

Set these in your host's secure environment settings, not in GitHub:

- `MONGODB_URI`: a working MongoDB Atlas connection string. Use a database user's
  credentials, URL-encode special characters, and configure Atlas network access.
- `JWT_SECRET`: a strong random signing secret. Keep the existing value if you
  want existing sessions to remain valid.
- `GEMINI_API_KEY`: for direct Gemini access on an external host.
- `GEMINI_MODEL`: optional; defaults to `gemini-2.5-flash` for direct Gemini.

On Replit, the existing managed `AI_INTEGRATIONS_GEMINI_API_KEY` and
`AI_INTEGRATIONS_GEMINI_BASE_URL` can be used instead of `GEMINI_API_KEY`.
Do not assume Replit-managed credentials are automatically available on another host.
Secrets are read at request time; the application can build without a database or AI login.

## Commands

From the repository root:

```sh
pnpm install
pnpm --filter @workspace/outfit-helper dev
pnpm --filter @workspace/outfit-helper build
pnpm --filter @workspace/outfit-helper start
pnpm --filter @workspace/outfit-helper seed:catalog
```

`PORT` defaults to 3000 outside Replit. The seed command only adds six example
products when the catalog is empty; it never clears existing data.

## API and behavior

Next route handlers serve the existing `/api/products`, `/api/products/:id`,
`/api/auth/*`, `/api/stylist/analyze`, and `/api/healthz` contracts from the same origin.
MongoDB collection/model names, session cookie name, and JWT format are preserved.
Image uploads support JPG/PNG/WebP up to 3 MB to fit common serverless request limits.
Uploads are analyzed in memory and are not persisted to the host filesystem.
The bag stays in browser storage. Checkout remains unavailable; no payment is taken.
