/**
 * Token health dashboard — terminal UI showing token system health metrics.
 * No external services — pure Node.js + ANSI terminal rendering.
 *
 * Usage: npx tsx src/lib/dashboard.ts [--root <dir>]
 */

import { readJsonFile } from "./fs.js";
import { findFiles } from "./fs.js";

interface TokenStats {
  total: number;
  byType: Record<string, number>;
  byGroup: Record<string, number>;
  aliasCount: number;
  brokenAliases: string[];
  colorContrast: { pass: number; fail: number };
  semanticTokens: number;
  primitiveTokens: number;
  themes: string[];
}

export async function generateDashboard(root: string): Promise<void> {
  const stats = await computeStats(root);
  renderDashboard(stats);
}

async function computeStats(root: string): Promise<TokenStats> {
  const tokenPaths = await findFiles(root, ["tokens/**/*.json"]);

  const stats: TokenStats = {
    total: 0,
    byType: {},
    byGroup: {},
    aliasCount: 0,
    brokenAliases: [],
    colorContrast: { pass: 0, fail: 0 },
    semanticTokens: 0,
    primitiveTokens: 0,
    themes: [],
  };

  const allTokens: Record<string, { $value: unknown; $type?: string }> = {};

  for (const tokenPath of tokenPaths) {
    const tokens = await readJsonFile<Record<string, unknown>>(tokenPath);
    const flat = flattenTokens(tokens);

    for (const [key, value] of Object.entries(flat)) {
      const record = value as Record<string, unknown>;

      if (!("$value" in record)) continue;

      stats.total++;
      allTokens[key] = record as { $value: unknown; $type?: string };

      const type = String(record.$type ?? "unknown");
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      const group = key.split(".")[0] ?? key;
      stats.byGroup[group] = (stats.byGroup[group] || 0) + 1;

      // Check if it's an alias
      const rawValue = String(record.$value);
      if (rawValue.startsWith("{") && rawValue.endsWith("}")) {
        stats.aliasCount++;
        const aliasTarget = rawValue.slice(1, -1);
        if (!allTokens[aliasTarget] && !flat[aliasTarget]) {
          stats.brokenAliases.push(`${key} → ${aliasTarget}`);
        }
      }

      // Categorize by path
      if (key.startsWith("theme.")) {
        const themeMatch = key.match(/^theme\.([^.]+)/);
        if (themeMatch && !stats.themes.includes(themeMatch[1])) {
          stats.themes.push(themeMatch[1]);
        }
      }
    }
  }

  // Categorize primitives vs semantic
  stats.primitiveTokens = Object.keys(stats.byGroup).filter(
    (g) =>
      ["color", "spacing", "radius", "shadow", "motion", "typography", "zindex", "sizing"].includes(g),
  ).length;
  stats.semanticTokens = stats.total - stats.primitiveTokens;

  return stats;
}

function flattenTokens(
  tokens: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  const visit = (obj: unknown, path: string[] = []): void => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    const record = obj as Record<string, unknown>;

    if ("$value" in record) {
      resolved[path.join(".")] = record;
      return;
    }

    for (const [k, v] of Object.entries(record)) {
      if (k.startsWith("$")) continue;
      visit(v, [...path, k]);
    }
  };

  visit(tokens, []);
  return resolved;
}

function renderDashboard(stats: TokenStats): void {
  const W = 70;

  const bar = (n: number, max: number, width = 20, char = "█") => {
    const filled = max > 0 ? Math.round((n / max) * width) : 0;
    return char.repeat(filled) + "░".repeat(width - filled);
  };

  const maxCount = Math.max(...Object.values(stats.byType), 1);
  const maxGroup = Math.max(...Object.values(stats.byGroup), 1);

  console.clear();

  printLine(W, "═");
  printCenter("🎨  TOKEN HEALTH DASHBOARD  🎨", W);
  printLine(W, "═");

  // Top-level metrics
  console.log("");
  printBoxedRow("Total Tokens", stats.total.toString(), W);
  printBoxedRow("Aliases", `${stats.aliasCount} (${pct(stats.aliasCount, stats.total)}%)`, W);
  printBoxedRow(
    "Broken Aliases",
    stats.brokenAliases.length === 0 ? "✅ None" : `❌ ${stats.brokenAliases.length}`,
    W,
  );
  printBoxedRow("Themes", stats.themes.join(", ") || "None", W);

  console.log("");
  printLine(W, "─");
  printCenter("TOKEN BREAKDOWN BY TYPE", W);

  const typeEntries = Object.entries(stats.byType).sort((a, b) => b[1] - a[1]);

  for (const [type, count] of typeEntries) {
    const pctStr = pct(count, stats.total).toString().padStart(4, " ");
    console.log(
      `  ${type.padEnd(18)} ${bar(count, maxCount)} ${pctStr}%  (${count})`,
    );
  }

  console.log("");
  printLine(W, "─");
  printCenter("TOKEN BREAKDOWN BY GROUP", W);

  const groupEntries = Object.entries(stats.byGroup).sort((a, b) => b[1] - a[1]).slice(0, 12);

  for (const [group, count] of groupEntries) {
    const pctStr = pct(count, stats.total).toString().padStart(4, " ");
    console.log(
      `  ${group.padEnd(18)} ${bar(count, maxGroup)} ${pctStr}%  (${count})`,
    );
  }

  // Broken aliases detail
  if (stats.brokenAliases.length > 0) {
    console.log("");
    printLine(W, "─");
    printCenter("⚠️  BROKEN ALIASES", W);
    for (const alias of stats.brokenAliases.slice(0, 10)) {
      console.log(`  ❌ ${alias}`);
    }
    if (stats.brokenAliases.length > 10) {
      console.log(`  ... and ${stats.brokenAliases.length - 10} more`);
    }
  }

  // Overall health score
  console.log("");
  printLine(W, "─");

  const healthScore = Math.round(
    (1 - stats.brokenAliases.length / Math.max(stats.aliasCount, 1)) * 100,
  );

  const healthColor =
    healthScore >= 90 ? "🟢" : healthScore >= 70 ? "🟡" : "🔴";

  printCenter(
    `Health Score: ${healthColor} ${healthScore}%  ` +
      `(${stats.total - stats.brokenAliases.length}/${stats.total} tokens healthy)`,
    W,
  );

  console.log("");
  printLine(W, "═");
  console.log(
    `  Generated: ${new Date().toISOString().replace("T", " ").split(".")[0]}`,
  );
  console.log("");
}

function pct(n: number, total: number): string {
  if (total === 0) return "0";
  return Math.round((n / total) * 100).toString();
}

function printLine(width: number, char: string): void {
  console.log(char.repeat(width));
}

function printCenter(text: string, width: number): void {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  console.log(" ".repeat(pad) + text);
}

function printBoxedRow(label: string, value: string, width: number): void {
  const innerWidth = width - 4;
  const valuePad = Math.max(0, innerWidth - label.length - 2);
  console.log(`║  ${label.padEnd(innerWidth - valuePad)}${" ".repeat(valuePad)}  ║`);
  // Can't easily do two-column with single-line approach, simplified:
  const line2 = `║  ${" ".repeat(2)}${value.padEnd(innerWidth)}  ║`;
  console.log(line2);
}
