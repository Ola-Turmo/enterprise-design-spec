/**
 * Token changelog generator — reads git history and generates a human-readable
 * changelog of what changed, added, or removed in token sets.
 * No external services — pure Node.js + git CLI.
 *
 * Usage: npx tsx src/cli.ts changelog [--from <tag>] [--to <tag>] [--output <file>]
 */

import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { readJsonFile } from "./fs.js";

interface CommitInfo {
  hash: string;
  date: string;
  message: string;
  files: string[];
  tokenChanges?: TokenChanges;
}

interface TokenChanges {
  added: string[];
  removed: string[];
  modified: { path: string; before: number; after: number }[];
}

export async function generateChangelog(
  root: string,
  fromRef?: string,
  toRef?: string,
): Promise<string> {
  const from = fromRef ?? "HEAD~10";
  const to = toRef ?? "HEAD";

  // Get commit history with token file changes
  const commits = getTokenCommits(root, from, to);

  // Build changelog sections
  const sections: string[] = [
    "# Token Changelog\n",
    `Generated: ${new Date().toISOString().split("T")[0]}`,
    `Range: ${from} → ${to}`,
    "",
  ];

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  for (const commit of commits) {
    if (!commit.tokenChanges) continue;

    sections.push(
      `## ${commit.hash.slice(0, 7)} — ${commit.date}\n` +
        `\`${commit.message}\`\n`,
    );

    if (commit.tokenChanges.added.length > 0) {
      sections.push("### ✨ Added");
      for (const token of commit.tokenChanges.added) {
        sections.push(`- \`${token}\``);
      }
      added.push(...commit.tokenChanges.added);
    }

    if (commit.tokenChanges.removed.length > 0) {
      sections.push("### 🔥 Removed");
      for (const token of commit.tokenChanges.removed) {
        sections.push(`- ~~\`${token}\`~~`);
      }
      removed.push(...commit.tokenChanges.removed);
    }

    if (commit.tokenChanges.modified.length > 0) {
      sections.push("### 📝 Modified");
      for (const mod of commit.tokenChanges.modified) {
        sections.push(`- \`${mod.path}\` (${mod.before} → ${mod.after} tokens)`);
      }
      modified.push(...commit.tokenChanges.modified.map((m) => m.path));
    }

    sections.push("");
  }

  // Summary
  const uniqueAdded = [...new Set(added)];
  const uniqueRemoved = [...new Set(removed)];
  const uniqueModified = [...new Set(modified)];

  sections.push("## Summary\n");
  sections.push(
    `| Change | Count |\n|--------|-------|\n` +
      `| ✨ Added | ${uniqueAdded.length} |\n` +
      `| 🔥 Removed | ${uniqueRemoved.length} |\n` +
      `| 📝 Modified | ${uniqueModified.length} |\n` +
      `| 📋 Commits | ${commits.length} |\n`,
  );

  if (uniqueAdded.length > 0) {
    sections.push("\n### All Added Tokens\n");
    for (const token of uniqueAdded) {
      sections.push(`- \`${token}\``);
    }
  }

  return sections.join("\n");
}

function getTokenCommits(
  root: string,
  from: string,
  to: string,
): CommitInfo[] {
  try {
    // Get commits that touched token files
    const logFormat = "%H|%cd|%s";
    const logOutput = execSync(
      `git log --format="${logFormat}" --since="" ${from}..${to} -- "tokens/" "**/*.tokens.json"`,
      { cwd: root, encoding: "utf8", timeout: 10000 },
    );

    if (!logOutput.trim()) return [];

    const lines = logOutput.trim().split("\n").filter(Boolean);
    const commits: CommitInfo[] = [];

    for (const line of lines) {
      const [hash, date, ...msgParts] = line.split("|");
      const message = msgParts.join("|");

      // Get files changed in this commit
      let files: string[] = [];
      try {
        const diffOutput = execSync(
          `git show ${hash} --name-only --format=""`,
          { cwd: root, encoding: "utf8", timeout: 10000 },
        );
        files = diffOutput
          .trim()
          .split("\n")
          .filter((f) => f.includes("tokens/") && (f.endsWith(".json") || f.endsWith(".tokens.json")));
      } catch {
        // ignore
      }

      commits.push({
        hash,
        date: new Date(date).toISOString().split("T")[0],
        message: message.trim(),
        files,
        tokenChanges: files.length > 0 ? analyzeChanges(root, hash, files) : undefined,
      });
    }

    return commits;
  } catch {
    return [];
  }
}

function analyzeChanges(
  root: string,
  hash: string,
  files: string[],
): TokenChanges {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: { path: string; before: number; after: number }[] = [];

  for (const file of files) {
    try {
      const parentOutput = execSync(
        `git show ${hash}^:${file} 2>/dev/null | wc -l`,
        { cwd: root, encoding: "utf8", timeout: 5000 },
      );
      const parentTokens = parseInt(parentOutput.trim(), 10) || 0;

      const currentOutput = execSync(
        `git show ${hash}:${file} 2>/dev/null | wc -l`,
        { cwd: root, encoding: "utf8", timeout: 5000 },
      );
      const currentTokens = parseInt(currentOutput.trim(), 10) || 0;

      if (parentTokens === 0 && currentTokens > 0) {
        added.push(file);
      } else if (parentTokens > 0 && currentTokens === 0) {
        removed.push(file);
      } else if (parentTokens !== currentTokens) {
        modified.push({ path: file, before: parentTokens, after: currentTokens });
      }
    } catch {
      // File might be new or deleted
    }
  }

  return { added, removed, modified };
}
