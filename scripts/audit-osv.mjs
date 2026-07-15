// Dependency CVE gate for CI (replaces `pnpm audit --prod --audit-level=high`,
// whose registry endpoint npm retired with HTTP 410 in July 2026).
//
// Scans the PRODUCTION dependency graph against the OSV.dev database and
// exits 1 on any HIGH/CRITICAL advisory. MODERATE/LOW are printed as
// warnings but do not fail the build.
//
// Usage: node scripts/audit-osv.mjs   (run from repo root)
import { execSync } from "node:child_process";

const BLOCK_SEVERITIES = new Set(["HIGH", "CRITICAL"]);

function collectProdPackages() {
  const raw = execSync("pnpm ls -r --prod --depth Infinity --json", {
    maxBuffer: 256 * 1024 * 1024,
    encoding: "utf8",
  });
  const pkgs = new Set();
  const walk = (deps) => {
    if (!deps) return;
    for (const [name, info] of Object.entries(deps)) {
      if (!info?.version || info.version.startsWith("link:")) {
        walk(info?.dependencies);
        continue;
      }
      const key = `${name}@${info.version}`;
      if (!pkgs.has(key)) {
        pkgs.add(key);
        walk(info.dependencies);
      }
    }
  };
  for (const project of JSON.parse(raw)) walk(project.dependencies);
  return [...pkgs];
}

async function osvQueryBatch(packages) {
  const hits = [];
  for (let i = 0; i < packages.length; i += 900) {
    const batch = packages.slice(i, i + 900);
    const res = await fetch("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        queries: batch.map((key) => {
          const at = key.lastIndexOf("@");
          return {
            package: { name: key.slice(0, at), ecosystem: "npm" },
            version: key.slice(at + 1),
          };
        }),
      }),
    });
    if (!res.ok) throw new Error(`OSV querybatch ${res.status}: ${await res.text()}`);
    const { results } = await res.json();
    results.forEach((r, j) => {
      if (r.vulns?.length) hits.push({ pkg: batch[j], ids: r.vulns.map((v) => v.id) });
    });
  }
  return hits;
}

function cvssScoreToSeverity(score) {
  if (score >= 9) return "CRITICAL";
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MODERATE";
  return "LOW";
}

async function vulnSeverity(id) {
  const res = await fetch(`https://api.osv.dev/v1/vulns/${id}`);
  if (!res.ok) return { id, severity: "UNKNOWN", summary: "" };
  const v = await res.json();
  let severity = (v.database_specific?.severity ?? "").toUpperCase();
  if (!severity && Array.isArray(v.severity)) {
    // Fall back to CVSS vector scoring when GHSA severity label is absent.
    const cvss = v.severity.find((s) => s.type?.startsWith("CVSS"));
    const base = cvss ? Number(/\/?([0-9.]+)$/.exec(cvss.score)?.[1]) : NaN;
    if (!Number.isNaN(base) && cvss.score.includes(":") === false) severity = cvssScoreToSeverity(base);
  }
  return { id, severity: severity || "UNKNOWN", summary: v.summary ?? "" };
}

const packages = collectProdPackages();
console.log(`Scanning ${packages.length} production packages against OSV.dev ...`);

const hits = await osvQueryBatch(packages);
if (hits.length === 0) {
  console.log("PASS: no known advisories in the production dependency graph.");
  process.exit(0);
}

let failed = false;
for (const hit of hits) {
  for (const id of hit.ids) {
    const { severity, summary } = await vulnSeverity(id);
    const line = `${severity.padEnd(8)} ${hit.pkg}  ${id}  ${summary}`;
    // UNKNOWN severity fails closed: a gate that can't read the label
    // must not silently wave a real advisory through.
    if (BLOCK_SEVERITIES.has(severity) || severity === "UNKNOWN") {
      failed = true;
      console.error(`BLOCK  ${line}`);
    } else {
      console.warn(`warn   ${line}`);
    }
  }
}

if (failed) {
  console.error("\nFAIL: high/critical (or unclassifiable) advisories found in production dependencies.");
  process.exit(1);
}
console.log("\nPASS: advisories present but none high/critical.");
