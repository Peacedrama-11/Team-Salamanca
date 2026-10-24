# Futurique

> Explore career opportunities, understand your skills, and choose practical learning paths as AI changes the world of work.

Futurique is a hackathon prototype for students, fresh graduates, working adults, and HR / Learning & Development teams. It brings public vacancies, explainable CV-to-job matching, learning roadmaps, and Malaysian labour-market information into one workspace.

## Team Information

| Field | Details |
| --- | --- |
| Team Name | Team Salamanca |
| Team Domain | Domain 1 |
| SDG Track (1–17) | SDG 4 & SDG 8 |
| Team Leader | CHARUMATHI SATHIA GUNALAN |
| University | Universti Teknologi Petronas, Universiti Teknologi Malaysia, Asia Pacific University, Xiamen University Malaysia |
| Number of Members | 5 |

## Links

| Resource | Link / Status |
| --- | --- |
| GitHub Repository | [Team-Salamanca](https://github.com/Peacedrama-11/Team-Salamanca) |
| Replit Project | [Futurique](https://replit.com/@muhammadusmanvv/Futurique-Usman) |
| RunPod Endpoint | Not used |
| Slide Deck | [View Presentation Slides](./submission/Futurique-PitchDeck.pdf) |
| Demo Video |[DemoFuturique](https://youtu.be/7zbv6RgGbJw?si=BRsdh08jJeWYzZ0t) |

## Overview

### Problem

Students and workers face difficult choices about what to learn and how to prepare for changing roles. Job listings, learning resources, and labour-market information are often scattered across different services. HR and L&D teams also need accessible ways to discuss workforce skills and reskilling opportunities.

### Solution

Futurique connects career exploration with a concrete next step: review a skills profile, explore actual vacancies, and select a learning path. Users can compare hypothetical AI adoption scenarios and reflect on how their work could contribute to the Sustainable Development Goals.

The current implementation uses deterministic rules and dictionary-based extraction. It does not call an LLM or a RunPod endpoint. Model inference is a future extension; the working prototype focuses on transparent results and clear data sources.

### Key Features

- **Four role-based dashboards:** Dedicated demo workspaces for students, graduates, working adults, and HR / L&D managers.
- **Public job exploration:** Search and filter cached vacancies from Ashby, Greenhouse, and Lever, with original listing links and collection status.
- **CV-to-job matching:** Extract skills from PDF or DOCX files up to 8 MB, review and edit the profile, and compare it with cached job requirements. Manual skill entry is also supported.
- **Explainable comparisons:** View matched and missing recognized requirements, evidence, and experience status. Unknown requirements remain explicitly unknown.
- **Learning roadmaps:** Choose from 15 roadmap.sh paths or answer a three-question recommendation flow. Track selections and start/stop status in this browser.
- **Career Crash Test:** Compare gradual AI adoption with faster workflow redesign through hypothetical scenarios, suggested skills, and actions.
- **Workforce information:** Explore Malaysia's monthly Labour Force Survey data through data.gov.my, alongside labelled illustrative workforce views.
- **HR and SDG exploration:** Try sample candidate reviews, a workforce skills matrix, learning assignments, and potential connections to all 17 SDGs.
- **Language selection:** English, Bahasa Melayu, and Chinese interface options.

### Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, Radix UI, Wouter |
| Data fetching and charts | TanStack Query, Recharts |
| Backend | Node.js 24, Express 5, TypeScript, esbuild |
| Database | PostgreSQL 16, Drizzle ORM |
| CV extraction | Python 3.13, pypdf, python-docx |
| Matching and recommendations | Dictionary extraction and deterministic scoring rules |
| API contracts | OpenAPI, Orval, generated React hooks and Zod schemas |
| External data | Ashby, Greenhouse, Lever, data.gov.my |
| Development environment | Replit, pnpm workspaces, uv |

### Current Scope and Data Handling

- Public vacancies are cached in PostgreSQL. Collection is bounded and request-triggered, and coverage may be partial or stale. Empty results are not replaced with fictional jobs.
- General career matches use profile inputs and vacancy metadata. CV matching separately uses recognized required skills from available descriptions: `matched required skills / recognized required skills × 100`. Scores are relevance or overlap measures, not hiring probabilities or proficiency assessments.
- CV extraction sends the document to the API for in-memory parsing. Raw documents are not saved to the database. Use synthetic sample CVs for demonstrations; scanned PDFs have no OCR support.
- Confirmed CV skills and learning selections can persist in browser local storage, scoped by the entered demo email. General dashboard profiles and HR records use demo state. Email scoping does not provide authentication or cross-device accounts.
- An optional demo email may be passed to public job providers as scraper contact during collection. Blank input defaults to `temp@gmail.com`; this is not an email delivery feature.
- Google sign-in and model-based AI features are not configured. Career scenarios, HR ratings, and SDG connections are illustrative rather than verified forecasts, assessments, or impact measurements.

## Project Structure

```text
.
├── artifacts/
│   ├── futurique/              # Main React web application
│   ├── api-server/             # Express API, Python jobs, and API tests
│   │   ├── src/jobs/           # Vacancy collection and CV document parsing
│   │   └── vendor/job-boards/  # Pinned upstream scanner and its MIT license
│   └── mockup-sandbox/         # Replit mockup / preview workspace
├── lib/
│   ├── api-spec/               # OpenAPI contract and Orval configuration
│   ├── api-client-react/       # Generated frontend API client
│   ├── api-zod/                # Generated validation schemas and types
│   └── db/                     # Drizzle schema and PostgreSQL connection
├── scripts/                    # Workspace utilities
├── submission/                 # Submission document instructions
├── .env.example                # Local environment variable reference
├── .replit                     # Replit runtime configuration
├── Caddyfile.local             # Optional local web / API routing
├── pnpm-workspace.yaml         # Workspace and dependency settings
├── pyproject.toml              # Python dependencies
└── README.md
```

### Architecture

```text
Browser: React / Vite
    │
    ├── Local storage: confirmed CV skills and selected learning paths
    │
    └── /api → Express API
                   ├── PostgreSQL: public vacancy cache and refresh state
                   ├── Python collector → Ashby / Greenhouse / Lever
                   ├── Python parser → temporary PDF / DOCX text extraction
                   ├── Rule-based job and skill matching
                   └── data.gov.my → Malaysian labour-market observations
```

Replit routes the web and API services under one application origin. RunPod is not part of the current request flow.

## How to Run

### Option 1 — Replit

1. Import this GitHub repository into Replit.
2. Use the runtimes in `.replit`: Node.js 24, Python 3.13, and PostgreSQL 16. Ensure `pnpm` and `uv` are available.
3. Provision a development PostgreSQL database and set `DATABASE_URL` in Replit Secrets.
4. Run `pnpm install --frozen-lockfile`, then `pnpm --filter @workspace/db run push` against that development database.
5. Start both services through Replit's artifact workflows. The web artifact supplies `PORT=21740` and `BASE_PATH=/`; the API artifact uses port `8080`. If the imported Run workflow is missing, start the services in separate shells:

   ```bash
   # API shell
   PORT=8080 pnpm --filter @workspace/api-server run dev

   # Web shell
   PORT=21740 BASE_PATH=/ pnpm --filter @workspace/futurique run dev
   ```

6. Open the web preview, enter demo mode, and choose a role. Visit the jobs view to populate the vacancy cache before trying CV matches.

The API build runs `uv sync --frozen --no-dev` into `.pythonlibs`. Keep the Python scripts and vendored scanner available beside the built API. No external AI API key is required for current features.

### Option 2 — Run Locally

Use Linux x64 or WSL2 on Windows for this Replit export. The workspace excludes several non-Linux native packages, and its scripts use a POSIX shell and `python3`; native Windows execution requires additional configuration.

Prerequisites: Node.js 24, pnpm, Python 3.13, uv, PostgreSQL 16, and Caddy for the complete local web/API experience.

```bash
git clone https://github.com/Peacedrama-11/Team-Salamanca.git
cd Team-Salamanca
pnpm install --frozen-lockfile

# Copy the reference file, then edit DATABASE_URL for your development database.
cp .env.example .env
```

The application does not automatically load this root `.env` file. In the API shell, export its values before starting:

```bash
set -a
source .env
set +a
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
```

In a second shell, start the frontend:

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/futurique run dev
```

In a third shell, start the included local router:

```bash
caddy run --config Caddyfile.local --adapter caddyfile
```

Open [localhost:3000](http://localhost:3000). Caddy forwards `/api/*` to port `5000` and other requests to port `5173`. Opening port `5173` directly displays the UI, but the current Vite configuration does not proxy API requests.

The schema command is intended for a development database. Initial vacancy collection can take several minutes; status is visible in the app.

### Checks and Tests

Run from the project root in the Linux / Replit environment above:

```bash
pnpm run typecheck
PORT=5173 BASE_PATH=/ pnpm run build

# Make the parser's locked Python dependencies available to the test runner.
export PATH="$PWD/.pythonlibs/bin:$PATH"
pnpm --filter @workspace/api-server test

# Frontend logic tests, using Node's TypeScript support.
node --experimental-strip-types --test artifacts/futurique/src/lib/*.test.ts
```

API tests cover vacancy normalization, matching, CV extraction, upload handling, and failure cases using synthetic fixtures and offline data. Frontend tests cover CV profiles/uploads, learning paths, and career scenarios. These commands describe available checks; they do not imply a fresh deployment has passed them.

After API changes, regenerate the client and schemas with `pnpm --filter @workspace/api-spec run codegen`. See [vacancy integration notes](artifacts/api-server/JOBS.md) and the [API contract](lib/api-spec/openapi.yaml) for details.

## How We Use Replit

The application was developed in Replit and exported as a pnpm workspace. It includes `.replit`, per-artifact service definitions, Replit preview plugins, and a PostgreSQL-backed API configuration. The web artifact builds static assets, while the API artifact builds and runs Express.

Hosted project and deployment links: **To be added**. Proof of use: **To be added**. The existing `submission/SDC2026_TeamSalamanca_Replit_POU.pdf` is an empty placeholder and must be replaced with the completed PDF.

## How We Use RunPod

RunPod was not used for this project

## Challenges & Learnings

The implementation addresses several practical challenges:

- **Unreliable vacancy sources:** Cache public results, expose freshness and provider health, and preserve earlier snapshots when refreshes fail.
- **Incomplete skill evidence:** Keep comparisons explainable, represent missing information as unknown, and let users review extracted skills.
- **Document processing limits:** Bound upload size and parsing time, with manual skill entry when extraction fails.
- **Reproducing the exported app:** Document the separate services, database, Python dependencies, and routing needed outside Replit.

Additional team reflections: **To be added**.

## Future Improvements

- [ ] Integrate and evaluate a RunPod-hosted AI workload.
- [ ] Add secure authentication, persistent accounts, and cross-device synchronization.
- [ ] Expand vacancy coverage, especially for Malaysian and regional opportunities.
- [ ] Improve skill dictionaries, document extraction, and language coverage.
- [ ] Connect learning providers and verify course completion.
- [ ] Validate the experience with students, workers, and HR / L&D teams.
- [ ] Simplify installation across operating systems and automate project checks.

## Team

| Name | Role | GitHub |
| --- | --- | --- |
|CHARUMATHI A/P SATHIA GUNALAN| Team Lead/Frontend | Peacedram-11 |
|Muhammad Usman |Backend Developer | KaifHalak |
|MUHAMMAD MUQRI ISYROQ BIN ISMAIL |Pitch Demo| NA |
|NARESWARA JAGADDHITARTHA SUSELOPUTRA |Pitch Demo | NA |
|Carolina Natasya | Pitch Deck |NA|

## Submission Checklist

- [x] Project code and setup documentation included.
- [x] Confirm team details, domain, and SDG track.
- [x] Add Replit project and live demo links.
- [x] Add slide deck and demo video links.
- [x] Add Replit proof of use.
- [x] Implement RunPod integration and add proof of use.
- [x] Add preliminary submission and technology declaration PDFs.
- [x] Rename submission files with the team name.
- [x] Verify installation, tests, and the complete demo on the submission environment.
- [x] Complete the final credentials and personal-data review before submission.

See [submission instructions](submission/README.md) for expected filenames. Structure adapted from the [SDC Hackathon Submission Template](https://github.com/michaelzhngg/SDC_Hackathon_Submission_Template).

## License

See the repository's [Apache License 2.0](LICENSE). The vendored job-board scanner retains its [MIT license](artifacts/api-server/vendor/job-boards/LICENSE) and [upstream attribution](artifacts/api-server/vendor/job-boards/UPSTREAM.md).
