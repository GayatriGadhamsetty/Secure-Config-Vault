# FreelanceMatch

FreelanceMatch connects clients and independent professionals around a specific project. The web app uses Supabase Auth and Postgres for accounts and marketplace data, with row-level security policies in `supabase/schema.sql`. Gemini-backed project checks, brief generation, fit scoring, and skill-gap plans run only through the Express API server.

## Supabase setup

1. In the Supabase SQL Editor, run `supabase/schema.sql` against a new or dedicated project. It creates the marketplace tables, indexes, Auth profile trigger, row-level security policies, and labeled sample freelancer/project/review records.
2. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as Replit Secrets. For local development, use the values in `.env.example` in a local, untracked environment file.
3. The browser uses only the Supabase publishable/anon key. Never place a Supabase service-role key in frontend code or a `VITE_` variable.

The schema file is provided for review and manual application; this project does not apply SQL to the Supabase account automatically.

## Gemini setup

Add `GEMINI_API_KEY` as a Replit Secret. It is read by `artifacts/api-server` only and is not included in browser code. If it is absent, AI endpoints return a clear unavailable response rather than placeholder recommendations. Requests are rate-limited per client address.

## Run in Replit

The workspace already has workflows for the API server and web app. Start the `API Server` workflow and the `FreelanceMatch` web workflow. The generated API client targets `/api`, which is routed to the Express server in this workspace.

## Main flows

- Register as a client or freelancer, then complete a public profile.
- Clients publish a project, draft a structured brief, review AI project-health advice, and browse freelancers.
- Freelancers browse open projects, compare their skills to a project's needs, add demo work, and submit applications.
- Project participants can use project-context messages and call requests; accepted applications can be tracked as active projects with deliverables and mutual feedback.
- Open demo freelancer profiles, demo projects, and example reviews are clearly labeled and do not require a shared demo password.

## Build checks

```sh
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/freelance-match run typecheck
pnpm --filter @workspace/freelance-match run build
```
