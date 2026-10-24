import { Router, type IRouter, type RequestHandler } from "express";
import multer from "multer";
import { ExtractCvResponse, MatchCvBody, MatchCvResponse, GetCvSkillsResponse } from "@workspace/api-zod";
import { parseCv } from "../lib/cv-parser";
import { normalizeProfile, skillDictionary } from "../lib/cv-skills";
import { rankCvJobs } from "../lib/cv-matching";
import type { JobPosting, JobsStatus } from "@workspace/api-zod";

const upload = multer({ storage: multer.memoryStorage(), limits: {
  fileSize: 8 * 1024 * 1024, files: 1, fields: 0, parts: 1,
}}).single("file");
let activeParsers = 0;
const attempts = new Map<string, { count: number; start: number }>();
const gate: RequestHandler = (req, res, next) => {
  const now = Date.now(), key = req.ip ?? "unknown";
  for (const [ip, entry] of attempts) if (now - entry.start > 60_000) attempts.delete(ip);
  const entry = attempts.get(key) ?? { count: 0, start: now };
  if (activeParsers >= 2 || entry.count >= 8 || attempts.size > 2000) {
    res.status(429).json({ error: "CV parser is busy. Please retry in a minute, or enter skills manually." }); return;
  }
  entry.count++; attempts.set(key, entry); activeParsers++;
  let released = false;
  const release = () => { if (!released) { activeParsers--; released = true; } };
  // Gate covers upload and extraction. The async handler releases in finally;
  // on disconnect a bounded parser can still finish before another is admitted.
  res.locals.releaseCvParser = release;
  req.on("aborted", () => { if (!res.locals.cvParsing) release(); });
  res.on("close", () => { if (!res.locals.cvParsing) release(); });
  req.setTimeout(20_000);
  next();
};

export function createCvRouter(readSnapshot: () => Promise<{ jobs: JobPosting[]; status: JobsStatus }>): IRouter {
const router: IRouter = Router();
router.get("/workforce/cv/skills", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(GetCvSkillsResponse.parse(skillDictionary));
});
router.post("/workforce/cv/extract", gate, (req, res): void => {
  res.setHeader("Cache-Control", "no-store");
  upload(req, res, async error => {
    try {
      if (error) {
        res.status(error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE" ? 413 : 400)
          .json({ error: "Upload one PDF or DOCX file up to 8 MB, with no additional form fields." });
        return;
      }
      const file = req.file;
      if (!file) { res.status(400).json({ error: "Choose a PDF or DOCX file." }); return; }
      const ext = pathExtension(file.originalname);
      const mimeOk = ext === "pdf" ? ["application/pdf", "application/octet-stream"].includes(file.mimetype)
        : ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream", "application/zip"].includes(file.mimetype);
      if (!ext || !mimeOk) { res.status(400).json({ error: "Choose a PDF or DOCX with the correct file type." }); return; }
      res.locals.cvParsing = true;
      const result = await parseCv(file.buffer, ext);
      res.json(ExtractCvResponse.parse(result));
    } catch (error) {
      // parseCv only exposes controlled, non-document error messages.
      res.status(400).json({ error: error instanceof Error ? error.message : "CV could not be read. Enter skills manually." });
    } finally {
      req.file?.buffer.fill(0);
      delete req.file;
      res.locals.releaseCvParser();
    }
  });
});
function pathExtension(name: string): "pdf" | "docx" | null {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "pdf" || ext === "docx" ? ext : null;
}

router.post("/workforce/cv/matches", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = MatchCvBody.safeParse(req.body);
  if (!parsed.success || parsed.data.skills.some(s => !s.name.trim() || /[\u0000-\u001f]/.test(s.name))) {
    res.status(400).json({ error: "Enter up to 40 nonempty skills and valid levels. Experience must be Unknown or 0–80 years." }); return;
  }
  const profile = normalizeProfile(parsed.data);
  if (!profile.skills.length) { res.status(400).json({ error: "Add at least one skill, then confirm your profile." }); return; }
  // Intentionally no requestJobRefresh: matching must only read the durable cache.
  const snapshot = await readSnapshot();
  res.json(MatchCvResponse.parse({ ...rankCvJobs(snapshot.jobs, profile), status: snapshot.status }));
});
return router;
}
