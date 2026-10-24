import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalSkill, explicitExperience, extractSkills, normalizeProfile } from "./cv-skills";
import { EXPERIENCE_GAP_YEARS, jobRequirements, rankCvJobs } from "./cv-matching";
import { normalizeRows } from "./job-matching";

const fixtureJob = (id: string, description?: string) => normalizeRows([{
  id, title: "Synthetic test vacancy", jobUrl: `https://example.org/fixture/${id}`, description,
}], "ashby", "Synthetic fixture only", "2026-10-25T00:00:00Z")[0]!;
const profile = { skills: [{ name: "JS", level: "beginner" as const }, { name: "Python", level: "advanced" as const }], experienceYears: 2 };

test("dictionary canonicalizes aliases and enforces exact boundaries", () => {
  assert.equal(canonicalSkill(" js "), "JavaScript");
  assert.equal(canonicalSkill("Postgres"), "PostgreSQL");
  assert.deepEqual(extractSkills("Research logo cargo reactivate JavaScripting"), []);
  assert.deepEqual(extractSkills("C++ C#"), ["C++", "C#"]);
  assert.deepEqual(extractSkills("JS, Python, SQL"), ["JavaScript", "Python", "SQL"]);
  assert.deepEqual(extractSkills("No experience with Python.\nJava required."), ["Java"]);
});
test("experience requires explicit unambiguous evidence", () => {
  assert.equal(explicitExperience("2020–2025, developer"), null);
  assert.equal(explicitExperience("5 years of professional experience"), 5);
  assert.equal(explicitExperience("Experience: 1.5 years"), 1.5);
  assert.equal(explicitExperience("3 years experience; 5 years of experience"), null);
  assert.equal(explicitExperience("No 3 years of experience"), null);
  assert.equal(explicitExperience("3–5 years of experience"), null);
  assert.equal(jobRequirements("Requirements\n3–5 years of experience").experience, 3);
});
test("manual profile aliases deduplicate without inventing proficiency", () => {
  assert.deepEqual(normalizeProfile({ ...profile, skills: [...profile.skills, { name: "javascript", level: "advanced" }] }).skills,
    [{ name: "JavaScript", level: "beginner" }, { name: "Python", level: "advanced" }]);
});
test("requirements exclude preferred and negated skills and company boilerplate", () => {
  const req = jobRequirements("About us\nWe love Rust.\nRequirements\nPython and JS\nNo SQL required\n3 years of experience\nPreferred qualifications\nJava\nDocker\nBenefits\nGit");
  assert.deepEqual(req.skills, ["JavaScript", "Python"]);
  assert.equal(req.experience, 3);
  assert.deepEqual(jobRequirements("Our stack uses Python and SQL.").skills, []);
  assert.deepEqual(jobRequirements("Required: Java or Python").skills, []);
  assert.deepEqual(jobRequirements("Required: Python. Preferred: Java.").skills, ["Python"]);
});
test("HTML requirements are text only and optional sections stay optional", () => {
  const req = jobRequirements("<h2>Requirements</h2><li>Python</li><script>Java</script><h2>Preferred:</h2><li>SQL</li>");
  assert.deepEqual(req.skills, ["Python"]);
});
test("scores use exact known-required skill denominator, levels do not weight", () => {
  const jobs = [fixtureJob("half", "Required skills: Python, Java, SQL, JS"), fixtureJob("full", "Required: Python")];
  const result = rankCvJobs(jobs, profile);
  assert.equal(result.matches[0]!.job.id, "ashby:full");
  assert.equal(result.matches[1]!.score, 50);
  assert.deepEqual(result.matches[1]!.matchedSkills, ["JavaScript", "Python"]);
  assert.deepEqual(result.matches[1]!.missingSkills, ["Java", "SQL"]);
  assert.equal(rankCvJobs(jobs, { ...profile, skills: profile.skills.map(s => ({ ...s, level: "unspecified" })) }).matches[1]!.score, 50);
});
test("missing description and unclear requirements are unscored, never zero", () => {
  const result = rankCvJobs([fixtureJob("no-description"), fixtureJob("unclear", "Work with great people")], profile);
  assert.equal(result.matches.length, 0);
  assert.equal(result.totalUnscored, 2);
  assert(result.unscored.every(m => m.score === null && m.eligibility === "unknown"));
  assert.equal(rankCvJobs([fixtureJob("zero", "Required: Java")], profile).matches[0]!.score, 0);
});
test("experience gaps use explicit centralized boundary, unknown is not eligible", () => {
  assert.equal(EXPERIENCE_GAP_YEARS, 2);
  const result = rankCvJobs([
    fixtureJob("above", "Required: Python\n5 years of experience required"),
    fixtureJob("near", "Required: Python\n4 years of experience required"),
    fixtureJob("met", "Required: Python\n2 years of experience required"),
    fixtureJob("unknown", "Required: Python"),
  ], profile);
  assert.equal(result.excluded[0]!.eligibility, "above-current");
  assert.equal(result.matches.find(m => m.job.id.endsWith("near"))!.eligibility, "below-stated");
  assert.equal(result.matches[0]!.eligibility, "meets");
  assert.equal(result.matches.find(m => m.job.id.endsWith("unknown"))!.eligibility, "unknown");
  assert.equal(rankCvJobs([fixtureJob("above", "Required: Python\n5 years of experience required")], { ...profile, experienceYears: null }).totalExcluded, 0);
});
test("results cap at ten, stable ranking and old caches remain compatible", () => {
  const jobs = Array.from({ length: 15 }, (_, i) => fixtureJob(String(i).padStart(2, "0"), "Required: Python"));
  const result = rankCvJobs(jobs.reverse(), profile);
  assert.equal(result.matches.length, 10);
  assert.equal(result.totalRanked, 15);
  assert.equal(result.matches[0]!.job.id, "ashby:00");
  assert.equal(fixtureJob("old").description, null);
  assert.equal(rankCvJobs([fixtureJob("same-id", "Required: Java")], profile).matches[0]!.score, 0);
  assert.equal(rankCvJobs([fixtureJob("same-id", "Required: Python")], profile).matches[0]!.score, 100, "cached requirements change when description changes");
});
