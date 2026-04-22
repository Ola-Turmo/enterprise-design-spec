import path from "node:path";
import { findFiles, readJsonFile, writeJsonFile } from "./fs.js";
import { collectTokenPaths } from "./tokens.js";
import StyleDictionary from "style-dictionary";
import { register } from "@tokens-studio/sd-transforms";

export type ExportResult = {
  outputs: { format: string; path: string }[];
  tokenCount: number;
};

export async function exportTokens(
  root: string,
  outputDir: string,
  formats: string[] = ["css", "tailwind", "scss", "json"],
): Promise<ExportResult> {
  const tokenPaths = await findFiles(root, ["tokens/**/*.json"]);
  if (tokenPaths.length === 0) {
    throw new Error("No token files found in tokens/");
  }

  // Merge all token files into one source
  const merged: Record<string, unknown> = {};
  for (const tokenPath of tokenPaths) {
    const tokens = await readJsonFile<Record<string, unknown>>(tokenPath);
    deepMerge(merged, tokens);
  }

  const tokenCount = collectTokenPaths(merged).size;

  // Register sd-transforms
  register(StyleDictionary);

  const resolvedOutputDir = path.resolve(outputDir);

  const outputs: { format: string; path: string }[] = [];

  if (formats.includes("css")) {
    const cssPath = path.join(resolvedOutputDir, "tokens.css");
    const sd = new StyleDictionary({
      // @ts-ignore — StyleDictionary tokens type mismatch with merged Record
      tokens: merged as unknown as DesignTokens,
      platforms: {
        css: {
          transformGroup: "tokens-studio",
          buildPath: path.dirname(cssPath) + "/",
          files: [{ destination: path.basename(cssPath), format: "css/variables" }],
        },
      },
      log: { verbosity: "silent" },
    });
    await sd.buildAllPlatforms();
    outputs.push({ format: "css", path: cssPath });
  }

  if (formats.includes("scss")) {
    const scssPath = path.join(resolvedOutputDir, "_tokens.scss");
    const sd = new StyleDictionary({
      // @ts-ignore — StyleDictionary tokens type mismatch with merged Record
      tokens: merged as unknown as DesignTokens,
      platforms: {
        scss: {
          transformGroup: "tokens-studio",
          buildPath: path.dirname(scssPath) + "/",
          files: [{ destination: path.basename(scssPath), format: "scss/variables" }],
        },
      },
      log: { verbosity: "silent" },
    });
    await sd.buildAllPlatforms();
    outputs.push({ format: "scss", path: scssPath });
  }

  if (formats.includes("tailwind")) {
    const tailwindPath = path.join(resolvedOutputDir, "tokens.tailwind.js");
    // Resolve aliases before generating Tailwind config
    const resolvedForTailwind = resolveAliasesForExport(merged);
    const tailwindConfig = generateTailwindConfig(resolvedForTailwind);
    await writeJsonFile(tailwindPath, tailwindConfig);
    outputs.push({ format: "tailwind", path: tailwindPath });
  }

  if (formats.includes("json")) {
    const jsonPath = path.join(resolvedOutputDir, "tokens.export.json");
    await writeJsonFile(jsonPath, merged);
    outputs.push({ format: "json", path: jsonPath });
  }

  return { outputs, tokenCount };
}

function generateTailwindConfig(tokens: Record<string, unknown>): Record<string, unknown> {
  const colors: Record<string, unknown> = {};
  const fontFamily: Record<string, unknown> = {};
  const fontSize: Record<string, unknown> = {};
  const spacing: Record<string, unknown> = {};
  const borderRadius: Record<string, unknown> = {};

  const extract = (obj: unknown, prefix: string[] = []) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    const record = obj as Record<string, unknown>;
    if ("$value" in record && "$type" in record) {
      const type = String(record.$type);
      const value = record.$value;
      const key = prefix.join(".");

      if (type === "color") {
        if (prefix[0] === "color") {
          const colorName = prefix.slice(1).join(".") || "default";
          colors[colorName] = value;
        }
      } else if (type === "fontFamily") {
        const name = prefix.slice(1).join("-") || "sans";
        fontFamily[name] = value;
      } else if (type === "dimension") {
        if (prefix[0] === "font" && prefix[1] === "size") {
          const size = prefix[2] || "base";
          fontSize[size] = value;
        } else if (prefix[0] === "space") {
          spacing[prefix[1] || "default"] = value;
        } else if (prefix[0] === "radius") {
          borderRadius[prefix[1] || "default"] = value;
        }
      }
      return;
    }
    for (const [k, v] of Object.entries(record)) {
      if (k.startsWith("$")) continue;
      extract(v, [...prefix, k]);
    }
  };

  extract(tokens);

  const result: Record<string, unknown> = { theme: { extend: {} } };
  const extend = result.theme as Record<string, unknown>;
  if (Object.keys(colors).length > 0) extend.colors = colors;
  if (Object.keys(fontFamily).length > 0) extend.fontFamily = fontFamily;
  if (Object.keys(fontSize).length > 0) extend.fontSize = fontSize;
  if (Object.keys(spacing).length > 0) extend.spacing = spacing;
  if (Object.keys(borderRadius).length > 0) extend.borderRadius = borderRadius;

  return result;
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

function resolveAliasesForExport(tokens: Record<string, unknown>): Record<string, unknown> {
  const flat = flattenTokens(tokens);
  const resolved: Record<string, unknown> = {};

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

      record.$value = rawValue;
      resolved[key] = record;
    } else {
      resolved[key] = value;
    }
  }

  // Rebuild nested structure
  const nested: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(resolved)) {
    const parts = key.split(".");
    let current = nested;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  return nested;
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
