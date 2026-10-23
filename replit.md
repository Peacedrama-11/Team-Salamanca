# Futurique

A demo career development and workforce intelligence platform for navigating AI-driven changes to work.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/futurique/` — user-facing web application
- `artifacts/futurique/src/` — app routes, components, and theme
- `artifacts/futurique/README.md` — setup and demo limitations

## Architecture decisions

- First release uses session-only synthetic demo data; no database or external API is required to run the prototype.
- Uploaded CVs must remain local to the active session and are not uploaded, read, or analyzed.

## Product

Futurique supports students, fresh graduates, working adults, and HR / L&D managers with career exploration, skill-gap views, learning pathways, illustrative future scenarios, and potential SDG contribution mapping.

## User preferences

- Product name: Futurique.
- Theme colors: black, dark blue, and white.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
