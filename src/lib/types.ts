import { findFiles, readJsonFile, writeTextFile } from "./fs.js";

export type TypeGenResult = {
  outputPath: string;
  tokenCount: number;
  typeCount: number;
};

export async function generateTypes(
  root: string,
  outputPath: string,
): Promise<TypeGenResult> {
  const tokenPaths = await findFiles(root, ["tokens/**/*.json"]);
  const allTokens: Record<string, unknown> = {};

  for (const tokenPath of tokenPaths) {
    const tokens = await readJsonFile<Record<string, unknown>>(tokenPath);
    deepMergeTokens(allTokens, tokens);
  }

  const flat = flattenTokens(allTokens);
  const resolved = resolveAliasesForTypeGen(flat);

  const types = generateTypeScriptTypes(resolved);
  const typeCount = countTypes(types);

  const content = `// Auto-generated from design tokens — do not edit manually
// Generated at: ${new Date().toISOString()}

${types}
`;

  await writeTextFile(outputPath, content);

  return {
    outputPath,
    tokenCount: Object.keys(flat).length,
    typeCount,
  };
}

function generateTypeScriptTypes(
  tokens: Record<string, { $value: string; $type: string }>,
): string {
  const lines: string[] = [];

  lines.push("export interface DesignTokens {");

  // Generate nested interface structure
  const nested = buildNestedStructure(tokens);
  const nestedTypes = generateNestedInterface("  ", nested);
  lines.push(...nestedTypes);

  lines.push("}");
  lines.push("");

  // Generate CSS custom property names
  lines.push("export type TokenName = ");
  const names = Object.keys(tokens).map((k) => `  | "${k}"`);
  lines.push(...names);
  lines.push("");

  // Generate CSS variable map
  lines.push("export const tokenMap: Record<TokenName, string> = {");
  for (const [key, token] of Object.entries(tokens)) {
    lines.push(`  "${key}": "${token.$value}",`);
  }
  lines.push("};");
  lines.push("");

  // Generate CSS custom property names for use in styles
  lines.push("export const cssVars: Record<TokenName, string> = {");
  for (const key of Object.keys(tokens)) {
    const cssName = key.replace(/\./g, "-");
    lines.push(`  "${key}": "--${cssName}",`);
  }
  lines.push("};");

  return lines.join("\n");
}

function buildNestedStructure(
  tokens: Record<string, { $value: string; $type: string }>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(tokens)) {
    const parts = key.split(".");
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    const token = tokens[key];
    current[parts[parts.length - 1]] = {
      $value: token.$value,
      $type: token.$type,
    };
  }

  return result;
}

function generateNestedInterface(
  indent: string,
  obj: Record<string, unknown>,
): string[] {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (
      value &&
      typeof value === "object" &&
      "$value" in (value as Record<string, unknown>)
    ) {
      const token = value as Record<string, unknown>;
      const type = mapTypeToTS(token.$type as string, token.$value as string);
      lines.push(`${indent}${key}: ${type};`);
    } else if (value && typeof value === "object") {
      lines.push(`${indent}${key}: {`);
      lines.push(...generateNestedInterface(`${indent}  `, value as Record<string, unknown>));
      lines.push(`${indent}};`);
    }
  }

  return lines;
}

function mapTypeToTS(type: string, value: string): string {
  switch (type) {
    case "color":
      return `string // "${value}"`;
    case "dimension":
      return `string // "${value}"`;
    case "fontFamily":
      return `string // "${value}"`;
    case "fontWeight":
      return `number`;
    case "duration":
      return `string // "${value}"`;
    case "number":
      return `number`;
    case "cubicBezier":
      return `[number, number, number, number]`;
    case "shadow":
      return `object`;
    default:
      return `string`;
  }
}

function countTypes(types: string): number {
  return (types.match(/:/g) || []).length;
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
    for (const [k, v] of Object.entries(record)) {
      if (k.startsWith("$")) continue;
      visit(v, [...prefix, k]);
    }
  };
  visit(tokens, []);
  return resolved;
}

function resolveAliasesForTypeGen(
  flat: Record<string, unknown>,
): Record<string, { $value: string; $type: string }> {
  const resolved: Record<string, { $value: string; $type: string }> = {};

  for (const [key, value] of Object.entries(flat)) {
    if (value && typeof value === "object" && "$value" in value) {
      const record = { ...value } as Record<string, unknown>;
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

      resolved[key] = {
        $value: rawValue,
        $type: String(record.$type),
      };
    }
  }

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
