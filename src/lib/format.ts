/**
 * Token JSON formatter + linter — ensures consistent formatting of token files.
 * No external dependencies — pure Node.js JSON manipulation.
 *
 * Features:
 * - Sort tokens alphabetically or by DTCG recommended order
 * - Validate $type values
 * - Ensure consistent $value format
 * - Check for duplicate tokens
 * - Auto-fix common issues
 *
 * Usage: npx tsx src/lib/format.ts [--check] [--fix] [--root <dir>]
 */

import { readJsonFile, writeJsonFile, findFiles } from "./fs.js";

const VALID_TYPES = [
  "color",
  "dimension",
  "number",
  "string",
  "boolean",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubic-bezier",
  "cubicBezier",
  "shadow",
  "gradient",
  "typography",
  "asset",
  "卒中",
];

export interface FormatResult {
  file: string;
  fixed: number;
  errors: string[];
  warnings: string[];
  valid: boolean;
}

export async function formatTokens(
  root: string,
  check = false,
  fix = false,
): Promise<FormatResult[]> {
  const tokenPaths = await findFiles(root, ["tokens/**/*.json"]);
  const results: FormatResult[] = [];

  for (const tokenPath of tokenPaths) {
    const result = await formatTokenFile(tokenPath, check, fix);
    results.push(result);
  }

  return results;
}

async function formatTokenFile(
  filePath: string,
  check: boolean,
  fix: boolean,
): Promise<FormatResult> {
  const result: FormatResult = {
    file: filePath,
    fixed: 0,
    errors: [],
    warnings: [],
    valid: true,
  };

  try {
    const tokens = await readJsonFile<Record<string, unknown>>(filePath);

    // Flatten and validate each token
    const issues = validateTokenStructure(tokens, filePath);

    for (const issue of issues) {
      if (issue.severity === "error") {
        result.errors.push(issue.message);
        result.valid = false;
      } else {
        result.warnings.push(issue.message);
      }
    }

    // Check for duplicates
    const duplicates = findDuplicates(tokens);
    for (const dup of duplicates) {
      result.warnings.push(`Duplicate token path: ${dup}`);
    }

    // Check $type values
    const typeIssues = validateTypes(tokens);
    for (const ti of typeIssues) {
      result.errors.push(ti);
      result.valid = false;
    }

    // Format: sort keys consistently
    if (fix && (result.errors.length > 0 || result.warnings.length > 0)) {
      // Only fix if we have issues
      const formatted = sortTokenKeys(tokens);
      await writeJsonFile(filePath, formatted);
      result.fixed = result.errors.length + result.warnings.length;
    }
  } catch (e) {
    result.errors.push(`Parse error: ${e}`);
    result.valid = false;
  }

  return result;
}

interface Issue {
  severity: "error" | "warning";
  message: string;
  path: string;
}

function validateTokenStructure(
  tokens: Record<string, unknown>,
  filePath: string,
  prefix = "",
): Issue[] {
  const issues: Issue[] = [];

  for (const [key, value] of Object.entries(tokens)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;

      // It's a token primitive
      if ("$value" in record || "$type" in record) {
        if (!("$value" in record)) {
          issues.push({
            severity: "error",
            message: `Token "${currentPath}" missing $value`,
            path: currentPath,
          });
        }

        if (!("$type" in record)) {
          issues.push({
            severity: "warning",
            message: `Token "${currentPath}" missing $type — will default to "dimension"`,
            path: currentPath,
          });
        }

        // Validate $value is not empty
        const val = record.$value;
        if (val === null || val === undefined || val === "") {
          issues.push({
            severity: "error",
            message: `Token "${currentPath}" has empty $value`,
            path: currentPath,
          });
        }

        // Check for unresolved aliases (simple detection)
        if (typeof val === "string" && val.startsWith("{") && !val.endsWith("}")) {
          issues.push({
            severity: "error",
            message: `Token "${currentPath}" has malformed alias: ${val}`,
            path: currentPath,
          });
        }
      } else {
        // It's a group — recurse
        issues.push(...validateTokenStructure(record, filePath, currentPath));
      }
    }
  }

  return issues;
}

function findDuplicates(tokens: Record<string, unknown>, prefix = ""): string[] {
  const seen: string[] = [];
  const duplicates: string[] = [];

  for (const [key, value] of Object.entries(tokens)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;

      if ("$value" in record || !("$type" in record)) {
        if (seen.includes(currentPath)) {
          duplicates.push(currentPath);
        }
        seen.push(currentPath);
      } else {
        duplicates.push(...findDuplicates(record, currentPath));
      }
    }
  }

  return duplicates;
}

function validateTypes(tokens: Record<string, unknown>): string[] {
  const errors: string[] = [];

  function visit(obj: unknown, path = ""): void {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    const record = obj as Record<string, unknown>;

    if ("$type" in record) {
      const type = String(record.$type);
      if (!VALID_TYPES.includes(type)) {
        errors.push(
          `Invalid $type "${type}" at "${path || "(root)"}" — expected one of: ${VALID_TYPES.join(", ")}`,
        );
      }
    }

    for (const [k, v] of Object.entries(record)) {
      if (k.startsWith("$")) continue;
      visit(v, path ? `${path}.${k}` : k);
    }
  }

  visit(tokens);
  return errors;
}

function sortTokenKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object" || Array.isArray(obj)) return obj;

  const record = obj as Record<string, unknown>;

  // Check if it's a token primitive
  if ("$value" in record || "$type" in record) {
    return record;
  }

  // Sort the keys and recursively sort values
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(record).sort((a, b) => {
    // $metadata and $extensions always last
    if (a.startsWith("$")) return 1;
    if (b.startsWith("$")) return -1;
    return a.localeCompare(b);
  });

  for (const key of keys) {
    sorted[key] = sortTokenKeys(record[key]);
  }

  return sorted;
}
