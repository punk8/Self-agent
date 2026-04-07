import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const threshold = Number.parseFloat(process.env.COVERAGE_THRESHOLD ?? "85");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const run = spawnSync(npmCmd, ["run", "test:coverage:run"], {
  stdio: "inherit",
  env: process.env,
});

if (run.status !== 0) {
  process.exit(run.status ?? 1);
}

const summary = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8"));
const linesPct = summary?.total?.lines?.pct ?? 0;

console.log(`Global line coverage: ${linesPct}%`);

if (linesPct < threshold) {
  console.error(`Coverage check failed: ${linesPct}% < ${threshold}%`);
  process.exit(1);
}

console.log(`Coverage check passed: ${linesPct}% >= ${threshold}%`);
