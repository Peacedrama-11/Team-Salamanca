import type { CvMatch, CvProfile, JobPosting } from "@workspace/api-zod";
import { explicitExperience, extractSkills, normalizeProfile } from "./cv-skills";
import { createHash } from "node:crypto";

export const EXPERIENCE_GAP_YEARS = 2;
export const CV_METHOD = "Required-skill overlap = matched known required skills / known required skills × 100. Dictionary-based extraction may be incomplete. Self-reported proficiency is unverified and does not weight the score. More than 2 years below a stated experience minimum is excluded; smaller gaps are flagged. Unknown is not zero or proof of eligibility. Not a hiring probability.";
const optional = /\b(?:preferred|optional|nice[- ]to[- ]have|bonus|not required|not necessary|no experience|would be (?:a |an )?(?:plus|advantage)|a plus|desirable)\b/i;
const requirement = /\b(?:required|requirements|qualifications|must have|must know|must be|proficien(?:t|cy)|you (?:have|bring)|what (?:you bring|you['’]ll (?:bring|need))|essential|minimum|expertise in|experience (?:in|with)|knowledge of)\b/i;
const otherSection = /^(?:about (?:us|the (?:company|role|team))|benefits|perks|what we offer|responsibilities|what you['’]ll do|our (?:team|stack)|compensation)\s*[:?]?\s*$/i;

export function jobRequirements(description?: string | null) {
  const skills = new Set<string>(), evidence: string[] = [], experienceLines: string[] = [];
  let requiredSection = false, optionalSection = false;
  // Ignore raw markup in older/non-normalized caches rather than render or trust it.
  const plain = (description ?? "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(?:p|li|div|h[1-6])>|<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, " ");
  for (const raw of plain.split(/\n|(?<=[.!?])\s+(?=[A-Z])|(?=\b(?:Preferred|Nice to have|Bonus):)/)) {
    const line = raw.trim().replace(/^[-•*]\s*/, "");
    if (!line) continue;
    if (otherSection.test(line)) { requiredSection = false; optionalSection = false; continue; }
    const heading = line.length < 100 && !/[.,;]/.test(line) && /[:?]$/.test(line);
    const requiredHeading = /^(?:(?:minimum|basic|required|essential)\s+)?(?:requirements|qualifications|skills)(?:\s+and\s+(?:experience|qualifications))?\s*:?$|^what you(?:['’]ll)? (?:bring|need|have)\s*:?$/i.test(line);
    if (optional.test(line)) {
      // Treat optional headings as a section, not just one skipped bullet.
      if (heading || /^(?:preferred qualifications|nice[- ]to[- ]have|bonus|preferred skills)\s*:?$/i.test(line)) {
        requiredSection = false; optionalSection = true;
      }
      continue;
    }
    if (requiredHeading || (requirement.test(line) && heading)) {
      requiredSection = true; optionalSection = false;
    }
    if (optionalSection || (!requiredSection && !requirement.test(line))) continue;
    const found = extractSkills(line);
    // Alternatives cannot be honestly expressed as an all-of skill denominator.
    if (found.length > 1 && /\bor\b/i.test(line)) {
      if (evidence.length < 6) evidence.push("An alternative-skill requirement was left unscored; review the original posting.");
    } else {
      found.forEach(s => skills.add(s));
      if (found.length && evidence.length < 6) evidence.push(`Required-skill evidence: ${line.slice(0, 240)}`);
    }
    if (explicitExperience(line, true) !== null) experienceLines.push(line);
  }
  return { skills: [...skills], experience: explicitExperience(experienceLines.join("\n"), true), evidence };
}

// Cache public requirements only, never candidate profiles or raw CVs. Content
// hashes invalidate entries on changes, even if a source timestamp is unchanged.
const requirementsCache = new Map<string, ReturnType<typeof jobRequirements>>();
function cachedRequirements(description?: string | null) {
  const key = createHash("sha256").update(description ?? "").digest("hex");
  const existing = requirementsCache.get(key);
  if (existing) return existing;
  const parsed = jobRequirements(description);
  if (requirementsCache.size >= 10_000) requirementsCache.delete(requirementsCache.keys().next().value!);
  requirementsCache.set(key, parsed);
  return parsed;
}

export function rankCvJobs(jobs: JobPosting[], supplied: CvProfile) {
  const profile = normalizeProfile(supplied);
  const userSkills = new Set(profile.skills.map(s => s.name.toLowerCase()));
  const ranked: CvMatch[] = [], unscored: CvMatch[] = [], excluded: CvMatch[] = [];
  for (const job of jobs) {
    const req = cachedRequirements(job.description);
    const matchedSkills = req.skills.filter(s => userSkills.has(s.toLowerCase()));
    const missingSkills = req.skills.filter(s => !userSkills.has(s.toLowerCase()));
    const gap = req.experience === null || profile.experienceYears === null ? null : req.experience - profile.experienceYears;
    const eligibility: CvMatch["eligibility"] = gap === null ? "unknown"
      : gap > EXPERIENCE_GAP_YEARS ? "above-current" : gap > 0 ? "below-stated" : "meets";
    const match: CvMatch = {
      // Full descriptions aren't needed in result payloads.
      job: { ...job, description: undefined }, matchedSkills, missingSkills, requiredSkills: req.skills,
      score: req.skills.length ? matchedSkills.length / req.skills.length * 100 : null,
      experienceRequired: req.experience, eligibility,
      evidence: [
        ...req.evidence,
        ...(!req.skills.length ? ["Required technical skills could not be determined from this cached description."] : []),
        ...(req.experience === null ? ["Experience requirement is unknown."] : []),
      ],
    };
    if (eligibility === "above-current") excluded.push(match);
    else if (match.score === null) unscored.push(match);
    else ranked.push(match);
  }
  const order = (a: CvMatch, b: CvMatch) => (b.score ?? -1) - (a.score ?? -1)
    || ({ meets: 0, unknown: 1, "below-stated": 2, "above-current": 3 }[a.eligibility] - { meets: 0, unknown: 1, "below-stated": 2, "above-current": 3 }[b.eligibility])
    || a.job.id.localeCompare(b.job.id);
  ranked.sort(order); unscored.sort(order); excluded.sort(order);
  return {
    matches: ranked.slice(0, 10), unscored: unscored.slice(0, 10), excluded: excluded.slice(0, 10),
    totalRanked: ranked.length, totalUnscored: unscored.length, totalExcluded: excluded.length, profile, method: CV_METHOD,
  };
}
