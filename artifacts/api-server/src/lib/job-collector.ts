import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { and, eq, sql } from "drizzle-orm";
import { db, jobBoardsCache, jobCollectionControl } from "@workspace/db";
import { SearchJobsResponse, type JobsStatus, type JobPosting } from "@workspace/api-zod";
import { contactEmail, normalizeRows } from "./job-matching";
import { logger } from "./logger";

const TTL = 6 * 60 * 60 * 1000;
const COOLDOWN = 5 * 60 * 1000;
const LEASE = 210_000;
const root = existsSync(path.resolve("vendor/job-boards/boards.seed.json"))
  ? process.cwd() : path.resolve("artifacts/api-server");
const configuredBoards = path.join(root, "config/boards.json");
const boardFile = existsSync(configuredBoards) ? configuredBoards : path.join(root, "vendor/job-boards/boards.seed.json");
const sources = new Set(["ashby", "greenhouse", "lever"]);
const rawBoards: Record<string, string[]> = JSON.parse(readFileSync(boardFile, "utf8"));
const configured = Object.entries(rawBoards).flatMap(([provider, companies]) => {
  if (!sources.has(provider) || !Array.isArray(companies)
    || companies.some(c => typeof c !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9 ._-]{0,60}$/.test(c))) {
    throw new Error("Invalid trusted job-board configuration");
  }
  return [...new Set(companies)].map(company => ({ key: `${provider}/${company}`, provider, company }));
});
if (!configured.length || configured.length > 200) throw new Error("Configure 1–200 trusted boards");
const boardKeys = new Set(configured.map(b => b.key));
let initializing: Promise<void> | undefined;

async function initialize() {
  // Idempotent data initialization, not schema migration.
  initializing ??= (async () => {
    await db.insert(jobCollectionControl).values({ key: "collector" }).onConflictDoNothing();
    await db.insert(jobBoardsCache).values(configured).onConflictDoNothing();
  })().catch(error => { initializing = undefined; throw error; });
  await initializing;
}

export async function jobSnapshot(): Promise<{ jobs: JobPosting[]; status: JobsStatus }> {
  await initialize();
  const [allRows, controls] = await Promise.all([
    db.select().from(jobBoardsCache), db.select().from(jobCollectionControl).where(eq(jobCollectionControl.key, "collector")),
  ]);
  const rows = allRows.filter(row => boardKeys.has(row.key));
  const now = Date.now(), control = controls[0];
  const refreshing = Boolean(control?.lockedUntil && control.lockedUntil.getTime() > now);
  const jobs = [...new Map(rows.flatMap(row => {
    // Validate durable cache before it reaches any consumer.
    const checked = SearchJobsResponse.shape.jobs.safeParse(row.jobs);
    return checked.success ? checked.data.map(job => [job.id, job] as const) : [];
  })).values()].sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? "") || a.id.localeCompare(b.id));
  const boards = rows.map(row => ({
    provider: row.provider, company: row.company, count: row.count,
    state: (row.state === "ok" || row.state === "failed" ? row.state : "pending") as "ok" | "failed" | "pending",
    fetchedAt: row.fetchedAt?.toISOString() ?? null,
  }));
  const successful = rows.filter(row => row.fetchedAt);
  const failed = rows.some(row => row.state === "failed");
  const pending = rows.some(row => row.state === "pending");
  const latest = successful.reduce((time, row) => Math.max(time, row.fetchedAt!.getTime()), 0);
  const oldest = successful.reduce((time, row) => Math.min(time, row.fetchedAt!.getTime()), Infinity);
  const state = successful.length ? (failed || pending ? "partial" : "ready")
    : failed && !refreshing ? "unavailable" : "pending";
  return {
    jobs,
    status: {
      state, refreshing, fetchedAt: latest ? new Date(latest).toISOString() : null,
      stale: failed || pending || !successful.length || now - oldest > TTL,
      totalJobs: jobs.length, boards,
      coverage: `Public Ashby, Greenhouse and Lever vacancies from ${configured.length} configured boards. Company names are board identifiers. This is not exhaustive global or regional coverage.`,
      retryAfterSeconds: refreshing ? Math.max(1, Math.ceil((control!.lockedUntil!.getTime() - now) / 1000))
        : Math.max(0, Math.ceil(((control?.startedAt?.getTime() ?? 0) + COOLDOWN - now) / 1000)),
    },
  };
}

export async function requestJobRefresh(email?: string, force = false) {
  const contact = contactEmail(email);
  const snapshot = await jobSnapshot();
  if (!force && !snapshot.status.stale) return snapshot.status;
  const now = new Date(), token = randomUUID();
  // Durable compare-and-set lease prevents overlapping collectors/cooldown bypass
  // across tabs, Node processes and autoscaled instances.
  const acquired = await db.update(jobCollectionControl).set({
    token, startedAt: now, lockedUntil: new Date(now.getTime() + LEASE),
  }).where(and(
    eq(jobCollectionControl.key, "collector"),
    sql`(${jobCollectionControl.lockedUntil} is null or ${jobCollectionControl.lockedUntil} < ${now})`,
    sql`(${jobCollectionControl.startedAt} is null or ${jobCollectionControl.startedAt} < ${new Date(now.getTime() - COOLDOWN)})`,
  )).returning();
  if (acquired.length) {
    void collect(contact, token).catch(() => {
      // No subprocess output, args, contact or request bodies in logs.
      logger.warn("Job collection failed; previous cached vacancies remain available");
    });
    return { ...snapshot.status, refreshing: true, retryAfterSeconds: Math.ceil(LEASE / 1000) };
  }
  return (await jobSnapshot()).status;
}

async function collect(contact: string, token: string) {
  const seen = new Set<string>();
  let child: ReturnType<typeof spawn> | undefined;
  try {
    child = spawn("python3", [path.join(root, "src/jobs/collect.py"), "--boards", boardFile], {
      cwd: root,
      // Only the required Python network/runtime settings are inherited. Never
      // expose DB credentials or unrelated application secrets to the scraper.
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        SSL_CERT_FILE: process.env.SSL_CERT_FILE,
        SSL_CERT_DIR: process.env.SSL_CERT_DIR,
        NIX_SSL_CERT_FILE: process.env.NIX_SSL_CERT_FILE,
        LANG: "C.UTF-8",
        JOB_SCRAPER_CONTACT: contact,
        PYTHONDONTWRITEBYTECODE: "1",
      },
      stdio: ["ignore", "pipe", "ignore"],
    });
    const exited = new Promise<number | null>((resolve, reject) => {
      child!.once("error", reject);
      child!.once("close", resolve);
    });
    // Attach a rejection handler immediately, before awaiting streamed output.
    void exited.catch(() => {});
    const timeout = setTimeout(() => child?.kill("SIGKILL"), 180_000);
    timeout.unref();
    let outputBytes = 0;
    try {
      for await (const line of createInterface({ input: child.stdout!, crlfDelay: Infinity })) {
        outputBytes += Buffer.byteLength(line);
        if (outputBytes > 64 * 1024 * 1024 || line.length > 12 * 1024 * 1024) {
          child.kill("SIGKILL"); throw new Error("Collector output budget exceeded");
        }
        const result = JSON.parse(line);
        const key = `${result.provider}/${result.company}`;
        if (!boardKeys.has(key) || seen.has(key) || !Array.isArray(result.rows)) throw new Error("Invalid collector board result");
        seen.add(key);
        const now = new Date();
        if (result.ok === true) {
          const jobs = normalizeRows(result.rows, result.provider, result.company, now.toISOString());
          // A malformed nonempty board must not erase cached vacancies.
          if (jobs.length !== new Set(result.rows.map((row: Record<string, unknown>) => String(row.id ?? ""))).size) {
            await db.update(jobBoardsCache).set({ state: "failed", attemptedAt: now }).where(eq(jobBoardsCache.key, key));
          } else {
            await db.update(jobBoardsCache).set({
              jobs, state: "ok", count: jobs.length, fetchedAt: now, attemptedAt: now,
            }).where(eq(jobBoardsCache.key, key));
          }
        } else {
          await db.update(jobBoardsCache).set({ state: "failed", attemptedAt: now }).where(eq(jobBoardsCache.key, key));
        }
      }
      if (await exited !== 0) throw new Error("Collector exited unsuccessfully");
      logger.info({ boards: seen.size }, "Public job-board collection finished");
    } finally {
      clearTimeout(timeout);
      child.kill("SIGKILL");
    }
  } finally {
    // Missing boards are failed, never treated as empty/closed.
    for (const board of configured) {
      if (!seen.has(board.key)) {
        await db.update(jobBoardsCache).set({ state: "failed", attemptedAt: new Date() }).where(eq(jobBoardsCache.key, board.key));
      }
    }
    await db.update(jobCollectionControl).set({ lockedUntil: new Date(), token: null })
      .where(and(eq(jobCollectionControl.key, "collector"), eq(jobCollectionControl.token, token)));
  }
}
