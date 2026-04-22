#!/usr/bin/env node

import path from "node:path";
import { buildCatalog, validateProject } from "./lib/catalog.js";
import { assetCLI } from "./lib/assets/cli.js";
import { runSchedulerTick } from "./lib/assets/scheduler.js";
import { checkContrast } from "./lib/contrast.js";
import { exportTokens } from "./lib/export.js";
import { resolveAliases } from "./lib/alias.js";
import { generateTypes } from "./lib/types.js";
import { generatePlayground } from "./lib/playground.js";
import { runSnapshotTests, updateGoldenFiles } from "./lib/snapshot.js";
import { migrateFromFormat } from "./lib/migrate.js";
import { watchTokens } from "./lib/watch.js";
import { generateChangelog } from "./lib/changelog.js";
import { scanMonorepo } from "./lib/monorepo.js";
import { generateDashboard } from "./lib/dashboard.js";
import { lintCommitMessage, lintFromFile } from "./lib/commit-lint.js";
import { formatTokens } from "./lib/format.js";
import { generateDiffViewer } from "./lib/diff-viewer.js";
import { visualizeTokens } from "./lib/visualize.js";
import { runPrepublishCheck } from "./lib/prepublish.js";
import { writeJsonFile } from "./lib/fs.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const root = resolveFlag("--root") ?? process.cwd();
  const output = resolveFlag("--output");

  if (command === "validate") {
    const result = await validateProject(path.resolve(root));

    if (!result.ok) {
      console.error("Validation failed.");
      for (const error of result.errors) {
        console.error(`- ${error}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(
      `Validation passed for ${path.resolve(root)} (${result.assetCount} manifests, ${result.docCount} docs, ${result.tokenCount} tokens).`,
    );
    return;
  }

  if (command === "catalog") {
    const resolvedRoot = path.resolve(root);
    const catalog = await buildCatalog(resolvedRoot);
    const catalogPath = path.resolve(output ?? path.join(resolvedRoot, "releases", "latest", "catalog.json"));
    await writeJsonFile(catalogPath, catalog);
    console.log(`Catalog written to ${catalogPath}`);
    return;
  }

  if (command === "contrast") {
    const target = resolveFlag("--target") ?? "4.5";
    const result = await checkContrast(path.resolve(root), target);

    console.log(`\nWCAG Contrast Check (target: ${target}:1)\n`);

    for (const pair of result.pairs) {
      const status = pair.ratio >= parseFloat(target) ? "✅" : "❌";
      console.log(
        `${status} ${pair.tokenA} (${pair.valueA}) vs ${pair.tokenB} (${pair.valueB}) — ${pair.ratio}:1`,
      );
      if (pair.aa) console.log(`   AA text: PASS (${pair.aa ? "≥4.5" : "FAIL"})`);
      if (pair.aaLarge) console.log(`   AA large: PASS (${pair.aaLarge ? "≥3" : "FAIL"})`);
      if (pair.aaa) console.log(`   AAA text: PASS (${pair.aaa ? "≥7" : "FAIL"})`);
    }

    if (result.failures.length > 0) {
      console.error(`\n${result.failures.length} contrast pair(s) failed WCAG ${target}:1`);
      process.exitCode = 1;
    } else {
      console.log(`\nAll ${result.pairs.length} pairs pass WCAG ${target}:1`);
    }
    return;
  }

  if (command === "export") {
    const formatArg = resolveFlag("--format") ?? "all";
    const formats = formatArg === "all" ? ["css", "tailwind", "scss", "json"] : formatArg.split(",");
    const outDir = path.resolve(output ?? path.join(path.resolve(root), "dist", "tokens"));

    const result = await exportTokens(path.resolve(root), outDir, formats);

    console.log(`\nToken Export (${result.tokenCount} tokens)\n`);
    for (const o of result.outputs) {
      console.log(`  ${o.format.padEnd(10)} → ${o.path}`);
    }
    console.log(`\nExported ${result.outputs.length} format(s)`);
    return;
  }

  if (command === "aliases") {
    const result = await resolveAliases(path.resolve(root));

    console.log(`\nToken Alias Resolution\n`);

    for (const node of result.nodes) {
      const status = node.resolvedValue ? "✅" : "❌";
      console.log(
        `${status} ${node.ref} ${node.rawValue} → ${node.resolvedValue ?? "UNRESOLVED"} [${node.chain.join(" → ")}] (${node.type ?? "unknown"})`,
      );
    }

    if (result.circularRefs.length > 0) {
      console.error(`\n⚠️  ${result.circularRefs.length} circular reference(s):`);
      for (const c of result.circularRefs) console.error(`   - ${c}`);
    }

    if (result.brokenRefs.length > 0) {
      console.error(`\n⚠️  ${result.brokenRefs.length} broken reference(s):`);
      for (const b of result.brokenRefs) console.error(`   - ${b}`);
    }

    if (result.typeMismatches.length > 0) {
      console.error(`\n⚠️  ${result.typeMismatches.length} type mismatch(es):`);
      for (const t of result.typeMismatches) console.error(`   - ${t}`);
    }

    if (!result.ok) {
      console.error(`\n${result.errors.length} alias error(s) found`);
      process.exitCode = 1;
    } else {
      console.log(`\nAll ${result.nodes.length} aliases resolve correctly`);
    }
    return;
  }

  if (command === "diff") {
    // Compare two token sets
    const base = resolveFlag("--base");
    const head = resolveFlag("--head");
    if (!base || !head) {
      console.error("Usage: enterprise-design-spec diff --base <path> --head <path> [--root <root>]");
      process.exitCode = 1;
      return;
    }

    const { diffTokens } = await import("./lib/diff.js");
    const result = await diffTokens(path.resolve(root), base, head);

    console.log(`\nToken Diff\n`);
    if (result.added.length > 0) {
      console.log(`➕ Added (${result.added.length}):`);
      for (const t of result.added) console.log(`   + ${t.path} = ${t.$value}`);
    }
    if (result.removed.length > 0) {
      console.log(`➖ Removed (${result.removed.length}):`);
      for (const t of result.removed) console.log(`   - ${t.path}`);
    }
    if (result.changed.length > 0) {
      console.log(`🔄 Changed (${result.changed.length}):`);
      for (const t of result.changed) console.log(`   ~ ${t.path}: "${t.oldValue}" → "${t.newValue}"`);
    }
    if (result.added.length === 0 && result.removed.length === 0 && result.changed.length === 0) {
      console.log("No differences found");
    }
    return;
  }

  if (command === "types") {
    const outPath = path.resolve(output ?? path.join(path.resolve(root), "dist", "tokens", "tokens.d.ts"));
    const result = await generateTypes(path.resolve(root), outPath);

    console.log(`\nTypeScript Type Generation\n`);
    console.log(`  Tokens processed: ${result.tokenCount}`);
    console.log(`  Types generated: ${result.typeCount}`);
    console.log(`  Output: ${result.outputPath}`);
    return;
  }

  if (command === "init") {
    const { initBrandSystem } = await import("./lib/init.js");
    const name = resolveFlag("--name") ?? "my-brand-system";
    const targetDir = path.resolve(root);

    const result = await initBrandSystem(targetDir, name);

    console.log(`\nBrand System Initialized\n`);
    console.log(`  Name: ${result.name}`);
    console.log(`  Location: ${result.path}`);
    console.log(`  Files created: ${result.filesCreated}`);
    console.log(`\nNext steps:`);
    console.log(`  cd ${result.path}`);
    console.log(`  npm install`);
    console.log(`  npm run validate`);
    console.log(`  npm run export`);
    return;
  }

  if (command === "playground") {
    const output = resolveFlag("--output") ?? path.resolve(root, "dist/tokens/playground.html");
    const result = await generatePlayground(root, output);
    console.log(`Generated playground at ${result.outputPath} (${result.tokenCount} tokens)`);
    return;
  }

  if (command === "snapshot") {
    const update = process.argv.includes("--update");
    const goldenDir = resolveFlag("--golden") ?? path.resolve(root, "__snapshots__");

    if (update) {
      const updated = await updateGoldenFiles(root, goldenDir);
      console.log(`Updated ${updated} golden files in ${goldenDir}`);
    } else {
      const result = await runSnapshotTests(root, goldenDir);
      console.log(`\nSnapshot Results:`);
      console.log(`  ✅ ${result.passed} passed`);
      console.log(`  ❌ ${result.failed} failed`);
      console.log(`  ⚠️  ${result.missing} missing golden files`);
      console.log(`\nRun with --update to regenerate golden files`);
      process.exit(result.failed > 0 ? 1 : 0);
    }
    return;
  }

  if (command === "migrate") {
    const input = resolveFlag("--input");
    const output = resolveFlag("--output");
    const format = resolveFlag("--from") ?? "basic";

    if (!input || !output) {
      console.error("Usage:");
      console.error("  enterprise-design-spec migrate --input <path> --output <path> --from <format>");
      console.error("");
      console.error("Supported formats: amazon-style-dictionary, figma-tokens, tokens-studio, brandflow, basic");
      process.exitCode = 1;
      return;
    }

    const result = await migrateFromFormat(input, output, format as Parameters<typeof migrateFromFormat>[2]);
    console.log(`Migration complete: ${result.tokensMigrated} tokens migrated from ${result.inputFormat}`);
    console.log(`Output: ${result.outputPath}`);
    if (result.warnings.length > 0) {
      console.log("Warnings:");
      for (const w of result.warnings) console.log(`  ⚠️  ${w}`);
    }
    return;
  }

  if (command === "figma") {
    const action = args[1];
    const fileKey = resolveFlag("--file-key");
    const token = resolveFlag("--token") ?? process.env.FIGMA_ACCESS_TOKEN;

    if (!fileKey || !token) {
      console.error("Usage:");
      console.error("  enterprise-design-spec figma pull --file-key <key> --token <token> [--output <dir>]");
      console.error("  enterprise-design-spec figma push --file-key <key> --token <token> [--root <tokens-dir>]");
      process.exitCode = 1;
      return;
    }

    const { pullFromFigma, pushToFigma } = await import("./lib/figma.js");
    const config = {
      fileKey,
      personalAccessToken: token,
      outputDir: resolveFlag("--output"),
    };

    if (action === "pull") {
      const result = await pullFromFigma(config);
      console.log(`\nFigma Sync (Pull)\n`);
      console.log(`  Direction: Figma → Git`);
      console.log(`  Tokens written: ${result.tokensWritten}`);
      console.log(`  Collections processed: ${result.collectionsProcessed}`);
      console.log(`  Output: ${result.outputPath}`);
    } else if (action === "push") {
      const result = await pushToFigma({ ...config, outputDir: path.resolve(root) });
      console.log(`\nFigma Sync (Push)\n`);
      console.log(`  Direction: Git → Figma`);
      console.log(`  Tokens processed: ${result.tokensWritten}`);
      console.log(`  Collections: ${result.collectionsProcessed}`);
    } else {
      console.error("Unknown action. Use 'pull' or 'push'.");
      process.exitCode = 1;
    }
    return;
  }

  if (command === "watch") {
    const opts = {
      root: resolveFlag("--root") ?? root,
      output: resolveFlag("--output") ?? path.resolve(root, "dist/tokens"),
      debounceMs: parseInt(resolveFlag("--debounce") ?? "300", 10),
      verbose: !process.argv.includes("--quiet"),
      commands: (resolveFlag("--commands") ?? "validate,aliases,export,types,playground").split(","),
    };
    watchTokens(opts);
    return;
  }

  if (command === "changelog") {
    const from = resolveFlag("--from") ?? "HEAD~10";
    const to = resolveFlag("--to") ?? "HEAD";
    const output = resolveFlag("--output");
    const changelog = await generateChangelog(root, from, to);
    if (output) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(output, changelog);
      console.log(`Changelog written to ${output}`);
    } else {
      console.log(changelog);
    }
    return;
  }

  if (command === "monorepo" || command === "brands") {
    const parallel = parseInt(resolveFlag("--parallel") ?? "4", 10);
    await scanMonorepo(root, parallel);
    return;
  }

  if (command === "dashboard") {
    await generateDashboard(root);
    return;
  }

  if (command === "lint-commit") {
    const msg = resolveFlag("--message");
    const file = resolveFlag("--file");
    const result = msg
      ? lintCommitMessage(msg)
      : file
      ? lintFromFile(file)
      : null;
    if (result) {
      const { printLintResult } = await import("./lib/commit-lint.js");
      printLintResult(result);
      process.exit(result.valid ? 0 : 1);
    }
    return;
  }

  if (command === "format") {
    const check = process.argv.includes("--check");
    const fix = !check;
    const results = await formatTokens(root, check, fix);
    let totalFixed = 0;
    let totalErrors = 0;
    for (const r of results) {
      totalFixed += r.fixed;
      if (r.errors.length > 0) totalErrors += r.errors.length;
      if (r.valid) {
        console.log(`✅ ${r.file}`);
      } else {
        console.log(`❌ ${r.file}`);
        for (const e of r.errors) console.log(`   ${e}`);
      }
    }
    console.log(`\n${results.length} file(s) checked, ${totalFixed} issue(s) fixed`);
    process.exit(totalErrors > 0 ? 1 : 0);
    return;
  }

  if (command === "diff-viewer") {
    const base = resolveFlag("--base") ?? "HEAD~1";
    const head = resolveFlag("--head") ?? "HEAD";
    const output = resolveFlag("--output") ?? path.resolve(root, "dist/token-diff.html");
    await generateDiffViewer(root, base, head, output);
    return;
  }

  if (command === "visualize") {
    const type = (resolveFlag("--type") ?? "all") as "all" | "colors" | "spacing" | "typography" | "motion";
    await visualizeTokens(root, type);
    return;
  }

  if (command === "prepublish") {
    const verbose = process.argv.includes("--verbose");
    const result = await runPrepublishCheck(root, verbose);
    process.exit(result.ready ? 0 : 1);
    return;
  }

  if (command === "asset") {
    const subArgs = args.slice(1);
    await assetCLI(subArgs, root);
    return;
  }

  if (command === "schedule" || command === "scheduler") {
    const subArgs = args.slice(1);
    const configPath = subArgs[0] ?? undefined;
    await runSchedulerTick(root, configPath);
    return;
  }

  printHelp();
  process.exitCode = 1;

  function resolveFlag(name: string): string | undefined {
    const index = args.indexOf(name);
    if (index === -1) return undefined;
    return args[index + 1];
  }
}

function printHelp(): void {
  console.log("Usage:");
  console.log("  enterprise-design-spec validate [--root <path>]");
  console.log("  enterprise-design-spec catalog [--root <path>] [--output <path>]");
  console.log("  enterprise-design-spec contrast [--root <path>] [--target <ratio>]");
  console.log("  enterprise-design-spec export [--root <path>] [--output <dir>] [--format css,tailwind,scss,json,all]");
  console.log("  enterprise-design-spec aliases [--root <path>]");
  console.log("  enterprise-design-spec diff --base <path> --head <path> [--root <root>]");
}

void main();
