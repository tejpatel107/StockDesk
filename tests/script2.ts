import { setTimeout as sleep } from "node:timers/promises";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:8000/api";
const URL_PATH = `${BASE}/orders?pageSize=100&status=CANCELLED`;

const CONCURRENCIES = [5, 10, 20, 50, 100, 500];
const DURATIONS_MS = [1000, 2000, 5000, 10000];
const COOLDOWN_MS = 2000; // pause between scenarios so the server can settle

interface Stats {
  completed: number;
  failed: number;
}

interface Result {
  Concurrency: number;
  Duration_MS: number;
  "Total Requests": number;
  "Success %": number;
  Failure: number;
  "Rate (req/sec)": number;
}

const HEADERS: (keyof Result)[] = [
  "Concurrency",
  "Duration_MS",
  "Total Requests",
  "Success %",
  "Failure",
  "Rate (req/sec)",
];

// ---------- load generation ----------

async function worker(end: number, token: string, stats: Stats) {
  while (Date.now() < end) {
    try {
      const res = await fetch(URL_PATH, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await res.text(); // release the connection
      if (res.status === 200) stats.completed++;
      else stats.failed++;
    } catch {
      stats.failed++;
    }
  }
}

async function runScenario(
  token: string,
  concurrency: number,
  durationMs: number
): Promise<Result> {
  const stats: Stats = { completed: 0, failed: 0 };
  const start = Date.now();
  const end = start + durationMs;

  await Promise.all(
    Array.from({ length: concurrency }, () => worker(end, token, stats))
  );

  const secs = (Date.now() - start) / 1000;
  const total = stats.completed + stats.failed;

  return {
    Concurrency: concurrency,
    Duration_MS: durationMs,
    "Total Requests": total,
    "Success %": total ? Math.round((stats.completed / total) * 100) : 0,
    Failure: stats.failed,
    "Rate (req/sec)": Math.round(stats.completed / secs),
  };
}

// ---------- report writers ----------

const csvEscape = (v: unknown) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const csvRow = (r: Result) => HEADERS.map((h) => csvEscape(r[h])).join(",");

function buildMarkdown(results: Result[], runAt: string): string {
  const lines: string[] = [];
  lines.push("# Load Test Results", "");
  lines.push(`- **Run at:** ${runAt}`);
  lines.push(`- **Endpoint:** \`GET ${URL_PATH}\``);
  lines.push(`- **Concurrency levels:** ${CONCURRENCIES.join(", ")}`);
  lines.push(`- **Durations (ms):** ${DURATIONS_MS.join(", ")}`);
  lines.push(`- **Cooldown between runs:** ${COOLDOWN_MS} ms`, "");
  lines.push(`| ${HEADERS.join(" | ")} |`);
  lines.push(`| ${HEADERS.map(() => "---:").join(" | ")} |`);
  for (const r of results) {
    lines.push(`| ${HEADERS.map((h) => r[h]).join(" | ")} |`);
  }
  lines.push(
    "",
    "**Notes**",
    "",
    "- *Rate* = successful (HTTP 200) requests per second.",
    "- *Success %* = successful requests / total requests, rounded.",
    "- A single warm-up request is sent before testing and is not counted."
  );
  return lines.join("\n") + "\n";
}

function buildHtml(results: Result[], runAt: string): string {
  const cls = (pct: number) => (pct >= 95 ? "good" : pct >= 70 ? "warn" : "bad");

  const rows = results
    .map(
      (r) => `
      <tr>
        <td>${r.Concurrency}</td>
        <td>${r.Duration_MS}</td>
        <td>${r["Total Requests"]}</td>
        <td class="${cls(r["Success %"])}">${r["Success %"]}</td>
        <td>${r.Failure}</td>
        <td>${r["Rate (req/sec)"]}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Load Test Results</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #1f2937; }
  h1 { margin-bottom: .25rem; }
  .meta { color: #6b7280; margin-bottom: 1.5rem; font-size: .9rem; }
  table { border-collapse: collapse; min-width: 640px; }
  th, td { border: 1px solid #e5e7eb; padding: .5rem .9rem; text-align: right; }
  th { background: #f3f4f6; }
  tbody tr:nth-child(even) { background: #fafafa; }
  td.good { color: #047857; font-weight: 600; }
  td.warn { color: #b45309; font-weight: 600; }
  td.bad  { color: #b91c1c; font-weight: 600; }
  .legend { margin-top: 1rem; font-size: .85rem; color: #6b7280; }
</style>
</head>
<body>
  <h1>Load Test Results</h1>
  <div class="meta">
    Run at ${runAt}<br>
    Endpoint: <code>GET ${URL_PATH}</code>
  </div>
  <table>
    <thead>
      <tr>${HEADERS.map((h) => `<th>${h}</th>`).join("")}</tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>
  <div class="legend">
    Success %: green &ge; 95, amber 70&ndash;94, red &lt; 70.
    Rate = successful requests per second.
  </div>
</body>
</html>
`;
}

// ---------- main ----------

async function main() {
  const runAt = new Date().toISOString();
  const outDir = join(
    "load-test-results",
    runAt.replace(/[:.]/g, "-")
  );
  mkdirSync(outDir, { recursive: true });

  const csvPath = join(outDir, "results.csv");
  writeFileSync(csvPath, HEADERS.map(csvEscape).join(",") + "\n", "utf8");

  const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "tej@acedataanalytics.com",
      password: "P@ssw0rd",
    }),
  });
  if (!login.ok) {
    throw new Error(`Login failed with status ${login.status}`);
  }
  const { jwt: token } = await login.json();

  // Warm-up (cold-start request, not part of the results)
  const warmStart = Date.now();
  const warm = await fetch(URL_PATH, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await warm.text();
  console.log(
    `First Request Time---> ${(Date.now() - warmStart) / 1000}s, status: ${warm.status}\n`
  );

  const results: Result[] = [];

  try {
    for (const concurrency of CONCURRENCIES) {
      for (const duration of DURATIONS_MS) {
        console.log(`Running concurrency=${concurrency}, duration=${duration}ms ...`);
        const result = await runScenario(token, concurrency, duration);
        results.push(result);

        // Save incrementally so a crash doesn't lose earlier results
        appendFileSync(csvPath, csvRow(result) + "\n", "utf8");

        await sleep(COOLDOWN_MS);
      }
    }
  } finally {
    // Always write the reports, even if the run was interrupted midway
    if (results.length) {
      console.log("\n=== Results ===");
      console.table(results);

      writeFileSync(join(outDir, "report.html"), buildHtml(results, runAt), "utf8");
      writeFileSync(join(outDir, "README.md"), buildMarkdown(results, runAt), "utf8");

      console.log(`\nFiles written to ${outDir}/`);
      console.log("  - results.csv  (open in Excel / Sheets)");
      console.log("  - report.html  (open in a browser)");
      console.log("  - README.md    (markdown table)");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});