/**
 * Token visualizer — ASCII/ANSI visualization of token systems.
 * Color palette bars, typography specimens, spacing scales, radius previews.
 * No external services — pure Node.js + ANSI escape codes.
 *
 * Usage: npx tsx src/lib/visualize.ts [--root <dir>] [--type <all|colors|spacing|typography>]
 */

import { readJsonFile, findFiles } from "./fs.js";

export async function visualizeTokens(
  root: string,
  type: "all" | "colors" | "spacing" | "typography" | "motion" = "all",
): Promise<void> {
  const tokenPaths = await findFiles(root, ["tokens/**/*.json"]);

  // Merge all tokens
  const allTokens: Record<string, unknown> = {};
  for (const tokenPath of tokenPaths) {
    const tokens = await readJsonFile<Record<string, unknown>>(tokenPath);
    deepMerge(allTokens, tokens);
  }

  console.log("");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                    🎨  TOKEN VISUALIZER                        ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");

  if (type === "all" || type === "colors") {
    renderColorPalettes(allTokens);
  }

  if (type === "all" || type === "spacing") {
    renderSpacingScale(allTokens);
  }

  if (type === "all" || type === "typography") {
    renderTypography(allTokens);
  }

  if (type === "all" || type === "motion") {
    renderMotionSystem(allTokens);
  }

  console.log("");
}

function renderColorPalettes(tokens: Record<string, unknown>): void {
  console.log("───────────────────────────────────────────────────────────────");
  console.log("  COLOR PALETTES");
  console.log("───────────────────────────────────────────────────────────────");

  // Find all color tokens
  const colorGroups = findColorGroups(tokens);

  for (const [groupName, colors] of Object.entries(colorGroups)) {
    if (colors.length === 0) continue;

    console.log("");
    console.log(`  ${groupName.toUpperCase()}`);

    // Sort by shade/step
    const sorted = colors.sort((a, b) => {
      const aStep = a.name.match(/(\d+)/)?.[1] ?? "0";
      const bStep = b.name.match(/(\d+)/)?.[1] ?? "0";
      return parseInt(aStep) - parseInt(bStep);
    });

    // Render swatches in rows of 12
    const rows: Array<Array<{ name: string; value: string }>> = [];
    for (let i = 0; i < sorted.length; i += 12) {
      rows.push(sorted.slice(i, i + 12));
    }

    for (const row of rows) {
      // Top border
      process.stdout.write("  ");
      for (const color of row) {
        const ansi = hexToAnsi(color.value);
        process.stdout.write(` ${ansi("██████")} `);
      }
      console.log("");

      // Shade label
      process.stdout.write("  ");
      for (const color of row) {
        const step = color.name.match(/(\d+)/)?.[1] ?? "?";
        const hex = color.value.slice(0, 7);
        process.stdout.write(` ${hex.padEnd(6)} `);
      }
      console.log("");
    }
  }

  console.log("");
}

function renderSpacingScale(tokens: Record<string, unknown>): void {
  console.log("───────────────────────────────────────────────────────────────");
  console.log("  SPACING SCALE");
  console.log("───────────────────────────────────────────────────────────────");

  const spacingTokens = flattenTokens(tokens).filter(([key]) => key.startsWith("spacing."));

  for (const [key, value] of spacingTokens) {
    const rawValue = String((value as Record<string, unknown>).$value ?? "0");
    const px = rawValue.replace(/[^\d.]/g, "");
    const numPx = parseFloat(px) || 0;

    // Render proportional bar
    const maxWidth = 40;
    const barWidth = Math.min(Math.round(numPx / 4), maxWidth);

    if (barWidth > 0) {
      const bar = "█".repeat(barWidth);
      console.log(`  ${key.padEnd(30)} ${bar} ${rawValue}`);
    }
  }

  console.log("");
}

function renderTypography(tokens: Record<string, unknown>): void {
  console.log("───────────────────────────────────────────────────────────────");
  console.log("  TYPOGRAPHY");
  console.log("───────────────────────────────────────────────────────────────");

  const fontTokens = flattenTokens(tokens).filter(
    ([key]) => key.startsWith("typography.") || key.startsWith("font."),
  );

  const samples = [
    { name: "Display", text: "The quick brown fox" },
    { name: "Heading", text: "Design systems matter" },
    { name: "Body", text: "Tokens create consistency across platforms and teams." },
    { name: "Caption", text: "Small text for labels and metadata" },
    { name: "Mono", text: "const token = $value;" },
  ];

  for (const sample of samples) {
    console.log(`\n  ${sample.name}:`);
    const truncated = sample.text.slice(0, 50);
    console.log(`  ${truncated}`);
  }

  console.log("");
}

function renderMotionSystem(tokens: Record<string, unknown>): void {
  console.log("───────────────────────────────────────────────────────────────");
  console.log("  MOTION SYSTEM");
  console.log("───────────────────────────────────────────────────────────────");

  const durationTokens = flattenTokens(tokens).filter(([key]) =>
    key.includes("duration") || key.includes("time"),
  );

  for (const [key, value] of durationTokens) {
    const duration = String((value as Record<string, unknown>).$value ?? "0s");
    const ms = durationToMs(duration);

    // Animate a bar over the duration
    const barWidth = 30;
    const steps = 3;
    const stepDelay = ms / steps;

    process.stdout.write(`  ${key.padEnd(30)} `);

    // Simple animation simulation
    for (let s = 0; s <= steps; s++) {
      const filled = Math.round((s / steps) * barWidth);
      const empty = barWidth - filled;
      process.stdout.write(`\r  ${key.padEnd(30)} ${"█".repeat(filled)}${"░".repeat(empty)} ${duration}`);
    }

    console.log("");
  }

  const easingTokens = flattenTokens(tokens).filter(([key]) =>
    key.includes("easing") || key.includes("cubic"),
  );

  console.log("\n  EASING CURVES");
  for (const [key, value] of easingTokens) {
    const easing = String((value as Record<string, unknown>).$value ?? "ease");
    console.log(`  ${key.padEnd(30)} ${easing}`);
  }

  console.log("");
}

// ── Utilities ──────────────────────────────────────────────────────────

function hexToAnsi(hex: string): (text: string) => string {
  const rgb = hexToRgb(hex);
  if (!rgb) return (t: string) => t;

  const r = Math.round(rgb.r);
  const g = Math.round(rgb.g);
  const b = Math.round(rgb.b);

  // Map to 256-color palette
  const ansi = rgbToAnsi256(r, g, b);

  return (text: string) => `\x1b[48;5;${ansi}m${text}\x1b[0m`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function rgbToAnsi256(r: number, g: number, b: number): number {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  return (
    16 +
    36 * Math.round(r / 51) +
    6 * Math.round(g / 51) +
    Math.round(b / 51)
  );
}

function durationToMs(duration: string): number {
  const match = duration.match(/^([\d.]+)(ms|s)$/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  return match[2] === "s" ? value * 1000 : value;
}

function findColorGroups(
  tokens: Record<string, unknown>,
): Record<string, Array<{ name: string; value: string }>> {
  const groups: Record<string, Array<{ name: string; value: string }>> = {};

  const flat = flattenTokens(tokens);
  for (const [key, value] of flat) {
    const record = value as Record<string, unknown>;
    if (record.$type !== "color") continue;

    const parts = key.split(".");
    if (parts.length < 2) continue;

    const group = parts[1]; // e.g., "blue" from "color.blue.600"
    if (!groups[group]) groups[group] = [];

    groups[group].push({
      name: key,
      value: String(record.$value ?? "#000"),
    });
  }

  return groups;
}

function flattenTokens(tokens: Record<string, unknown>): Array<[string, unknown]> {
  const result: Array<[string, unknown]> = [];

  const visit = (obj: unknown, prefix: string[] = []): void => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    const record = obj as Record<string, unknown>;

    if ("$value" in record) {
      result.push([prefix.join("."), record]);
      return;
    }

    for (const [k, v] of Object.entries(record)) {
      if (k.startsWith("$")) continue;
      visit(v, [...prefix, k]);
    }
  };

  visit(tokens, []);
  return result;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      key in target &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      target[key] = value;
    }
  }
}
