# Futurique

Futurique is a responsive demo platform for exploring career development and workforce skills as AI changes the world of work.

## Run the app

From the project root, install dependencies and start the web app:

```bash
pnpm install
pnpm --filter @workspace/futurique run dev
```

## Demo notes

- Use demo mode to explore the student, fresh graduate, working adult, and HR / L&D experiences.
- Profiles and HR actions are session-only demo data. They are not saved to a database.
- Job listings are real cached public vacancies from Ashby, Greenhouse and Lever. Collection status, coverage limits and fetched times are shown.
- Career matches use entered profile data and posting metadata, not a CV analysis or hiring prediction. Unmatched skills are not confirmed skill gaps.
- Other career scenarios and learning data remain illustrative, not verified forecasts.
- CV selection validates the file type locally; the file is not uploaded, read, or analyzed.
- Google sign-in, AI features, and learning-resource integrations are not configured.
- The optional demo email is held in browser session storage and sent as scraper contact to public job APIs when a background refresh is started. Blank uses `temp@gmail.com`; it is never an email delivery feature.
- The API and PostgreSQL database must be running for vacancies and official labour data. No fake vacancy fallbacks are used.
- See `../api-server/JOBS.md` for the pinned upstream source, Python runtime, cache lifecycle, refresh operation and matching limits.
