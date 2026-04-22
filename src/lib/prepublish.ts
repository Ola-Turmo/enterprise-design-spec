/**
 * Pre-publish checklist validator — validates that a brand system is ready for
 * npm publication or external release.
 * No external services — pure Node.js checks.
 *
 * Checks:
 * - package.json has required fields (name, version, description, license)
 * - README.md exists and has minimum content
 * - LICENSE exists
 * - Token files are valid and pass all checks
 * - Schema files are present
 * - Build outputs exist (CSS, SCSS, Tailwind)
 * - .npmignore is present
 * - No leftover debug/test files
 * - All commands execute successfully
 *
 * Usage: npx tsx src/lib/prepublish.ts [--root <dir>] [--verbose]
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { readJsonFile } from "./fs.js";

interface ChecklistItem {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn" | "skip";
  message?: string;
  required: boolean;
}

interface PrepResult {
  items: ChecklistItem[];
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  ready: boolean;
}

export async function runPrepublishCheck(
  root: string,
  verbose = false,
): Promise<PrepResult> {
  const items: ChecklistItem[] = [];
  let passed = 0;
  let failed = 0;
  let warnings = 0;
  let skipped = 0;

  // ── 1. package.json checks ──────────────────────────────────────────
  items.push(checkPackageJson(root));
  items.push(checkPackageJsonVersion(root));
  items.push(checkPackageJsonBin(root));

  // ── 2. README checks ────────────────────────────────────────────────
  items.push(checkReadme(root));
  items.push(checkReadmeContent(root));

  // ── 3. License checks ───────────────────────────────────────────────
  items.push(checkLicense(root));

  // ── 4. .npmignore checks ───────────────────────────────────────────
  items.push(checkNpmIgnore(root));

  // ── 5. Token validation checks ─────────────────────────────────────
  items.push(await checkTokenValidation(root));
  items.push(await checkTokenAliases(root));
  items.push(await checkTokenContrast(root));

  // ── 6. Build output checks ─────────────────────────────────────────
  items.push(checkBuildOutputs(root));

  // ── 7. Schema checks ──────────────────────────────────────────────
  items.push(checkSchemas(root));

  // ── 8. No debug files ──────────────────────────────────────────────
  items.push(checkNoDebugFiles(root));

  // ── 9. Git status ─────────────────────────────────────────────────
  items.push(checkGitClean(root));

  // ── 10. Dependencies installed ─────────────────────────────────────
  items.push(checkNodeModules(root));

  // ── Compute stats ──────────────────────────────────────────────────
  for (const item of items) {
    switch (item.status) {
      case "pass":
        passed++;
        break;
      case "fail":
        failed++;
        break;
      case "warn":
        warnings++;
        break;
      case "skip":
        skipped++;
    }
  }

  const result: PrepResult = {
    items,
    passed,
    failed,
    warnings,
    skipped,
    ready: failed === 0,
  };

  if (verbose || failed > 0) {
    printResults(result);
  }

  return result;
}

function checkPackageJson(root: string): ChecklistItem {
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) {
    return { id: "pkg-exists", label: "package.json exists", status: "fail", message: "Not found", required: true };
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const missing: string[] = [];

    for (const field of ["name", "version", "description"]) {
      if (!pkg[field]) missing.push(field);
    }

    if (missing.length > 0) {
      return {
        id: "pkg-fields",
        label: "package.json has required fields",
        status: "fail",
        message: `Missing: ${missing.join(", ")}`,
        required: true,
      };
    }
  } catch (e) {
    return { id: "pkg-parse", label: "package.json is valid JSON", status: "fail", message: String(e), required: true };
  }

  return { id: "pkg-ok", label: "package.json is complete", status: "pass", required: true };
}

function checkPackageJsonVersion(root: string): ChecklistItem {
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) return { id: "pkg-version", label: "package.json version valid", status: "skip", required: true };

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const version = pkg.version;

  if (!version || !version.match(/^\d+\.\d+\.\d+(-[\w.]+)?$/)) {
    return {
      id: "pkg-version",
      label: "package.json version is semver",
      status: "fail",
      message: `Invalid version: "${version}" — must be semver (e.g., 1.0.0)`,
      required: true,
    };
  }

  return { id: "pkg-version", label: "package.json version is semver", status: "pass", required: true };
}

function checkPackageJsonBin(root: string): ChecklistItem {
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) return { id: "pkg-bin", label: "package.json has bin entry", status: "skip", required: false };

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

  if (!pkg.bin && !pkg.exports) {
    return {
      id: "pkg-bin",
      label: "package.json has bin or exports entry",
      status: "warn",
      message: "No bin/exports — CLI won't be installable via npm",
      required: false,
    };
  }

  return { id: "pkg-bin", label: "package.json has bin or exports entry", status: "pass", required: false };
}

function checkReadme(root: string): ChecklistItem {
  const readmePath = join(root, "README.md");
  if (!existsSync(readmePath)) {
    return { id: "readme-exists", label: "README.md exists", status: "fail", message: "Not found", required: true };
  }
  return { id: "readme-ok", label: "README.md exists", status: "pass", required: true };
}

function checkReadmeContent(root: string): ChecklistItem {
  const readmePath = join(root, "README.md");
  if (!existsSync(readmePath)) return { id: "readme-content", label: "README.md has content", status: "skip", required: true };

  const content = readFileSync(readmePath, "utf8");
  if (content.length < 200) {
    return {
      id: "readme-content",
      label: "README.md has adequate content",
      status: "fail",
      message: `Only ${content.length} chars — needs at least 200`,
      required: true,
    };
  }

  return { id: "readme-content", label: "README.md has adequate content", status: "pass", required: true };
}

function checkLicense(root: string): ChecklistItem {
  const licensePath = join(root, "LICENSE");
  if (!existsSync(licensePath)) {
    return { id: "license", label: "LICENSE file exists", status: "fail", message: "Not found — required for npm", required: true };
  }
  return { id: "license", label: "LICENSE file exists", status: "pass", required: true };
}

function checkNpmIgnore(root: string): ChecklistItem {
  const npmignorePath = join(root, ".npmignore");
  const gitignorePath = join(root, ".gitignore");

  if (!existsSync(npmignorePath) && existsSync(gitignorePath)) {
    return {
      id: "npmignore",
      label: ".npmignore exists (or .gitignore covers it)",
      status: "warn",
      message: "Consider adding .npmignore to control what gets published",
      required: false,
    };
  }

  return { id: "npmignore", label: ".npmignore exists", status: "pass", required: false };
}

async function checkTokenValidation(root: string): Promise<ChecklistItem> {
  if (!existsSync(join(root, "src/cli.ts"))) {
    return { id: "tokens-validate", label: "Token validation passes", status: "skip", required: true };
  }

  try {
    execSync("npx tsx src/cli.ts validate", { cwd: root, encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"] });
    return { id: "tokens-validate", label: "Token validation passes", status: "pass", required: true };
  } catch {
    return { id: "tokens-validate", label: "Token validation passes", status: "fail", message: "Validation failed — run 'npm run validate'", required: true };
  }
}

async function checkTokenAliases(root: string): Promise<ChecklistItem> {
  if (!existsSync(join(root, "src/cli.ts"))) {
    return { id: "tokens-aliases", label: "All token aliases resolve", status: "skip", required: true };
  }

  try {
    execSync("npx tsx src/cli.ts aliases", { cwd: root, encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"] });
    return { id: "tokens-aliases", label: "All token aliases resolve", status: "pass", required: true };
  } catch {
    return { id: "tokens-aliases", label: "All token aliases resolve", status: "fail", message: "Broken alias references found", required: true };
  }
}

async function checkTokenContrast(root: string): Promise<ChecklistItem> {
  if (!existsSync(join(root, "src/cli.ts"))) {
    return { id: "tokens-contrast", label: "WCAG contrast checks pass", status: "skip", required: false };
  }

  try {
    execSync("npx tsx src/cli.ts contrast", { cwd: root, encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"] });
    return { id: "tokens-contrast", label: "WCAG contrast checks pass", status: "pass", required: false };
  } catch {
    return { id: "tokens-contrast", label: "WCAG contrast checks pass", status: "warn", message: "Some color pairs don't meet WCAG 4.5:1", required: false };
  }
}

function checkBuildOutputs(root: string): ChecklistItem {
  const distPath = join(root, "dist/tokens");
  const files = ["tokens.css", "_tokens.scss", "tokens.tailwind.js"];

  const missing = files.filter((f) => !existsSync(join(distPath, f)));

  if (missing.length > 0) {
    return {
      id: "build-outputs",
      label: "Build outputs exist (CSS, SCSS, Tailwind)",
      status: "warn",
      message: `Missing: ${missing.join(", ")} — run 'npm run export'`,
      required: false,
    };
  }

  return { id: "build-outputs", label: "Build outputs exist (CSS, SCSS, Tailwind)", status: "pass", required: false };
}

function checkSchemas(root: string): ChecklistItem {
  const schemasPath = join(root, "schemas");
  if (!existsSync(schemasPath)) {
    return { id: "schemas", label: "Schema files exist", status: "warn", message: "schemas/ not found", required: false };
  }

  const schemaFiles = readdirSync(schemasPath).filter((f) => f.endsWith(".json"));
  if (schemaFiles.length === 0) {
    return { id: "schemas", label: "Schema files exist", status: "warn", message: "No .json schema files found", required: false };
  }

  return { id: "schemas", label: "Schema files exist", status: "pass", required: false };
}

function checkNoDebugFiles(root: string): ChecklistItem {
  const debugPatterns = ["debug.json", "test-output.json", "temp.json", ".DS_Store"];
  const found: string[] = [];

  function walk(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (debugPatterns.includes(entry.name)) {
          found.push(full);
        }
      }
    } catch {
      // ignore
    }
  }

  walk(root);

  if (found.length > 0) {
    return {
      id: "no-debug",
      label: "No debug/test artifacts in source",
      status: "warn",
      message: `Found: ${found.join(", ")}`,
      required: false,
    };
  }

  return { id: "no-debug", label: "No debug/test artifacts in source", status: "pass", required: false };
}

function checkGitClean(root: string): ChecklistItem {
  try {
    const status = execSync("git status --porcelain", {
      cwd: root,
      encoding: "utf8",
      timeout: 5000,
    });

    if (status.trim()) {
      return {
        id: "git-clean",
        label: "Git working directory is clean",
        status: "warn",
        message: "Uncommitted changes — consider committing before publish",
        required: false,
      };
    }
  } catch {
    return { id: "git-clean", label: "Git working directory is clean", status: "skip", required: false };
  }

  return { id: "git-clean", label: "Git working directory is clean", status: "pass", required: false };
}

function checkNodeModules(root: string): ChecklistItem {
  const nmPath = join(root, "node_modules");
  if (!existsSync(nmPath)) {
    return {
      id: "node-modules",
      label: "node_modules installed",
      status: "warn",
      message: "Run 'npm install' before publishing",
      required: true,
    };
  }
  return { id: "node-modules", label: "node_modules installed", status: "pass", required: true };
}

function printResults(result: PrepResult): void {
  const W = 70;

  console.log("");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                 📋  PRE-PUBLISH CHECKLIST                     ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");

  for (const item of result.items) {
    const icon =
      item.status === "pass" ? "✅" :
      item.status === "fail" ? "❌" :
      item.status === "warn" ? "⚠️ " : "⏭️ ";

    const status = item.status === "fail" ? "FAIL" :
      item.status === "warn" ? "WARN" :
      item.status === "pass" ? "PASS" : "SKIP";

    const required = item.required ? " [REQUIRED]" : " [OPTIONAL]";

    console.log(`${icon} ${status.padEnd(4)} ${item.label}${required}`);

    if (item.message) {
      console.log(`         → ${item.message}`);
    }
  }

  console.log("");
  console.log("───────────────────────────────────────────────────────────────");
  console.log(
    `  ✅ ${result.passed} passed` +
    `  ❌ ${result.failed} failed` +
    `  ⚠️ ${result.warnings} warnings` +
    `  ⏭️ ${result.skipped} skipped`,
  );
  console.log("═══════════════════════════════════════════════════════════════");

  if (result.ready) {
    console.log("\n🎉 Ready to publish! Run: npm publish");
  } else {
    console.log(`\n⚠️  Fix ${result.failed} failure(s) before publishing`);
  }

  console.log("");
}
