import { Router, type IRouter, type Response } from "express";
import {
  SearchJobsBody, SearchJobsResponse, MatchJobsBody, MatchJobsResponse,
  RefreshJobsBody, RefreshJobsResponse, GetJobsStatusResponse,
} from "@workspace/api-zod";
import { filterJobs, rankJobs, contactEmail } from "../lib/job-matching";
import { jobSnapshot, requestJobRefresh } from "../lib/job-collector";

const router: IRouter = Router();
const method = "Metadata relevance only: supplied skills 60%, field terms 20%, goal terms 10%, location 10%, normalized over supplied inputs. No CV reading or full job-requirements assessment. Not a hiring probability.";
function validEmail(email: string | undefined, res: Response) {
  try { contactEmail(email); return true; }
  catch {
    res.status(400).json({ error: "Enter a valid email, or leave it blank to use the default scraper contact." });
    return false;
  }
}

router.get("/workforce/jobs/provider-status", async (_req, res): Promise<void> => {
  res.json(GetJobsStatusResponse.parse((await jobSnapshot()).status));
});

router.post("/workforce/jobs/search", async (req, res): Promise<void> => {
  const parsed = SearchJobsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid search filters. Page size must be between 1 and 50." }); return; }
  const input = parsed.data;
  if (!validEmail(input.email, res)) return;
  const status = await requestJobRefresh(input.email);
  const snapshot = await jobSnapshot();
  const filtered = filterJobs(snapshot.jobs, input);
  const page = input.page ?? 1, pageSize = input.pageSize ?? 12;
  res.json(SearchJobsResponse.parse({
    jobs: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize,
    employmentTypes: [...new Set(snapshot.jobs.flatMap(job => job.employmentType ? [job.employmentType] : []))].sort(),
    status: { ...snapshot.status, refreshing: status.refreshing || snapshot.status.refreshing },
  }));
});

router.post("/workforce/jobs/matches", async (req, res): Promise<void> => {
  const parsed = MatchJobsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid matching profile. Supply up to 40 skills and a page size from 1 to 50." }); return; }
  const input = parsed.data;
  if (!validEmail(input.email, res)) return;
  const status = await requestJobRefresh(input.email);
  const snapshot = await jobSnapshot(), matches = rankJobs(snapshot.jobs, input);
  const page = input.page ?? 1, pageSize = input.pageSize ?? 6;
  res.json(MatchJobsResponse.parse({
    matches: matches.slice((page - 1) * pageSize, page * pageSize), total: matches.length, page, pageSize, method,
    status: { ...snapshot.status, refreshing: status.refreshing || snapshot.status.refreshing },
  }));
});

router.post("/workforce/jobs/refresh", async (req, res): Promise<void> => {
  const parsed = RefreshJobsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid scraper contact." }); return; }
  if (!validEmail(parsed.data.email, res)) return;
  res.status(202).json(RefreshJobsResponse.parse(await requestJobRefresh(parsed.data.email, true)));
});

export default router;
