/**
 * Asset CLI — generate and publish design assets from manifests.
 *
 * Usage:
 *   npx tsx src/cli.ts asset generate <manifest-id>
 *   npx tsx src/cli.ts asset generate --all
 *   npx tsx src/cli.ts asset publish --dry-run
 *   npx tsx src/cli.ts asset list --type social.banner
 *   npx tsx tsx src/cli.ts asset channels
 *   npx tsx src/cli.ts asset check <manifest-id>
 */

import { readJsonFile, findFiles, readTextFile } from "../fs.js";
import { generateAsset, resolveToken, type AssetManifest, type DesignTokens } from "./generator.js";
import { publishAssets, type Destination, type PublishManifest } from "./publisher.js";
import { ASSET_TYPE_REGISTRY, getAssetTypeSpec, CHANNEL_REGISTRY } from "./registry.js";
import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

type AssetManifestFile = AssetManifest & Record<string, unknown>;

export async function assetCLI(args: string[], root: string): Promise<void> {
  const [command, ...rest] = args;

  if (!command) {
    printAssetHelp();
    return;
  }

  switch (command) {
    case "generate":
      await runGenerate(rest, root);
      break;
    case "publish":
      await runPublish(rest, root);
      break;
    case "list":
      await runList(rest);
      break;
    case "channels":
      runChannels();
      break;
    case "check":
      await runCheck(rest, root);
      break;
    case "types":
      runTypes();
      break;
    default:
      console.error(`Unknown asset command: ${command}`);
      printAssetHelp();
  }
}

function printAssetHelp(): void {
  console.log(`
Asset Generator CLI — generate and publish design assets from manifests.

Usage:
  npx tsx src/cli.ts asset generate <manifest-id>   Generate a single asset
  npx tsx src/cli.ts asset generate --all           Generate all assets
  npx tsx src/cli.ts asset generate --type <type>    Generate all assets of a type
  npx tsx src/cli.ts asset generate --status approved Generate by status
  npx tsx src/cli.ts asset publish [--dry-run]       Publish assets to all destinations
  npx tsx src/cli.ts asset list [--type <type>]      List asset manifests
  npx tsx src/cli.ts asset channels                  List all publishing channels
  npx tsx src/cli.ts asset check <manifest-id>       Validate manifest against schema
  npx tsx tsx src/cli.ts asset types                 List all asset type specs

Examples:
  npx tsx src/cli.ts asset generate marketing.social.linkedin.company-banner
  npx tsx src/cli.ts asset generate --all --output ./dist/assets
  npx tsx src/cli.ts asset generate --type social.banner --dry-run
  npx tsx src/cli.ts asset publish --dry-run
  npx tsx src/cli.ts asset list --type advertising.display
`);
}

// ══════════════════════════════════════════════════════════════════
// GENERATE
// ══════════════════════════════════════════════════════════════════

async function runGenerate(args: string[], root: string): Promise<void> {
  let outputDir = resolve(root, "dist/assets");
  let manifestId: string | null = null;
  let filterType: string | null = null;
  let filterStatus: string | null = null;
  let dryRun = false;
  let generateAll = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--output":
      case "-o":
        outputDir = resolve(args[++i]);
        break;
      case "--type":
        filterType = args[++i];
        break;
      case "--status":
        filterStatus = args[++i];
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--all":
        generateAll = true;
        break;
      default:
        if (!args[i].startsWith("-")) manifestId = args[i];
    }
  }

  const manifests = await loadManifests(root);
  const tokens = await loadTokens(root);

  const toGenerate = manifests.filter((m) => {
    if (manifestId && m.id !== manifestId) return false;
    if (filterType && !m.assetType.includes(filterType)) return false;
    if (filterStatus && m.status !== filterStatus) return false;
    if (m.status === "deprecated" || m.status === "retired") return false;
    return true;
  });

  if (toGenerate.length === 0) {
    console.log("No matching assets found.");
    if (manifestId) {
      console.log(`\nAvailable manifests:`);
      for (const m of manifests.slice(0, 10)) {
        console.log(`  ${m.id} [${m.status}] (${m.assetType})`);
      }
      if (manifests.length > 10) console.log(`  ... and ${manifests.length - 10} more`);
    }
    return;
  }

  console.log(`\n🎨 Generating ${toGenerate.length} asset(s)...`);
  console.log(`   Output: ${outputDir}`);
  if (dryRun) console.log(`   ⚠️  DRY RUN — no files will be written\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const manifest of toGenerate) {
    const spec = getAssetTypeSpec(manifest.assetType);
    const method = spec?.generation ?? "MANUAL";

    console.log(`\n[${manifest.id}]`);
    console.log(`   Type: ${manifest.assetType} | Method: ${method} | Status: ${manifest.status}`);

    if (dryRun) {
      console.log(`   Would generate ${manifest.formatProfiles.length} format profile(s)`);
      continue;
    }

    const result = await generateAsset({
      manifest,
      tokens,
      outputDir,
    });

    if (result.success) {
      successCount++;
      console.log(`   ✅ Generated ${result.files.length} file(s)`);
      for (const file of result.files) {
        console.log(`      ${file.formatProfile} → ${file.width}x${file.height} ${file.fileType}`);
      }
      for (const warn of result.warnings) {
        console.log(`      ⚠️  ${warn}`);
      }
    } else {
      errorCount++;
      console.log(`   ❌ Failed`);
      for (const err of result.errors) {
        console.log(`      Error: ${err}`);
      }
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Generated: ${successCount} | Failed: ${errorCount} | Total: ${toGenerate.length}`);

  if (!dryRun) {
    console.log(`\n📦 Assets written to: ${outputDir}`);
  }
}

// ══════════════════════════════════════════════════════════════════
// PUBLISH
// ══════════════════════════════════════════════════════════════════

async function runPublish(args: string[], root: string): Promise<void> {
  let dryRun = false;
  let channelFilter: string[] = [];
  let statusFilter = ["approved", "published"];
  let configFile = resolve(root, "publish.config.json");

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--dry-run":
        dryRun = true;
        break;
      case "--channel":
        channelFilter.push(args[++i]);
        break;
      case "--status":
        statusFilter = [args[++i]];
        break;
      case "--config":
        configFile = resolve(args[++i]);
        break;
    }
  }

  const sourceDir = resolve(root, "dist/assets");
  if (!existsSync(sourceDir)) {
    console.log(`No generated assets found at ${sourceDir}`);
    console.log(`Run 'npm run asset generate --all' first.`);
    return;
  }

  const manifests = await loadManifests(root);

  // Load publish config
  let destinations: Destination[] = [];
  if (existsSync(configFile)) {
    try {
      const config = JSON.parse(readFileSync(configFile, "utf8"));
      destinations = config.destinations ?? [];
    } catch {
      console.error(`Failed to parse publish config: ${configFile}`);
    }
  }

  // Default: local output
  if (destinations.length === 0) {
    destinations = [{
      type: "local",
      name: "local-dist",
      config: { outputPath: resolve(root, "releases/assets"), versioned: true, generateIndex: true } as LocalConfig,
    }];
    console.log("⚠️  No publish.config.json found — using local output. Create one to enable CDN/npm/Figma publishing.");
  }

  console.log(`\n📤 Publishing assets...`);
  console.log(`   Source: ${sourceDir}`);
  console.log(`   Destinations: ${destinations.map((d) => d.name).join(", ")}`);
  console.log(`   Channels: ${channelFilter.length ? channelFilter.join(", ") : "all"}`);
  console.log(`   Status: ${statusFilter.join(", ")}`);
  if (dryRun) console.log(`   ⚠️  DRY RUN\n`);

  const results = await publishAssets({
    sourceDir,
    manifests,
    destinations,
    channelFilter,
    statusFilter,
    dryRun,
  });

  for (const result of results) {
    console.log(`\n${result.destination}:`);
    if (result.success) {
      console.log(`   ✅ Published ${result.publishedAssets.length} asset(s)`);
      if (result.url) console.log(`   🌐 URL: ${result.url}`);
    } else {
      console.log(`   ❌ Failed`);
    }
    for (const err of result.errors) console.log(`      Error: ${err}`);
    for (const warn of result.warnings) console.log(`      ⚠️  ${warn}`);
  }
}

// ══════════════════════════════════════════════════════════════════
// LIST
// ══════════════════════════════════════════════════════════════════

async function runList(args: string[]): Promise<void> {
  let filterType: string | null = null;
  let filterStatus: string | null = null;
  let filterChannel: string | null = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--type":
        filterType = args[++i];
        break;
      case "--status":
        filterStatus = args[++i];
        break;
      case "--channel":
        filterChannel = args[++i];
        break;
    }
  }

  const registry = ASSET_TYPE_REGISTRY;
  let filtered = registry;

  if (filterType) {
    filtered = filtered.filter((s) => s.type.includes(filterType!) || s.category === filterType);
  }

  console.log(`\n📋 Asset Type Registry (${filtered.length} types)\n`);

  const byCategory = new Map<string, typeof registry>();
  for (const spec of filtered) {
    if (!byCategory.has(spec.category)) byCategory.set(spec.category, []);
    byCategory.get(spec.category)!.push(spec);
  }

  for (const [category, specs] of byCategory) {
    console.log(`  ${category.toUpperCase()}`);
    for (const spec of specs) {
      const formats = spec.formatProfiles.length;
      const method = spec.generation;
      const channels = spec.channels.slice(0, 3).join(", ");
      console.log(`    ${spec.type.padEnd(45)} ${formats}f | ${method.padEnd(12)} | ${channels}`);
    }
    console.log();
  }
}

function runChannels(): void {
  console.log(`\n📡 Publishing Channels (${CHANNEL_REGISTRY.length})\n`);
  console.log(`  ID                  Name                           Type        Assets    Auto     `);
  console.log(`  ${"─".repeat(76)}`);

  for (const ch of CHANNEL_REGISTRY) {
    const typePad = ch.type.padEnd(10);
    const namePad = ch.name.padEnd(30);
    const assetsPad = ch.assetTypes.slice(0, 2).join(", ").padEnd(10);
    const autoPad = ch.publishAutomation.padEnd(7);
    console.log(`  ${ch.id.padEnd(18)} ${namePad} ${typePad} ${assetsPad} ${autoPad}`);
  }
  console.log();
}

async function runCheck(args: string[], root: string): Promise<void> {
  const [manifestId] = args;
  if (!manifestId) {
    console.error("Usage: npx tsx src/cli.ts asset check <manifest-id>");
    return;
  }

  const manifests = await loadManifests(root);
  const manifest = manifests.find((m) => m.id === manifestId);

  if (!manifest) {
    console.error(`Manifest not found: ${manifestId}`);
    return;
  }

  const spec = getAssetTypeSpec(manifest.assetType);

  console.log(`\n🔍 Checking: ${manifest.id}`);
  console.log(`   Title: ${manifest.title}`);
  console.log(`   Type: ${manifest.assetType} ${spec ? "✅" : "❌ (not in registry)"}`);
  console.log(`   Status: ${manifest.status}`);
  console.log(`   Generation: ${spec?.generation ?? "UNKNOWN"}`);
  console.log(`   Maturity: ${manifest.maturity}`);
  console.log(`   Channels: ${manifest.channels.join(", ")}`);
  console.log(`   Formats: ${manifest.formatProfiles.join(", ")}`);

  if (spec) {
    const expectedFormats = spec.formatProfiles.map((f) => f.id);
    const missingFormats = manifest.formatProfiles.filter((f) => !expectedFormats.includes(f));
    const unknownFormats = manifest.formatProfiles.filter((f) => !expectedFormats.includes(f));

    if (unknownFormats.length > 0) {
      console.log(`   ⚠️  Unknown format profiles: ${unknownFormats.join(", ")}`);
    } else {
      console.log(`   ✅ All ${manifest.formatProfiles.length} format profiles are valid`);
    }

    console.log(`   WCAG Target: ${spec.wcagLevel}`);
    console.log(`   Thematic: ${spec.thematic ? "yes" : "no"}`);
    console.log(`   Animated: ${spec.animated ? "yes" : "no"}`);
    console.log(`   Localized: ${spec.localized ? "yes" : "no"}`);
  }
}

function runTypes(): void {
  console.log(`\n🎨 Asset Type Registry\n`);

  for (const spec of ASSET_TYPE_REGISTRY) {
    console.log(`  ${spec.type}`);
    console.log(`    Category: ${spec.category}`);
    console.log(`    Method: ${spec.generation}`);
    console.log(`    Formats: ${spec.formatProfiles.map((f) => `${f.id} (${f.width}x${f.height})`).join(", ")}`);
    if (spec.tokenRefs?.length) {
      console.log(`    Tokens: ${spec.tokenRefs.slice(0, 5).join(", ")}${spec.tokenRefs.length > 5 ? "..." : ""}`);
    }
    console.log();
  }
}

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

async function loadManifests(root: string): Promise<AssetManifest[]> {
  const paths = await findFiles(root, ["manifests/assets/**/*.json"]);
  const manifests: AssetManifest[] = [];

  for (const p of paths) {
    try {
      const data = await readJsonFile<AssetManifestFile>(p);
      if (data.id && data.assetType && data.formatProfiles) {
        manifests.push(data as unknown as AssetManifest);
      }
    } catch {
      // skip invalid manifests
    }
  }

  return manifests;
}

async function loadTokens(root: string): Promise<DesignTokens> {
  const tokenFiles = [
    resolve(root, "tokens/core/primitives.tokens.json"),
    resolve(root, "tokens/core/semantic.tokens.json"),
  ];

  const merged: DesignTokens = {};

  for (const file of tokenFiles) {
    if (existsSync(file)) {
      try {
        const data = JSON.parse(readFileSync(file, "utf8"));
        Object.assign(merged, data);
      } catch {
        // skip
      }
    }
  }

  // Also load from dist if tokens are exported
  const distTokens = resolve(root, "dist/tokens/tokens.export.json");
  if (existsSync(distTokens)) {
    try {
      const data = JSON.parse(readFileSync(distTokens, "utf8"));
      Object.assign(merged, data);
    } catch {
      // skip
    }
  }

  return merged;
}

import type { LocalConfig } from "./publisher.js";
