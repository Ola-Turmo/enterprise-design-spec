/**
 * Commit message linter — enforces Lore Commit Protocol.
 * Lore Commit Protocol format:
 *   <type>(<scope>): <subject>
 *   [optional body]
 *   [optional footer: Closes #[issue]]
 *
 * Types: feat | fix | docs | style | refactor | test | chore | perf | ci | build
 * Scope: optional area (e.g., tokens, cli, export)
 * Subject: imperative, lowercase, no period, max 72 chars
 *
 * Usage: npx tsx src/lib/commit-lint.ts [--message <msg>] [--file <path>]
 */

export interface LintResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  type?: string;
  scope?: string;
  subject?: string;
}

const VALID_TYPES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "test",
  "chore",
  "perf",
  "ci",
  "build",
  "revert",
];

const MAX_SUBJECT_LENGTH = 72;

export function lintCommitMessage(message: string): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = message.trim().split("\n");
  const header = lines[0] ?? "";

  // Parse header
  const headerMatch = header.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/);

  if (!headerMatch) {
    errors.push(
      `Header must match format: <type>(<scope>): <subject>\n` +
        `  Got: "${header}"\n` +
        `  Example: feat(tokens): add violet color scale`,
    );
    return { valid: false, errors, warnings };
  }

  const [, type, scope, subject] = headerMatch;

  // Validate type
  if (!VALID_TYPES.includes(type)) {
    errors.push(
      `Invalid type: "${type}". Must be one of: ${VALID_TYPES.join(", ")}`,
    );
  }

  // Validate subject
  if (subject.length > MAX_SUBJECT_LENGTH) {
    errors.push(
      `Subject too long: ${subject.length} chars (max ${MAX_SUBJECT_LENGTH})`,
    );
  }

  if (subject.endsWith(".")) {
    errors.push("Subject must not end with a period");
  }

  if (subject.startsWith(subject.toLowerCase()) && subject[0] !== subject[0].toLowerCase()) {
    // First letter is uppercase — might be capitalized incorrectly
    warnings.push(
      `Subject should be imperative lowercase: "${subject.toLowerCase()}"`,
    );
  }

  // Check for common words that make subjects non-imperative
  const nonImperative = ["added", "adding", "fixed", "fixing", "updated", "updating"];
  for (const word of nonImperative) {
    if (subject.toLowerCase().startsWith(word)) {
      warnings.push(
        `Subject should be imperative (not "${word}"): consider "${subject.replace(
          new RegExp(`^${word}`),
          word.replace(/ed$/, "").replace(/ing$/, ""),
        )}"`,
      );
    }
  }

  // Scope validation
  if (scope && scope.length > 30) {
    warnings.push(`Scope seems long: "${scope}" (max 30 chars)`);
  }

  // Body validation
  if (lines.length > 1) {
    const bodyLines = lines.slice(1).filter((l) => l.trim());

    for (const bodyLine of bodyLines) {
      if (bodyLine.length > 100) {
        warnings.push(`Body line > 100 chars: "${bodyLine.slice(0, 50)}..."`);
      }
    }

    // Check for Closes/Fixes footer
    const footerLine = lines[lines.length - 1] ?? "";
    if (
      footerLine.match(/^(Closes|Fixes|Resolves)\s+#\d+/i) ||
      footerLine.match(/^#\d+/)
    ) {
      // Good — has issue reference
    }
  }

  // Warn on empty commit (no body, no scope, single-word subject)
  if (!scope && lines.length === 1 && subject.split(" ").length < 3) {
    warnings.push("Consider adding a scope (e.g., feat(tokens): ...) for clarity");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    type,
    scope,
    subject,
  };
}

export function lintFromFile(filePath: string): LintResult {
  const fs = require("node:fs") as typeof import("node:fs");
  const message = fs.readFileSync(filePath, "utf8");
  return lintCommitMessage(message);
}

export function printLintResult(result: LintResult): void {
  if (result.valid && result.warnings.length === 0) {
    console.log("✅ Commit message is valid");
    if (result.type) {
      console.log(`   Type: ${result.type}${result.scope ? `(${result.scope})` : ""}`);
      console.log(`   Subject: ${result.subject}`);
    }
    return;
  }

  if (result.errors.length > 0) {
    console.log("❌ Invalid commit message:");
    for (const error of result.errors) {
      console.log(`   - ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log("\n⚠️  Warnings (can be ignored):");
    for (const warning of result.warnings) {
      console.log(`   - ${warning}`);
    }
  }
}
