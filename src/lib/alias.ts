import path from "node:path";
import { findFiles, readJsonFile } from "./fs.js";
import { collectTokenPaths } from "./tokens.js";

export type AliasNode = {
  ref: string;
  rawValue: string;
  resolvedValue: string | null;
  chain: string[];
  type: string | null;
};

export type AliasResult = {
  ok: boolean;
  errors: string[];
  circularRefs: string[];
  brokenRefs: string[];
  typeMismatches: string[];
  nodes: AliasNode[];
};

export async function resolveAliases(root: string): Promise<AliasResult> {
  const tokenPaths = await findFiles(root, ["tokens/**/*.json"]);
  const allTokens: Record<string, unknown> = {};

  for (const tokenPath of tokenPaths) {
    const tokens = await readJsonFile<Record<string, unknown>>(tokenPath);
    deepMerge(allTokens, tokens);
  }

  const tokenPaths_set = collectTokenPaths(allTokens);
  const errors: string[] = [];
  const circularRefs: string[] = [];
  const brokenRefs: string[] = [];
  const typeMismatches: string[] = [];
  const nodes: AliasNode[] = [];

  // Find all alias references
  const aliases = findAliases(allTokens);

  for (const [tokenPath, aliasRef] of aliases) {
    const chain = resolveChain(allTokens, aliasRef);

    // Check for circular references
    if (hasCircularRef(chain)) {
      circularRefs.push(`token "${tokenPath}" has circular alias chain: ${chain.join(" → ")}`);
      nodes.push({
        ref: tokenPath,
        rawValue: aliasRef,
        resolvedValue: null,
        chain,
        type: null,
      });
      continue;
    }

    // Check if target exists
    const targetPath = aliasRef.replace(/[{}]/g, "");
    if (!tokenPaths_set.has(targetPath)) {
      brokenRefs.push(`token "${tokenPath}" references missing token "${targetPath}"`);
      nodes.push({
        ref: tokenPath,
        rawValue: aliasRef,
        resolvedValue: null,
        chain,
        type: null,
      });
      continue;
    }

    // Check type compatibility
    const sourceType = getTokenType(allTokens, tokenPath);
    const targetType = getTokenType(allTokens, targetPath);
    if (sourceType && targetType && sourceType !== targetType) {
      typeMismatches.push(
        `token "${tokenPath}" (${sourceType}) aliases "${targetPath}" (${targetType}) — type mismatch`,
      );
    }

    // Resolve final value
    const resolved = resolveFinalValue(allTokens, aliasRef);
    nodes.push({
      ref: tokenPath,
      rawValue: aliasRef,
      resolvedValue: resolved,
      chain,
      type: sourceType,
    });
  }

  return {
    ok: circularRefs.length === 0 && brokenRefs.length === 0,
    errors: [...circularRefs, ...brokenRefs, ...typeMismatches],
    circularRefs,
    brokenRefs,
    typeMismatches,
    nodes,
  };
}

function findAliases(
  tokens: Record<string, unknown>,
  prefix: string[] = [],
): [string, string][] {
  const results: [string, string][] = [];

  if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) return results;

  const record = tokens as Record<string, unknown>;

  if ("$value" in record) {
    const value = String(record.$value);
    if (value.startsWith("{") && value.endsWith("}")) {
      results.push([prefix.join("."), value]);
    }
    return results;
  }

  for (const [key, child] of Object.entries(record)) {
    if (key.startsWith("$")) continue;
    results.push(...findAliases(child as Record<string, unknown>, [...prefix, key]));
  }

  return results;
}

function resolveChain(tokens: Record<string, unknown>, ref: string): string[] {
  const chain: string[] = [];
  let current = ref.replace(/[{}]/g, "");

  while (true) {
    chain.push(current);
    if (chain.length > 50) break; // Safety limit

    const value = getRawValue(tokens, current);
    if (!value || typeof value !== "string") break;

    if (value.startsWith("{") && value.endsWith("}")) {
      current = value.replace(/[{}]/g, "");
    } else {
      break;
    }
  }

  return chain;
}

function hasCircularRef(chain: string[]): boolean {
  const seen = new Set<string>();
  for (const item of chain) {
    if (seen.has(item)) return true;
    seen.add(item);
  }
  return false;
}

function getRawValue(tokens: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = tokens;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    const record = current as Record<string, unknown>;
    current = record[part];
  }
  if (current && typeof current === "object" && "$value" in current) {
    return (current as Record<string, unknown>).$value;
  }
  return current;
}

function getTokenType(tokens: Record<string, unknown>, path: string): string | null {
  const parts = path.split(".");
  let current: unknown = tokens;
  for (const part of parts) {
    if (!current || typeof current !== "object") return null;
    const record = current as Record<string, unknown>;
    current = record[part];
  }
  if (current && typeof current === "object" && "$type" in current) {
    return String((current as Record<string, unknown>).$type);
  }
  return null;
}

function resolveFinalValue(tokens: Record<string, unknown>, ref: string): string | null {
  let current = ref.replace(/[{}]/g, "");
  let depth = 0;

  while (depth < 50) {
    const value = getRawValue(tokens, current);
    if (value === undefined || value === null) return null;
    const str = String(value);
    if (str.startsWith("{") && str.endsWith("}")) {
      current = str.replace(/[{}]/g, "");
      depth++;
    } else {
      return str;
    }
  }

  return null; // Circular or too deep
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      target[key] = value;
    }
  }
}
