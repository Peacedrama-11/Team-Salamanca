import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import path from "node:path";

const outdir = path.resolve("../../generated-artifacts/api-tests");
const fixtureDir = path.resolve("../../generated-artifacts/cv-fixtures");
const fixtureResult = spawnSync("python3", ["src/jobs/cv_fixtures.py", fixtureDir], { stdio: "inherit" });
if (fixtureResult.status !== 0) process.exit(1);
const names = ["job-matching", "cv-matching", "cv-api"];
await build({
  entryPoints: names.map(name => `src/lib/${name}.test.ts`),
  outdir, bundle: true, platform: "node", format: "esm", outExtension: { ".js": ".mjs" },
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
});
const result = spawnSync(process.execPath, ["--test", ...names.map(name => path.join(outdir, `${name}.test.mjs`))], { stdio: "inherit" });
process.exit(result.status ?? 1);
