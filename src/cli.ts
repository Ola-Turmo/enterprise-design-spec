#!/usr/bin/env node

import path from "node:path";
import { buildCatalog, validateProject } from "./lib/catalog.js";
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
      `Validation passed for ${path.resolve(root)} (${result.assetCount} manifests, ${result.docCount} docs, ${result.tokenCount} tokens).`
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

  printHelp();
  process.exitCode = 1;

  function resolveFlag(name: string): string | undefined {
    const index = args.indexOf(name);
    if (index === -1) {
      return undefined;
    }

    return args[index + 1];
  }
}

function printHelp(): void {
  console.log("Usage:");
  console.log("  enterprise-design-spec validate [--root <path>]");
  console.log("  enterprise-design-spec catalog [--root <path>] [--output <path>]");
}

void main();
