import Color from "colorjs.io";
import { findFiles, readJsonFile } from "./fs.js";

function relativeLuminance(hex: string): number {
  const c = new Color(hex);
  const [r, g, b] = c.to("srgb").coords.map((v: number) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastPair = {
  tokenA: string;
  tokenB: string;
  valueA: string;
  valueB: string;
  ratio: number;
  aa: boolean;
  aaLarge: boolean;
  aaa: boolean;
  aaaLarge: boolean;
};

export type ContrastResult = {
  ok: boolean;
  pairs: ContrastPair[];
  failures: ContrastPair[];
};

const CONTRAST_PAIR_RULES: [string, string][] = [
  ["color.text.primary", "color.background.canvas.default"],
  ["color.text.inverse", "color.background.brand.default"],
  ["color.background.brand.default", "color.background.canvas.default"],
  ["color.text.primary", "color.white"],
  ["color.text.inverse", "color.background.brand.inverse"],
  ["theme.light.color.text.default", "theme.light.color.surface.default"],
  ["theme.dark.color.text.default", "theme.dark.color.surface.default"],
];

export async function checkContrast(root: string, target = "4.5"): Promise<ContrastResult> {
  const tokenPaths = await findFiles(root, ["tokens/**/*.json"]);
  const pairs: ContrastPair[] = [];

  // Merge all token files
  const allTokens: Record<string, unknown> = {};
  for (const tokenPath of tokenPaths) {
    const tokens = await readJsonFile<Record<string, unknown>>(tokenPath);
    deepMergeTokens(allTokens, tokens);
  }

  const resolved = resolveTokensWithAliases(allTokens);

  for (const [aRef, bRef] of CONTRAST_PAIR_RULES) {
    const a = getResolvedValue(resolved, aRef);
    const b = getResolvedValue(resolved, bRef);
    if (a && b && isHexColor(a) && isHexColor(b)) {
      const ratio = contrastRatio(a, b);
      pairs.push({
        tokenA: aRef,
        tokenB: bRef,
        valueA: a,
        valueB: b,
        ratio: Math.round(ratio * 100) / 100,
        aa: ratio >= 4.5,
        aaLarge: ratio >= 3,
        aaa: ratio >= 7,
        aaaLarge: ratio >= 4.5,
      });
    }
  }

  const threshold = parseFloat(target);
  const failures = pairs.filter((p) => p.ratio < threshold);

  return {
    ok: failures.length === 0,
    pairs,
    failures,
  };
}

function isHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(value);
}

function getResolvedValue(resolved: Record<string, unknown>, ref: string): string | undefined {
  // resolved is a flat dict with keys like "color.text.primary"
  const value = resolved[ref];
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "$value" in value) {
    return (value as Record<string, unknown>).$value as string;
  }
  return undefined;
}

function resolveTokensWithAliases(tokens: Record<string, unknown>): Record<string, unknown> {
  const flat = flattenTokens(tokens);
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    if (value && typeof value === "object" && "$value" in value) {
      const record = value as Record<string, unknown>;
      let rawValue = String(record.$value);
      let depth = 0;

      while (rawValue.startsWith("{") && rawValue.endsWith("}") && depth < 20) {
        const aliasTarget = rawValue.slice(1, -1);
        const aliased = flat[aliasTarget];
        if (aliased && typeof aliased === "object" && "$value" in aliased) {
          rawValue = String((aliased as Record<string, unknown>).$value);
        } else {
          break;
        }
        depth++;
      }

      resolved[key] = { ...record, $value: rawValue };
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

function flattenTokens(tokens: Record<string, unknown>): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  const visit = (obj: unknown, prefix: string[] = []) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    const record = obj as Record<string, unknown>;
    if ("$value" in record) {
      resolved[prefix.join(".")] = record;
      return;
    }
    for (const [key, child] of Object.entries(record)) {
      if (key.startsWith("$")) continue;
      visit(child, [...prefix, key]);
    }
  };
  visit(tokens, []);
  return resolved;
}

function deepMergeTokens(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMergeTokens(target[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      target[key] = value;
    }
  }
}
