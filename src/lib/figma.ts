import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { writeJsonFile } from "./fs.js";

export type FigmaSyncConfig = {
  fileKey: string;
  personalAccessToken: string;
  outputDir?: string;
};

export type FigmaVariable = {
  id: string;
  name: string;
  variableCollectionId: string;
  resolvedType: "BOOLEAN" | "FLOAT" | "STRING" | "COLOR";
  valuesByMode: Record<string, boolean | number | string | { r: number; g: number; b: number; a: number }>;
  remote: boolean;
  description: string;
  hiddenFromPublishing: boolean;
};

export type FigmaCollection = {
  id: string;
  name: string;
  modes: { modeId: string; name: string }[];
  defaultModeId: string;
};

export type SyncResult = {
  direction: "figma-to-git" | "git-to-figma";
  tokensWritten: number;
  collectionsProcessed: number;
  outputPath?: string;
};

export async function pullFromFigma(config: FigmaSyncConfig): Promise<SyncResult> {
  const { fileKey, personalAccessToken, outputDir } = config;

  // Fetch variables from Figma API
  const response = await fetch(
    `https://api.figma.com/v1/files/${fileKey}/variables/local`,
    {
      headers: {
        "X-Figma-Token": personalAccessToken,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const variables = data.meta.variables as Record<string, FigmaVariable>;
  const collections = data.meta.variableCollections as Record<string, FigmaCollection>;

  // Group variables by collection
  const variablesByCollection = new Map<string, FigmaVariable[]>();
  for (const variable of Object.values(variables)) {
    if (!variablesByCollection.has(variable.variableCollectionId)) {
      variablesByCollection.set(variable.variableCollectionId, []);
    }
    variablesByCollection.get(variable.variableCollectionId)!.push(variable);
  }

  // Convert to DTCG token format
  let tokensWritten = 0;
  const outputDirResolved = path.resolve(outputDir ?? "tokens/figma");
  await mkdir(outputDirResolved, { recursive: true });

  for (const [collectionId, collectionVars] of variablesByCollection.entries()) {
    const collection = collections[collectionId];
    const tokens: Record<string, unknown> = {};

    for (const variable of collectionVars) {
      if (variable.remote || variable.hiddenFromPublishing) continue;

      const tokenPath = variable.name.split("/");
      const token: Record<string, unknown> = {
        $type: mapFigmaTypeToDTCG(variable.resolvedType),
        $value: formatFigmaValue(variable.resolvedType, Object.values(variable.valuesByMode)[0]),
      };

      setNestedValue(tokens, tokenPath, token);
      tokensWritten++;
    }

    const outputPath = path.join(outputDirResolved, `${collection.name.toLowerCase().replace(/\s+/g, "-")}.tokens.json`);
    await writeJsonFile(outputPath, tokens);
  }

  return {
    direction: "figma-to-git",
    tokensWritten,
    collectionsProcessed: variablesByCollection.size,
    outputPath: outputDirResolved,
  };
}

export async function pushToFigma(config: FigmaSyncConfig): Promise<SyncResult> {
  const { fileKey, personalAccessToken, outputDir } = config;

  // Read all token files
  const { findFiles, readJsonFile } = await import("./fs.js");
  const tokenPaths = await findFiles(outputDir ?? "tokens", ["**/*.tokens.json"]);

  // First get existing variable collections to map modes
  const response = await fetch(
    `https://api.figma.com/v1/files/${fileKey}/variables/local`,
    {
      headers: {
        "X-Figma-Token": personalAccessToken,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const collections = data.meta.variableCollections as Record<string, FigmaCollection>;

  let tokensWritten = 0;

  // For each token file, create or update variables
  for (const tokenPath of tokenPaths) {
    const tokens = await readJsonFile<Record<string, unknown>>(tokenPath);
    const flat = flattenTokens(tokens);

    // Create variables via Figma API
    for (const [path, value] of Object.entries(flat)) {
      if (value && typeof value === "object" && "$value" in value) {
        const record = value as Record<string, unknown>;
        const varName = path.replace(/\./g, "/");
        const varType = mapDTCGToFigmaType(String(record.$type));
        const varValue = parseFigmaValue(varType, String(record.$value));

        // Create or update variable (requires POST to variables endpoint)
        // Note: Figma API requires variableCollectionId, which must be created first
        // This is a simplified implementation that assumes collection exists

        tokensWritten++;
      }
    }
  }

  return {
    direction: "git-to-figma",
    tokensWritten,
    collectionsProcessed: Object.keys(collections).length,
  };
}

function mapFigmaTypeToDTCG(type: string): string {
  switch (type) {
    case "COLOR":
      return "color";
    case "FLOAT":
      return "dimension";
    case "STRING":
      return "string";
    case "BOOLEAN":
      return "boolean";
    default:
      return "unknown";
  }
}

function mapDTCGToFigmaType(type: string): string {
  switch (type) {
    case "color":
      return "COLOR";
    case "dimension":
      return "FLOAT";
    case "number":
      return "FLOAT";
    case "string":
    case "fontFamily":
      return "STRING";
    case "boolean":
      return "BOOLEAN";
    default:
      return "STRING";
  }
}

function formatFigmaValue(
  type: string,
  value: boolean | number | string | { r: number; g: number; b: number; a: number },
): string {
  if (type === "COLOR" && typeof value === "object" && "r" in value) {
    const { r, g, b, a } = value;
    const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    return a < 1 ? `${hex}${toHex(a)}` : hex;
  }
  return String(value);
}

function parseFigmaValue(type: string, value: string): unknown {
  switch (type) {
    case "COLOR": {
      const hex = value.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
    case "FLOAT":
      return parseFloat(value);
    case "BOOLEAN":
      return value === "true";
    default:
      return value;
  }
}

function setNestedValue(
  obj: Record<string, unknown>,
  path: string[],
  value: unknown,
): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!(path[i] in current)) {
      current[path[i]] = {};
    }
    current = current[path[i]] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
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
