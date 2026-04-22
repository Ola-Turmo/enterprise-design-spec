import { readJsonFile, writeJsonFile } from "./fs.js";

export type MigrationFormat = "amazon-style-dictionary" | "figma-tokens" | "tokens-studio" | "brandflow" | "basic";

export type MigrationResult = {
  inputFormat: MigrationFormat;
  outputPath: string;
  tokensMigrated: number;
  warnings: string[];
};

export async function migrateFromFormat(
  inputPath: string,
  outputPath: string,
  format: MigrationFormat,
): Promise<MigrationResult> {
  const warnings: string[] = [];
  let tokens: Record<string, unknown>;
  let tokensMigrated = 0;

  switch (format) {
    case "amazon-style-dictionary":
      tokens = await migrateFromStyleDictionary(inputPath);
      break;
    case "figma-tokens":
      tokens = await migrateFromFigmaTokens(inputPath);
      warnings.push("Figma Tokens $type field mapping is best-effort — verify color/dimension types after import");
      break;
    case "tokens-studio":
      tokens = await migrateFromTokensStudio(inputPath);
      break;
    case "brandflow":
      tokens = await migrateFromBrandflow(inputPath);
      break;
    case "basic":
      tokens = await migrateFromBasicJson(inputPath);
      warnings.push("Basic JSON: assumes all $value fields are colors — use --type flags for other types");
      break;
    default:
      throw new Error(`Unknown format: ${format}`);
  }

  tokensMigrated = countTokens(tokens);
  await writeJsonFile(outputPath, tokens);

  return { inputFormat: format, outputPath, tokensMigrated, warnings };
}

function countTokens(tokens: Record<string, unknown>, count = 0): number {
  for (const [, value] of Object.entries(tokens)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if ("$value" in record) {
        count++;
      } else {
        count = countTokens(record, count);
      }
    }
  }
  return count;
}

// Style Dictionary 3.x uses `value` instead of `$value`
async function migrateFromStyleDictionary(inputPath: string): Promise<Record<string, unknown>> {
  const raw = await readJsonFile<Record<string, unknown>>(inputPath);
  return transformStyleDictionaryTokens(raw);
}

function transformStyleDictionaryTokens(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;

      // Style Dictionary primitive — has `value` field
      if ("value" in record && typeof record.value !== "object") {
        result[key] = {
          $type: inferType(record.value),
          $value: record.value,
          ...(record.comment ? { "$description": record.comment } : {}),
          ...(record["_meta"] ? { "$metadata": record._meta } : {}),
        };
      } else {
        result[key] = transformStyleDictionaryTokens(record, newKey);
      }
    }
  }

  return result;
}

function inferType(value: unknown): string {
  if (typeof value === "string") {
    if (value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl")) return "color";
    if (value.includes("px") || value.includes("rem") || value.includes("em")) return "dimension";
    if (value === "normal" || value === "bold" || value === "italic") return "fontWeight";
    if (value === "ease" || value.includes("cubic-bezier")) return "cubic-bezier";
    if (value === "linear") return "linear";
  }
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "dimension";
}

// Figma Tokens plugin format: { [group]: { [token]: { value, type } } }
async function migrateFromFigmaTokens(inputPath: string): Promise<Record<string, unknown>> {
  const raw = await readJsonFile<Record<string, unknown>>(inputPath);
  return transformFigmaTokens(raw);
}

function transformFigmaTokens(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;

      // Figma token primitive
      if ("value" in record) {
        result[key] = {
          $type: mapFigmaType(record.type as string | undefined),
          $value: record.value,
          ...(record.description ? { "$description": record.description } : {}),
        };
      } else {
        result[key] = transformFigmaTokens(record, prefix ? `${prefix}.${key}` : key);
      }
    }
  }

  return result;
}

function mapFigmaType(figmaType?: string): string {
  const map: Record<string, string> = {
    color: "color",
    sizing: "dimension",
    spacing: "dimension",
    borderRadius: "dimension",
    borderWidth: "dimension",
    fontFamilies: "fontFamily",
    fontWeights: "fontWeight",
    fontSizes: "dimension",
    lineHeights: "number",
    letterSpacing: "dimension",
    opacity: "number",
    shadow: "shadow",
    typography: "typography",
  };
  return figmaType ? (map[figmaType] ?? "dimension") : "color";
}

// Tokens Studio format: similar to DTCG but may use different structures
async function migrateFromTokensStudio(inputPath: string): Promise<Record<string, unknown>> {
  // Tokens Studio uses the same $value/$type format as DTCG — pass through
  return readJsonFile<Record<string, unknown>>(inputPath);
}

// Brandflow / sketch-measure format: flat keys like `color-primary`
async function migrateFromBrandflow(inputPath: string): Promise<Record<string, unknown>> {
  const raw = await readJsonFile<Record<string, unknown>>(inputPath);
  return transformBrandflowTokens(raw);
}

function transformBrandflowTokens(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;

      if ("value" in record) {
        const dotted = key.replace(/-/g, ".");
        result[dotted] = {
          $type: inferType(record.value),
          $value: record.value,
        };
      } else {
        result[key] = transformBrandflowTokens(record, prefix ? `${prefix}.${key}` : key);
      }
    }
  }

  return result;
}

// Basic JSON: flat `{ "color.primary": "#000" }` or nested `{ "color": { "primary": "#000" } }`
async function migrateFromBasicJson(inputPath: string): Promise<Record<string, unknown>> {
  const raw = await readJsonFile<Record<string, unknown>>(inputPath);

  const firstKey = Object.keys(raw)[0];
  if (firstKey && firstKey.includes(".")) {
    return transformFlatToNested(raw);
  }

  return raw;
}

function transformFlatToNested(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = {
      $type: inferType(value),
      $value: value,
    };
  }

  return result;
}
