import fg from "fast-glob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, json, "utf8");
}

export async function findFiles(root: string, patterns: string[]): Promise<string[]> {
  const matches = await fg(patterns, {
    cwd: root,
    onlyFiles: true,
    dot: false
  });

  return matches.map((match) => path.join(root, match));
}
