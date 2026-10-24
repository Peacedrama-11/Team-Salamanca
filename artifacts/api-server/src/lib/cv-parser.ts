import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { explicitExperience, extractSkills } from "./cv-skills";

const script = existsSync(path.resolve("src/jobs/parse_cv.py"))
  ? path.resolve("src/jobs/parse_cv.py") : path.resolve("artifacts/api-server/src/jobs/parse_cv.py");
const managedPython = path.resolve(path.dirname(script), "../../../../.pythonlibs/bin/python3");

export async function parseCv(bytes: Buffer, kind: "pdf" | "docx") {
  const text = await new Promise<string>((resolve, reject) => {
    const child = spawn(existsSync(managedPython) ? managedPython : "python3", [script, kind], {
      // No database/session secrets, document filenames, or user email in child.
      env: { PATH: process.env.PATH, HOME: process.env.HOME, PYTHONPATH: process.env.PYTHONPATH,
        PYTHONDONTWRITEBYTECODE: "1", LANG: "C.UTF-8" },
      stdio: ["pipe", "pipe", "ignore"],
    });
    let output = "", size = 0;
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Reading this document timed out. Try a simpler CV or enter skills manually."));
    }, 12_000);
    child.on("error", () => { clearTimeout(timeout); reject(new Error("CV parsing is unavailable. You can still enter skills manually.")); });
    child.stdout.on("data", (part: Buffer) => {
      size += part.length;
      if (size > 2 * 1024 * 1024) { child.kill("SIGKILL"); return; }
      output += part.toString("utf8");
    });
    child.stdin.on("error", () => { /* Early parser exit is reported through close. */ });
    child.on("close", code => {
      clearTimeout(timeout);
      try {
        if (code !== 0 || size > 2 * 1024 * 1024) throw new Error();
        const parsed = JSON.parse(output);
        if (typeof parsed.error === "string") { reject(new Error(parsed.error)); return; }
        if (typeof parsed.text !== "string" || parsed.text.length > 250_000) throw new Error();
        resolve(parsed.text);
      } catch { reject(new Error("This document could not be read safely. Try a simpler CV or enter skills manually.")); }
    });
    child.stdin.end(bytes);
  });
  const experienceYears = explicitExperience(text);
  const skills = extractSkills(text).slice(0, 40).map(name => ({ name, level: "unspecified" as const }));
  return {
    skills, experienceYears,
    warnings: [
      "Review all extracted skills. Dictionary recognition is incomplete and does not assess proficiency.",
      ...(experienceYears === null ? ["Experience could not be identified unambiguously. Leave it unknown or enter your confirmed years."] : []),
      ...(!skills.length ? ["No dictionary skills recognized. Add your skills manually."] : []),
    ],
  };
}
