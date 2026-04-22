/**
 * Multi-brand monorepo scanner — discovers all brand systems in a workspace,
 * validates each independently, and runs parallel builds.
 * No external services — pure Node.js + file system scanning.
 *
 * Usage: npx tsx src/lib/monorepo.ts [--root <dir>] [--parallel <n>]
 */

import { readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { execSync } from "node:child_process";
import { readJsonFile } from "./fs.js";

interface BrandSystem {
  name: string;
  path: string;
  tokenCount: number;
  manifestCount: number;
  status: "valid" | "warning" | "error" | "unknown";
  commands: Record<string, number>; // exit codes
  relativePath: string;
}

export async function scanMonorepo(
  root: string,
  parallel = 4,
): Promise<{ brands: BrandSystem[]; summary: MonorepoSummary }> {
  const brandDirs = discoverBrandDirectories(root);

  console.log(`\n🏢 Found ${brandDirs.length} brand system(s) in monorepo\n`);

  // Run builds in parallel batches
  const brands: BrandSystem[] = [];

  for (let i = 0; i < brandDirs.length; i += parallel) {
    const batch = brandDirs.slice(i, i + parallel);
    const results = await Promise.all(
      batch.map((dir) => scanBrand(root, dir)),
    );
    brands.push(...results);
  }

  const summary = buildSummary(brands);

  printReport(brands, summary);

  return { brands, summary };
}

function discoverBrandDirectories(root: string): string[] {
  const dirs: string[] = [];

  // Look for examples/* or brands/* directories with tokens/
  const searchDirs = ["examples", "brands", "."];

  for (const searchDir of searchDirs) {
    const fullPath = join(root, searchDir);
    if (!existsSync(fullPath)) continue;

    try {
      const entries = readdirSync(fullPath);
      for (const entry of entries) {
        const entryPath = join(fullPath, entry);
        const stat = statSync(entryPath);

        if (!stat.isDirectory()) continue;
        if (entry.startsWith(".") || entry.startsWith("node_modules")) continue;

        // Check if this directory has a tokens/ subdirectory
        const tokensDir = join(entryPath, "tokens");
        if (existsSync(tokensDir)) {
          dirs.push(entryPath);
        }
      }
    } catch {
      // ignore permission errors
    }
  }

  return dirs;
}

async function scanBrand(root: string, brandPath: string): Promise<BrandSystem> {
  const name = relative(root, brandPath) || ".";
  const brand: BrandSystem = {
    name,
    path: brandPath,
    tokenCount: 0,
    manifestCount: 0,
    status: "unknown",
    commands: {},
    relativePath: relative(root, brandPath),
  };

  try {
    // Count tokens
    const tokenCount = countTokens(join(brandPath, "tokens"));
    brand.tokenCount = tokenCount;

    // Count manifests
    const manifestCount = countFiles(join(brandPath, "manifests"), ".json");
    brand.manifestCount = manifestCount;

    // Try running validation
    brand.commands = await runBrandCommands(brandPath);

    // Determine status
    if (brand.commands["validate"] === 0 && brand.commands["aliases"] === 0) {
      brand.status = "valid";
    } else if (
      brand.commands["validate"] === undefined &&
      brand.commands["aliases"] === undefined
    ) {
      brand.status = "unknown";
    } else {
      brand.status = "error";
    }
  } catch {
    brand.status = "error";
  }

  return brand;
}

function countTokens(tokensDir: string): number {
  if (!existsSync(tokensDir)) return 0;

  let count = 0;

  function walk(dir: string): void {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else if (full.endsWith(".json") || full.endsWith(".tokens.json")) {
          try {
            const content = require("fs").readFileSync(full, "utf8");
            const tokens = JSON.parse(content);
            count += countTokensRecursive(tokens);
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      // ignore
    }
  }

  walk(tokensDir);
  return count;
}

function countTokensRecursive(obj: unknown, count = 0): number {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const record = obj as Record<string, unknown>;
    if ("$value" in record) {
      return count + 1;
    }
    for (const [, v] of Object.entries(record)) {
      count = countTokensRecursive(v, count);
    }
  }
  return count;
}

function countFiles(dir: string, ext: string): number {
  if (!existsSync(dir)) return 0;

  let count = 0;

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        count += countFiles(full, ext);
      } else if (entry.endsWith(ext)) {
        count++;
      }
    }
  } catch {
    // ignore
  }

  return count;
}

async function runBrandCommands(
  brandPath: string,
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  const commands = [
    { name: "validate", cmd: ["tsx", "src/cli.ts", "validate", "--root", brandPath] },
    { name: "aliases", cmd: ["tsx", "src/cli.ts", "aliases", "--root", brandPath] },
    { name: "contrast", cmd: ["tsx", "src/cli.ts", "contrast", "--root", brandPath] },
  ];

  for (const { name, cmd } of commands) {
    try {
      const output = execSync(cmd.join(" "), {
        cwd: resolve(brandPath, "..", ".."),
        encoding: "utf8",
        timeout: 30000,
        stdio: ["ignore", "pipe", "pipe"],
      });
      results[name] = output.includes("error") || output.includes("failed") ? 1 : 0;
    } catch (e) {
      results[name] = 1;
    }
  }

  return results;
}

interface MonorepoSummary {
  total: number;
  valid: number;
  errors: number;
  warnings: number;
  unknown: number;
  totalTokens: number;
  totalManifests: number;
  brands: string[];
}

function buildSummary(brands: BrandSystem[]): MonorepoSummary {
  const summary: MonorepoSummary = {
    total: brands.length,
    valid: 0,
    errors: 0,
    warnings: 0,
    unknown: 0,
    totalTokens: 0,
    totalManifests: 0,
    brands: [],
  };

  for (const brand of brands) {
    summary.totalTokens += brand.tokenCount;
    summary.totalManifests += brand.manifestCount;

    switch (brand.status) {
      case "valid":
        summary.valid++;
        break;
      case "error":
        summary.errors++;
        break;
      case "warning":
        summary.warnings++;
        break;
      default:
        summary.unknown++;
    }

    summary.brands.push(brand.name);
  }

  return summary;
}

function printReport(brands: BrandSystem[], summary: MonorepoSummary): void {
  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│                    MONOREPO HEALTH REPORT                    │");
  console.log("├─────────────────────────────────────────────────────────────┤");

  const statusIcon = (s: BrandSystem["status"]) =>
    s === "valid" ? "✅" : s === "error" ? "❌" : s === "warning" ? "⚠️" : "❓";

  for (const brand of brands) {
    const tokens = brand.tokenCount.toString().padStart(4, " ");
    const manifests = brand.manifestCount.toString().padStart(3, " ");
    const status = statusIcon(brand.status).padStart(2, " ");
    console.log(
      `│ ${status}  ${brand.name.padEnd(52)} │`,
    );
    console.log(
      `│     tokens: ${tokens}  manifests: ${manifests}                              │`,
    );
  }

  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log(
    `│ ✅ ${summary.valid} valid  ` +
      `❌ ${summary.errors} errors  ` +
      `⚠️ ${summary.warnings} warnings  ` +
      `❓ ${summary.unknown} unknown          │`,
  );
  console.log(
    `│ 📊 Total: ${summary.totalTokens} tokens across ${summary.total} brand(s)                         │`,
  );
  console.log("└─────────────────────────────────────────────────────────────┘\n");

  if (summary.errors > 0) {
    console.log(
      `\n⚠️  ${summary.errors} brand(s) have errors. Run individual validation for details.\n`,
    );
  } else if (summary.valid === summary.total) {
    console.log(`\n🎉 All ${summary.total} brand system(s) are valid!\n`);
  }
}
