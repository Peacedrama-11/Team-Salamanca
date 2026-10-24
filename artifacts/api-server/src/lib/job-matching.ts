import type { JobPosting, JobMatch, JobMatchInput, JobSearchInput } from "@workspace/api-zod";

export function contactEmail(value?: string): string {
  const email = value?.trim() || "temp@gmail.com";
  // ASCII and no header-control characters; used only in the subprocess env.
  if (email.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(email)) {
    throw new Error("Enter a valid email, or leave it blank to use the default scraper contact.");
  }
  return email;
}

const text = (value: string | null | undefined) => (value ?? "").normalize("NFKC").toLowerCase();
const tokens = (value: string) => [...new Set(text(value).match(/[a-z0-9+#.]+/g) ?? [])]
  .filter(t => t.length > 1 && !["and", "the", "with", "for", "to", "my", "in", "of", "a", "an", "build", "skills", "practical", "work"].includes(t));
function contains(haystack: string, needle: string) {
  const escaped = text(needle).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(haystack);
}

export function filterJobs(jobs: JobPosting[], input: JobSearchInput) {
  return jobs.filter(job => {
    const location = text(job.location);
    const haystack = text([job.title, job.company, job.department, job.team].filter(Boolean).join(" "));
    return (!input.query?.trim() || tokens(input.query).every(t => contains(haystack, t)))
      && (!input.location?.trim() || location.includes(text(input.location.trim())))
      && (input.remote === undefined || job.isRemote === input.remote)
      && (!input.employmentType || text(job.employmentType) === text(input.employmentType))
      && (!input.region || input.region === "all"
        || (input.region === "remote" && job.isRemote === true)
        || (input.region === "anz" && /australia|new zealand|sydney|melbourne|auckland|wellington/.test(location))
        || (input.region === "apac" && /asia|apac|singapore|malaysia|kuala lumpur|japan|tokyo|india|bengaluru|bangalore|mumbai|china|hong kong|taiwan|korea|seoul|indonesia|jakarta|vietnam|thailand|bangkok|philippines|manila|australia|new zealand/.test(location)));
  });
}

export function rankJobs(jobs: JobPosting[], input: JobMatchInput): JobMatch[] {
  const skills = [...new Set(input.skills.map(s => s.trim()).filter(Boolean))];
  const fields = tokens(input.field ?? "");
  const goals = tokens(input.goal ?? "");
  const hasLocation = Boolean(input.location?.trim());
  const weight = (skills.length ? 60 : 0) + (fields.length ? 20 : 0) + (goals.length ? 10 : 0) + (hasLocation ? 10 : 0);
  if (!weight) return [];
  return jobs.map(job => {
    const metadata = text([job.title, job.department, job.team].filter(Boolean).join(" "));
    const found = skills.filter(skill => contains(metadata, skill));
    const fieldHits = fields.filter(t => contains(metadata, t));
    const goalHits = goals.filter(t => contains(metadata, t));
    const locationHit = hasLocation && text(job.location).includes(text(input.location!.trim()));
    const evidence = [
      ...found.map(s => `Your skill “${s}” appears in the posting title, department or team.`),
      ...(fieldHits.length ? [`Study/field terms in posting metadata: ${fieldHits.join(", ")}.`] : []),
      ...(goalHits.length ? [`Goal terms in posting metadata: ${goalHits.join(", ")}.`] : []),
      ...(locationHit ? [`Posting location contains your preference “${input.location!.trim()}”.`] : []),
    ];
    const score = Math.round(100 * ((skills.length ? 60 * found.length / skills.length : 0)
      + (fields.length ? 20 * fieldHits.length / fields.length : 0)
      + (goals.length ? 10 * goalHits.length / goals.length : 0) + (locationHit ? 10 : 0)) / weight);
    return {
      job, score, evidence,
      unmatchedSkills: skills.filter(s => !found.includes(s)),
      missingInformation: [
        "Matching uses title, department, team and location only; full requirements and CV contents are not assessed.",
        "Skills absent from this metadata may still be relevant. They are not confirmed skill gaps.",
        ...(job.location ? [] : ["The employer did not provide a location."]),
        ...(job.isRemote === null ? ["Remote eligibility is not specified."] : []),
      ],
    };
  }).filter(match => match.evidence.length > 0)
    .sort((a, b) => b.score - a.score || a.job.id.localeCompare(b.job.id));
}

export function normalizeRows(rows: Record<string, unknown>[], provider: JobPosting["provider"], company: string, fetchedAt: string): JobPosting[] {
  const nullable = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
  const unique = new Map<string, JobPosting>();
  for (const row of rows) {
    const rawId = nullable(row.id), title = nullable(row.title), url = nullable(row.jobUrl);
    if (!rawId || !title || !url) continue;
    try { if (new URL(url).protocol !== "https:") continue; } catch { continue; }
    const workplace = nullable(row.workplaceType);
    // Greenhouse only infers remote from text, never treats missing evidence as on-site.
    const remote = provider === "greenhouse" ? (row.isRemote === true ? true : null)
      : row.isRemote === true ? true
      : workplace ? (workplace.toLowerCase() === "remote") : null;
    const id = `${provider}:${rawId}`;
    unique.set(id, {
      id, provider, company, title, url, fetchedAt,
      location: nullable(row.location), department: nullable(row.department), team: nullable(row.team),
      employmentType: nullable(row.employmentType), workplaceType: workplace, isRemote: remote,
      postedAt: nullable(row.publishedAt),
      description: nullable(row.description)?.slice(0, 30_000) ?? null,
    });
  }
  return [...unique.values()];
}
