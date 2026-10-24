import { test } from "node:test";
import assert from "node:assert/strict";
import { contactEmail, normalizeRows, filterJobs, rankJobs } from "./job-matching";

const time = "2026-10-24T00:00:00Z";
const rows = [
  { id: "one", title: "SQL Data Analyst", jobUrl: "https://jobs.example.org/one", location: "Singapore", employmentType: "FullTime", isRemote: true, workplaceType: "remote", department: "Research" },
  { id: "two", title: "Designer", jobUrl: "https://jobs.example.org/two", location: "Sydney, Australia", employmentType: "Contract", isRemote: false, workplaceType: "onsite" },
];
const jobs = normalizeRows(rows, "ashby", "test-board", time);

test("contact email defaults, trims and rejects header injection, malformed and oversized input", () => {
  for (const value of [undefined, "", "  "]) assert.equal(contactEmail(value), "temp@gmail.com");
  assert.equal(contactEmail("  provided@example.org "), "provided@example.org");
  for (const invalid of ["missing", "a@b", "someone@example.org\r\nx: yes", "é@example.org", "a".repeat(255) + "@example.org"]) {
    assert.throws(() => contactEmail(invalid));
  }
});
test("normalization preserves sources, rejects unsafe URLs, deduplicates by platform and id", () => {
  const actual = normalizeRows([...rows, rows[0], { ...rows[0], id: "unsafe", jobUrl: "javascript:alert(1)" }], "ashby", "test-board", time);
  assert.equal(actual.length, 2);
  assert.equal(actual[0].id, "ashby:one");
  assert.equal(actual[0].fetchedAt, time);
  assert.equal(actual[0].url, rows[0].jobUrl);
  assert.equal(actual[0].postedAt, null);
  assert.equal(actual[0].team, null);
  assert.notEqual(actual[0].id, normalizeRows([rows[0]], "lever", "test-board", time)[0].id);
});
test("unknown remote and employment metadata stays unknown", () => {
  const row = { id: "a", title: "Unknown role", jobUrl: "https://jobs.example.org/a" };
  const job = normalizeRows([row], "greenhouse", "board", time)[0];
  assert.equal(job.isRemote, null);
  assert.equal(job.location, null);
  assert.equal(job.employmentType, null);
  assert.equal(filterJobs([job], { remote: false }).length, 0);
});
test("filters combine title, region, location, remote and employment type", () => {
  assert.equal(filterJobs(jobs, { query: "sql analyst", location: "singapore", region: "apac", remote: true, employmentType: "fulltime" }).length, 1);
  assert.equal(filterJobs(jobs, { region: "anz" })[0].title, "Designer");
  assert.equal(filterJobs(jobs, { region: "remote" }).length, 1);
  assert.equal(filterJobs(jobs, { query: "absent" }).length, 0);
  assert.equal(filterJobs(jobs, { query: "Excel" }).length, 0);
});
test("relevance uses profile inputs and real metadata; no invented skill gaps", () => {
  const matches = rankJobs(jobs, { skills: ["SQL", "Excel"], field: "Data", goal: "Research", location: "Singapore" });
  assert.equal(matches[0].job.id, "ashby:one");
  assert.equal(matches[0].score, 70);
  assert.deepEqual(matches[0].unmatchedSkills, ["Excel"]);
  assert.match(matches[0].missingInformation.join(" "), /not confirmed skill gaps/);
  assert.equal(matches[0].evidence.length, 4);
  assert.equal(rankJobs(jobs, { skills: ["UnrelatedNeedle"] }).length, 0);
  assert.equal(rankJobs(jobs, { skills: [] }).length, 0);
  assert.equal(rankJobs(jobs, { skills: [], field: "Design" }).length, 0);
  assert.equal(rankJobs(jobs, { skills: [], field: "Designer" })[0].job.id, "ashby:two");
});
test("skill matching uses term boundaries, not substring matches", () => {
  assert.equal(rankJobs(jobs, { skills: ["R"] }).length, 0);
  assert.equal(rankJobs(jobs, { skills: ["sql"] })[0].score, 100);
});
