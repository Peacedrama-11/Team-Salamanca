import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import express from "express";
import { createCvRouter } from "../routes/cv";
import { normalizeRows } from "./job-matching";
import { ExtractCvResponse, MatchCvResponse, type JobsStatus } from "@workspace/api-zod";

test("synthetic upload → review → cache-only matching; manual levels and errors", async () => {
  let snapshots = 0;
  const jobs = normalizeRows([
    { id: "sample", title: "Synthetic cached job", jobUrl: "https://example.org/sample", description: "Requirements\nJS and Python\n3 years of experience" },
    { id: "unknown", title: "Old cached record", jobUrl: "https://example.org/old" },
    { id: "senior", title: "Synthetic senior role", jobUrl: "https://example.org/senior", description: "Required: Python\n8 years of experience required" },
  ], "ashby", "Synthetic only", "2026-10-25T00:00:00Z");
  const status: JobsStatus = { state: "ready", refreshing: false, fetchedAt: "2026-10-25T00:00:00Z", stale: false, totalJobs: 3, boards: [], coverage: "Synthetic test fixture", retryAfterSeconds: 0 };
  const app = express(); app.use(express.json()); app.use(createCvRouter(async () => { snapshots++; return { jobs, status }; }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const port = (server.address() as { port: number }).port, url = `http://127.0.0.1:${port}/workforce/cv`;
  const upload = async (name: string, bytes: Uint8Array, mime: string) => {
    const form = new FormData(); form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), name);
    return fetch(`${url}/extract`, { method: "POST", body: form });
  };
  const match = (profile: unknown) => fetch(`${url}/matches`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
  const fixture = (name: string) => readFileSync(path.resolve("../../generated-artifacts/cv-fixtures", name));
  try {
    const pdf = await upload("sample.pdf", fixture("sample-cv.pdf"), "application/pdf");
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers.get("cache-control"), "no-store");
    const extracted = ExtractCvResponse.parse(await pdf.json());
    assert.equal(extracted.experienceYears, 3);
    assert(extracted.skills.some((s: { name: string }) => s.name === "JavaScript"));
    assert(extracted.skills.every((s: { level: string }) => s.level === "unspecified"));
    assert.equal("text" in extracted, false);
    assert.equal(snapshots, 0, "upload must not read/fetch jobs");
    // User correction replaces the CV's JS with manual Python/level and changes years.
    const response = await match({ skills: [{ name: "python", level: "intermediate" }], experienceYears: 2 });
    assert.equal(response.status, 200);
    const result = MatchCvResponse.parse(await response.json());
    assert.equal(result.matches[0]!.score, 50);
    assert.deepEqual(result.matches[0]!.missingSkills, ["JavaScript"]);
    assert.equal(result.profile.skills[0]!.level, "intermediate");
    assert.equal(result.totalExcluded, 1);
    assert.equal(result.unscored[0]!.score, null);
    assert.equal(snapshots, 1);
    const docx = await upload("sample.docx", fixture("sample-cv.docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.equal(docx.status, 200);
    assert.equal(ExtractCvResponse.parse(await docx.json()).experienceYears, 1.5);
    for (const name of ["scanned-sample.pdf", "encrypted-sample.pdf"]) {
      const bad = await upload(name, fixture(name), "application/pdf");
      assert.equal(bad.status, 400);
      assert.match((await bad.json() as { error: string }).error, /manually/i);
    }
    assert.equal((await upload("disguised.pdf", fixture("sample-cv.docx"), "application/pdf")).status, 400);
    assert.equal((await upload("huge.pdf", new Uint8Array(8 * 1024 * 1024 + 1), "application/pdf")).status, 413);
    assert.equal((await match({ skills: [], experienceYears: null })).status, 400);
    assert.equal((await match({ skills: [{ name: "  ", level: "advanced" }], experienceYears: null })).status, 400);
    assert.equal((await match({ skills: [{ name: "Python", level: "expert" }], experienceYears: 2 })).status, 400);
    assert.equal((await match({ skills: [{ name: "Python", level: "advanced" }], experienceYears: -1 })).status, 400);
    assert.equal(snapshots, 1, "invalid input and document processing must not refresh/read jobs");
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
