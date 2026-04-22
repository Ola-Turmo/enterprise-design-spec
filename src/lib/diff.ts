import { findFiles, readJsonFile } from "./fs.js";
import { collectTokenPaths } from "./tokens.js";

export type TokenDiff = {
  path: string;
  $value: string;
  type: string;
};

export type TokenChange = {
  path: string;
  oldValue: string;
  newValue: string;
  type: string;
};

export type DiffResult = {
  added: TokenDiff[];
  removed: TokenDiff[];
  changed: TokenChange[];
};

export async function diffTokens(
  root: string,
  basePath: string,
  headPath: string,
): Promise<DiffResult> {
  const baseTokens = await loadAllTokens(root, basePath);
  const headTokens = await loadAllTokens(root, headPath);

  const added: TokenDiff[] = [];
  const removed: TokenDiff[] = [];
  const changed: TokenChange[] = [];

  // Find added and changed tokens
  for (const [path, head] of Object.entries(headTokens)) {
    if (!(path in baseTokens)) {
      added.push({ path, $value: head.$value, type: head.$type });
    } else if (baseTokens[path].$value !== head.$value) {
      changed.push({
        path,
        oldValue: baseTokens[path].$value,
        newValue: head.$value,
        type: head.$type,
      });
    }
  }

  // Find removed tokens
  for (const [path, base] of Object.entries(baseTokens)) {
    if (!(path in headTokens)) {
      removed.push({ path, $value: base.$value, type: base.$type });
    }
  }

  return { added, removed, changed };
}

async function loadAllTokens(
  root: string,
  tokenDir: string,
): Promise<Record<string, { $value: string; $type: string }>> {
  const result: Record<string, { $value: string; $type: string }> = {};
  const tokenPaths = await findFiles(tokenDir, ["**/*.json"]);

  for (const tokenPath of tokenPaths) {
    const tokens = await readJsonFile<Record<string, unknown>>(tokenPath);
    const paths = collectTokenPaths(tokens);

    for (const tokenPath_str of paths) {
      const value = getLeafValue(tokens, tokenPath_str);
      if (value) {
        result[tokenPath_str] = value;
      }
    }
  }

  return result;
}

function getLeafValue(
  tokens: Record<string, unknown>,
  path: string,
): { $value: string; $type: string } | null {
  const parts = path.split(".");
  let current: unknown = tokens;

  for (const part of parts) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }

  if (current && typeof current === "object" && "$value" in current) {
    return {
      $value: String((current as Record<string, unknown>).$value),
      $type: String((current as Record<string, unknown>).$type ?? "unknown"),
    };
  }

  return null;
}
