/**
 * Token diff viewer — generates a standalone HTML diff between two token versions.
 * No external services — pure Node.js + git diff + HTML generation.
 *
 * Usage: npx tsx src/lib/diff-viewer.ts --base <sha> --head <sha> --output <file.html>
 */

import { execSync } from "node:child_process";
import { readJsonFile } from "./fs.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

interface DiffEntry {
  path: string;
  type: "added" | "removed" | "modified" | "renamed" | "unchanged";
  oldValue?: unknown;
  newValue?: unknown;
  oldType?: string;
  newType?: string;
}

export async function generateDiffViewer(
  root: string,
  baseRef: string,
  headRef: string,
  outputPath: string,
): Promise<void> {
  const diff = await computeTokenDiff(root, baseRef, headRef);
  const html = buildDiffHtml(diff, baseRef, headRef);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html);
  console.log(`Diff viewer generated: ${outputPath}`);
}

async function computeTokenDiff(
  root: string,
  baseRef: string,
  headRef: string,
): Promise<DiffEntry[]> {
  const diff: DiffEntry[] = [];

  // Get list of changed token files
  let changedFiles: string[] = [];
  try {
    const output = execSync(
      `git diff --name-status ${baseRef} ${headRef} -- "tokens/*.json" "tokens/**/*.json"`,
      { cwd: root, encoding: "utf8", timeout: 10000 },
    );
    changedFiles = output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [, ...rest] = line.split("\t");
        return rest.join("\t");
      });
  } catch {
    return diff;
  }

  for (const file of changedFiles) {
    try {
      // Get old version
      let oldTokens: Record<string, unknown> = {};
      try {
        const oldContent = execSync(`git show ${baseRef}:${file}`, {
          cwd: root,
          encoding: "utf8",
          timeout: 5000,
        });
        oldTokens = JSON.parse(oldContent);
      } catch {
        // File didn't exist in base
      }

      // Get new version
      let newTokens: Record<string, unknown> = {};
      try {
        const newContent = execSync(`git show ${headRef}:${file}`, {
          cwd: root,
          encoding: "utf8",
          timeout: 5000,
        });
        newTokens = JSON.parse(newContent);
      } catch {
        // File doesn't exist in head
      }

      const oldFlat = flattenTokens(oldTokens);
      const newFlat = flattenTokens(newTokens);

      const allKeys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)]);

      for (const key of allKeys) {
        const oldEntry = oldFlat[key];
        const newEntry = newFlat[key];

        const oldVal = oldEntry ? String((oldEntry as Record<string, unknown>).$value ?? "") : undefined;
        const newVal = newEntry ? String((newEntry as Record<string, unknown>).$value ?? "") : undefined;

        if (!oldEntry && newEntry) {
          diff.push({
            path: `${file}:${key}`,
            type: "added",
            newValue: newVal,
            newType: String((newEntry as Record<string, unknown>).$type ?? "unknown"),
          });
        } else if (oldEntry && !newEntry) {
          diff.push({
            path: `${file}:${key}`,
            type: "removed",
            oldValue: oldVal,
            oldType: String((oldEntry as Record<string, unknown>).$type ?? "unknown"),
          });
        } else if (oldVal !== newVal) {
          diff.push({
            path: `${file}:${key}`,
            type: "modified",
            oldValue: oldVal,
            newValue: newVal,
            oldType: String((oldEntry as Record<string, unknown>).$type ?? "unknown"),
            newType: String((newEntry as Record<string, unknown>).$type ?? "unknown"),
          });
        }
      }
    } catch {
      // Skip files that can't be parsed
    }
  }

  return diff;
}

function flattenTokens(tokens: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  const visit = (obj: unknown, path: string[] = []): void => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    const record = obj as Record<string, unknown>;

    if ("$value" in record) {
      resolved[path.join(".")] = record;
      return;
    }

    for (const [k, v] of Object.entries(record)) {
      if (k.startsWith("$")) continue;
      visit(v, [...path, k]);
    }
  };

  visit(tokens, []);
  return resolved;
}

function buildDiffHtml(diff: DiffEntry[], baseRef: string, headRef: string): string {
  const added = diff.filter((d) => d.type === "added");
  const removed = diff.filter((d) => d.type === "removed");
  const modified = diff.filter((d) => d.type === "modified");

  const rows = diff.map((d) => {
    const icon = d.type === "added" ? "✨" : d.type === "removed" ? "🔥" : "📝";
    const rowClass = d.type;
    const fileName = d.path.split(":")[0];
    const tokenPath = d.path.split(":").slice(1).join(":");

    const oldCell =
      d.oldValue !== undefined
        ? `<td class="old"><code>${String(d.oldValue)}</code></td>`
        : `<td></td>`;
    const newCell =
      d.newValue !== undefined
        ? `<td class="new"><code>${String(d.newValue)}</code></td>`
        : `<td></td>`;

    return `
    <tr class="${rowClass}">
      <td class="icon">${icon}</td>
      <td class="file">${fileName}</td>
      <td class="path"><code>${tokenPath}</code></td>
      ${oldCell}
      ${newCell}
      <td class="type">${d.newType ?? d.oldType ?? ""}</td>
    </tr>`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Token Diff — ${baseRef} → ${headRef}</title>
  <style>
    :root {
      --bg: #0F172A;
      --surface: #1E293B;
      --border: #334155;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --green: #10B981;
      --red: #EF4444;
      --yellow: #F59E0B;
      --blue: #3B82F6;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
    }

    .header {
      padding: 2rem;
      border-bottom: 1px solid var(--border);
    }

    .header h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .meta {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .stats {
      display: flex;
      gap: 2rem;
      padding: 1.5rem 2rem;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stat .icon { font-size: 1.25rem; }
    .stat .count { font-size: 1.5rem; font-weight: 700; }
    .stat .label { color: var(--text-muted); font-size: 0.875rem; }

    .stat.added .count { color: var(--green); }
    .stat.removed .count { color: var(--red); }
    .stat.modified .count { color: var(--yellow); }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 0.75rem 1rem;
      background: var(--surface);
      color: var(--text-muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      position: sticky;
      top: 0;
    }

    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.875rem;
    }

    tr.added { background: rgba(16, 185, 129, 0.05); }
    tr.removed { background: rgba(239, 68, 68, 0.05); }
    tr.modified { background: rgba(245, 158, 11, 0.05); }

    .icon { width: 30px; }
    .file { color: var(--text-muted); font-size: 0.75rem; }
    .path code { color: var(--blue); }
    .old code { color: var(--red); text-decoration: line-through; }
    .new code { color: var(--green); }
    .type { color: var(--text-muted); font-size: 0.75rem; }

    .filter {
      padding: 1rem 2rem;
      background: var(--surface);
      display: flex;
      gap: 1rem;
    }

    .filter button {
      padding: 0.5rem 1rem;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text-muted);
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .filter button.active {
      background: var(--blue);
      border-color: var(--blue);
      color: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎨 Token Diff</h1>
    <div class="meta">
      <strong>${baseRef}</strong> → <strong>${headRef}</strong>
      &nbsp;·&nbsp;
      ${diff.length} change${diff.length !== 1 ? "s" : ""}
      &nbsp;·&nbsp;
      Generated ${new Date().toLocaleString()}
    </div>
  </div>

  <div class="stats">
    <div class="stat added">
      <span class="icon">✨</span>
      <span class="count">${added.length}</span>
      <span class="label">Added</span>
    </div>
    <div class="stat removed">
      <span class="icon">🔥</span>
      <span class="count">${removed.length}</span>
      <span class="label">Removed</span>
    </div>
    <div class="stat modified">
      <span class="icon">📝</span>
      <span class="count">${modified.length}</span>
      <span class="label">Modified</span>
    </div>
  </div>

  <div class="filter">
    <button class="active" onclick="showAll()">All</button>
    <button onclick="showAdded()">Added only</button>
    <button onclick="showRemoved()">Removed only</button>
    <button onclick="showModified()">Modified only</button>
  </div>

  <table>
    <thead>
      <tr>
        <th></th>
        <th>File</th>
        <th>Token Path</th>
        <th>Old Value</th>
        <th>New Value</th>
        <th>Type</th>
      </tr>
    </thead>
    <tbody>
      ${rows.join("\n")}
    </tbody>
  </table>

  <script>
    function showAll() {
      document.querySelectorAll('tbody tr').forEach(r => r.style.display = '');
      document.querySelectorAll('.filter button').forEach(b => b.classList.remove('active'));
      document.querySelector('.filter button').classList.add('active');
    }
    function showAdded() {
      document.querySelectorAll('tbody tr').forEach(r => r.style.display = r.classList.contains('added') ? '' : 'none');
    }
    function showRemoved() {
      document.querySelectorAll('tbody tr').forEach(r => r.style.display = r.classList.contains('removed') ? '' : 'none');
    }
    function showModified() {
      document.querySelectorAll('tbody tr').forEach(r => r.style.display = r.classList.contains('modified') ? '' : 'none');
    }
  </script>
</body>
</html>`;
}
