import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import path from "node:path";

const outfile = path.resolve("../../generated-artifacts/jobs-tests.mjs");
await build({
  entryPoints: ["src/lib/job-matching.test.ts"],
  outfile, bundle: true, platform: "node", format: "esm",
});
const result = spawnSync(process.execPath, ["--test", outfile], { stdio: "inherit" });
process.exit(result.status ?? 1);
