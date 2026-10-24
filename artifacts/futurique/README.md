# Futurique

Futurique is a responsive demo platform for exploring career development and workforce skills as AI changes the world of work.

## Run the app

See the [root README](../../README.md#how-to-run) for complete Replit and local setup, including PostgreSQL, Python dependencies, and web/API routing. From the project root, start the web app with explicit local settings:

```bash
pnpm install
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/futurique run dev
```

## Demo notes

- Use demo mode to explore the student, fresh graduate, working adult, and HR / L&D experiences.
- General dashboard profiles and HR actions use demo state. Confirmed CV skills and selected learning paths can persist in this browser's local storage, scoped by demo email; this is not secure authentication.
- Job listings are real cached public vacancies from Ashby, Greenhouse and Lever. Collection status, coverage limits and fetched times are shown.
- General career matches use entered profile data and posting metadata. The separate CV workspace uses reviewed skills and recognized required skills from cached descriptions. Scores are explainable relevance or skill overlap, not hiring predictions or assessed proficiency. Missing evidence remains unknown.
- Other career scenarios and learning data remain illustrative, not verified forecasts.
- Clicking Extract skills uploads a PDF or DOCX of up to 8 MB to the API for temporary, in-memory parsing. Raw CV files are not stored in PostgreSQL. Use synthetic CVs for demonstrations; manual entry is available when parsing fails.
- Google sign-in and model-based AI features are not configured. Learning paths link to roadmap.sh; start/stop tracking is visual status, not verified course completion.
- The optional demo email is held in browser session storage and sent as scraper contact to public job APIs when a background refresh is started. Blank uses `temp@gmail.com`; it is never an email delivery feature.
- The API and PostgreSQL database must be running for vacancies, CV matching, and official labour data. No fake vacancy fallbacks are used. Visit the jobs view to populate the cache before trying CV matches.
- See `../api-server/JOBS.md` for the pinned upstream source, Python runtime, cache lifecycle, refresh operation and matching limits.
