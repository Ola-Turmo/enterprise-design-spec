import { findFiles, readJsonFile, writeJsonFile, writeTextFile } from "./fs.js";
import path from "node:path";
import { mkdir, readFile } from "node:fs/promises";

export type SnapshotResult = {
  passed: number;
  failed: number;
  missing: number;
};

export async function runSnapshotTests(
  root: string,
  goldenDir: string,
): Promise<SnapshotResult> {
  const tokenPaths = await findFiles(root, ["tokens/**/*.json"]);
  
  let passed = 0;
  let failed = 0;
  let missing = 0;

  for (const tokenPath of tokenPaths) {
    const goldenPath = path.join(goldenDir, tokenPath);
    const tokens = await readJsonFile(tokenPath);
    const snapshot = createSnapshot(tokens);

    try {
      const goldenContent = await readFile(goldenPath, "utf-8");
      const golden = JSON.parse(goldenContent);
      
      if (
        JSON.stringify(golden.snapshot) === JSON.stringify(snapshot) &&
        golden.tokenCount === snapshot.tokenCount
      ) {
        passed++;
      } else {
        failed++;
        console.log(`Snapshot mismatch: ${tokenPath}`);
        console.log(`  Expected ${golden.tokenCount} tokens, got ${snapshot.tokenCount}`);
      }
    } catch {
      missing++;
      console.log(`Missing golden file: ${goldenPath}`);
    }
  }

  return { passed, failed, missing };
}

export async function updateGoldenFiles(
  root: string,
  goldenDir: string,
): Promise<number> {
  const tokenPaths = await findFiles(root, ["tokens/**/*.json"]);
  let updated = 0;

  for (const tokenPath of tokenPaths) {
    const goldenPath = path.join(goldenDir, tokenPath);
    const tokens = await readJsonFile(tokenPath);
    const snapshot = createSnapshot(tokens);

    await mkdir(path.dirname(goldenPath), { recursive: true });
    await writeJsonFile(goldenPath, {
      snapshot,
      tokenCount: snapshot.tokenCount,
      lastUpdated: new Date().toISOString(),
    });

    updated++;
  }

  return updated;
}

function createSnapshot(tokens: Record<string, unknown>): Record<string, unknown> {
  const flat = flattenTokens(tokens);
  const summary: Record<string, unknown> = {
    total: Object.keys(flat).length,
    byType: {} as Record<string, number>,
    byGroup: {} as Record<string, number>,
    tokenCount: 0,
  };

  for (const [key, value] of Object.entries(flat)) {
    if (value && typeof value === "object" && "$type" in value) {
      const type = String((value as Record<string, unknown>).$type);
      const byType = summary.byType as Record<string, number>;
      byType[type] = (byType[type] || 0) + 1;

      const group = key.split(".")[0];
      const byGroup = summary.byGroup as Record<string, number>;
      byGroup[group] = (byGroup[group] || 0) + 1;
    }
  }

  (summary as Record<string, unknown>).tokenCount = (summary as Record<string, unknown>).total;
  return summary;
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
