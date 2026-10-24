# Real public vacancies

## Running

The API imports the pinned MIT-licensed mherzog4/job-boards Python scanner.
The vacancy collector uses Python's standard library and needs no API keys or
paid ATS accounts. The API's separate CV parser requires `pypdf` and `python-docx`;
the API build installs the locked dependencies with `uv sync --frozen --no-dev`
into `.pythonlibs` using Python 3.13. Keep `vendor/job-boards/` and
`src/jobs/` in the published application alongside the built server.

Development schema: `pnpm --filter @workspace/db run push`.
Publish applies managed production schema changes through the normal Publish flow;
there is no startup DDL. Do not run development schema scripts against production.

## Collection and coverage

- By default all boards in the upstream curated `boards.seed.json` are fetched.
  These are real companies, not all companies or guaranteed Malaysian coverage.
- Searches/matches return cached public vacancy metadata immediately. If the cache
  is absent, stale or partially failed, they request bounded background collection.
- Six boards run concurrently. Upstream backoff/retry is retained with 12-second
  network timeouts and two attempts. A collector is killed after 180 seconds.
- PostgreSQL stores board snapshots and refresh status, surviving restarts.
  An atomic database lease/cooldown prevents duplicate collection across instances.
  A crashed lease expires after 210 seconds. Refresh cooldown is five minutes;
  successful data is considered fresh for six hours. Requests trigger refresh,
  so an inactive app does not perform unattended scraping.
- On success, that board's complete snapshot replaces its previous snapshot.
  Failed, malformed, missing or timed-out boards never erase previous jobs.
  Each job retains its own fetched-at time; partial/stale warnings are explicit.
  Remote eligibility is nullable; a missing flag does not mean an on-site job.
- A supplied email is validated and passed only to that collector subprocess as
  `JOB_SCRAPER_CONTACT`. Blank/missing defaults to `temp@gmail.com`. It identifies
  requests to ATS/archive operators; it does not send email. It is never saved in
  the public cache, shared status, URLs or application logs. A running shared
  refresh isn't restarted for a different user's email; cached jobs are public.
- Subprocesses are spawned without a shell, with a restricted environment; no
  user input can supply board URLs, executable names or scraper arguments.

## Operator-managed boards and discovery

Optionally add `artifacts/api-server/config/boards.json`, an object with `ashby`,
`greenhouse`, `lever` arrays of trusted board slugs. Only this fixed
operator-managed file is read; it is never supplied by a browser. Configure
1–200 boards total per collector to keep the background budget bounded. Restart
the API after changing it; only configured boards appear in responses.

Optional wider discovery (may take many minutes and contacts public archives):

```sh
python3 artifacts/api-server/src/jobs/discover.py \
  --output generated-artifacts/discovered-boards.json
```

Supply a real `JOB_SCRAPER_CONTACT` in your operator environment if available,
otherwise discovery uses the same default. Review the discovered candidates and
select at most 200 slugs for the trusted configuration. There is no public
discovery endpoint. Discovery can miss boards not captured by archives.
Generated discovery files are excluded from Git and publishing.

## API

- `POST /api/workforce/jobs/search`: `{ email?, query?, location?, region?,
  remote?, employmentType?, page?, pageSize? }`. Page starts at 1, maximum page
  size 50; result includes jobs, total, employmentTypes and collection status.
- `POST /api/workforce/jobs/matches`: `{ skills: string[], field?, goal?,
  location?, email?, page?, pageSize? }`. Returns ranked jobs with evidence and
  missing-information notes.
- `POST /api/workforce/jobs/refresh`: `{ email? }`, returns 202 with status even
  if already running/cooling down.
- `GET /api/workforce/jobs/provider-status`: source and collection health, no
  credentials and no user data.

Malformed inputs return 400; unexpected DB/runtime failures return JSON 503.
No fake listings substitute for empty or failed results.

## Matching limits

The general career matching integration ranks
actual title/department/team/location metadata against supplied skills, field,
goal and location (weights 60/20/10/10, normalized over supplied inputs).
Scores are deterministic 0–100 metadata relevance, not probabilities. Evidence
must match real text; absent skills are not confirmed unmet role requirements.
Matches contain at least one actual evidence item. The collector also retains
normalized description text for the separate CV matching flow, which extracts
recognized required skills and explicit experience requirements when available.
CV PDF/DOCX parsing is implemented through the CV API. Salary verification,
visa eligibility, proficiency assessment and geographic eligibility inference
are not implemented. Missing description evidence remains unknown.

Greenhouse's upstream date can be an update timestamp, so UI labels dates as
source posting/update dates. Company strings are board slugs, not verified legal
employer names. Original source links open the actual vacancy.

## Verification

`pnpm --filter @workspace/api-server test` checks contact rules, normalization,
unsafe URLs, source IDs, filtering, relevance, configuration and wrapper failure
semantics without contacting public platforms. The upstream regression tests
remain vendored; documentation-only tests require the upstream documentation.
`pnpm run typecheck` checks the whole application.
