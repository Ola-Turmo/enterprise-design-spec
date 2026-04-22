#!/usr/bin/env node

import path from "node:path";
import { buildCatalog, validateProject } from "./lib/catalog.js";
import { checkContrast } from "./lib/contrast.js";
import { exportTokens } from "./lib/export.js";
import { resolveAliases } from "./lib/alias.js";
import { generateTypes } from "./lib/types.js";
import { generatePlayground } from "./lib/playground.js";
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
