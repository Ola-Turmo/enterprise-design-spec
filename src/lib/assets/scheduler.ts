/**
 * Asset Scheduler — automated publishing of social, ads, and email assets.
 *
 * Runs as a cron job. On each tick:
 * 1. Reads the schedule config (which assets to publish when)
 * 2. Checks asset manifests for assets ready to publish
 * 3. Generates assets that need generating
 * 4. Publishes to configured destinations
 * 5. Optionally sends webhook/CI trigger
 *
 * No external services — pure Node.js + git + npm + webhooks.
 */

import { readJsonFile, findFiles, readTextFile } from "../../lib/fs.js";
import { generateAsset, type AssetManifest, type DesignTokens } from "./generator.js";
import { publishAssets, type Destination, type PublishManifest } from "./publisher.js";
import { ASSET_TYPE_REGISTRY } from "./registry.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { execSync } from "node:child_process";

export interface ScheduleConfig {
  rules: {
    scheduled?: {
      [key: string]: {
        enabled: boolean;
        cron: string;
        channelFilter: string[];
        statusFilter: string[];
        assetTypeFilter?: string[];
        brandFilter?: string[];
        messageTemplate?: string;
        outputDir?: string;
      };
    };
    autoPublish?: {
      enabled: boolean;
      onStatus: string[];
      excludeTypes?: string[];
    };
  };
  destinations?: Destination[];
  dryRun?: boolean;
}

export interface ScheduleResult {
  scheduledRuns: ScheduledRun[];
  autoPublishEvents: PublishEvent[];
  errors: string[];
  timestamp: string;
}

export interface ScheduledRun {
  scheduleName: string;
  assets: string[];
  channels: string[];
  nextRun: string;
}

export interface PublishEvent {
  manifestId: string;
  status: string;
  destination: string;
  success: boolean;
  error?: string;
}

const STATE_FILE = ".asset-scheduler-state.json";

interface SchedulerState {
  lastRun: string;
  lastPublish: string;
  publishCounts: Record<string, number>;
  errors: string[];
}

/**
 * Main scheduler tick — call this from a cron job.
 *
 * Usage:
 *   npx tsx src/lib/assets/scheduler.ts [--config ./publish.config.json]
 */
export async function runSchedulerTick(root: string, configPath?: string): Promise<ScheduleResult> {
  const errors: string[] = [];
  const scheduledRuns: ScheduledRun[] = [];
  const autoPublishEvents: PublishEvent[] = [];

  // Load config
  const cfgPath = configPath ?? resolve(root, "publish.config.json");
  const config = loadScheduleConfig(cfgPath);

  if (!config) {
    errors.push(`No schedule config found at ${cfgPath}`);
    return { scheduledRuns, autoPublishEvents, errors, timestamp: new Date().toISOString() };
  }

  // Load state
  const state = loadState(root);

  // Load manifests
  const manifests = await loadManifests(root);

  // Load tokens
  const tokens = await loadTokens(root);

  // Run each enabled schedule
  for (const [name, sched] of Object.entries(config.rules.scheduled ?? {})) {
    if (!sched.enabled) continue;

    const assets = manifests.filter((m) => {
      if (!sched.statusFilter.includes(m.status)) return false;
      if (!sched.channelFilter.some((c) => m.channels.includes(c))) return false;
      if (sched.assetTypeFilter?.length && !sched.assetTypeFilter.some((t) => m.assetType.includes(t))) return false;
      if (sched.brandFilter?.length && !sched.brandFilter.includes(m.brand)) return false;
      return true;
    });

    if (assets.length === 0) {
      console.log(`[scheduler] ${name}: no assets ready for scheduled publish`);
      continue;
    }

    console.log(`[scheduler] ${name}: publishing ${assets.length} asset(s)`);

    const outputDir = sched.outputDir ?? resolve(root, `dist/scheduled/${name}`);

    // Generate and publish
    const dests = config.destinations ?? getDefaultDestinations(root);

    for (const manifest of assets) {
      const genResult = await generateAsset({ manifest, tokens, outputDir });

      if (!genResult.success) {
        errors.push(`Generate failed for ${manifest.id}: ${genResult.errors.join("; ")}`);
        continue;
      }

      if (config.dryRun) {
        console.log(`[scheduler] ${name}: DRY RUN — would publish ${manifest.id}`);
        continue;
      }

      // Publish to destinations
      const publishResult = await publishAssets({
        sourceDir: outputDir,
        manifests: [{ ...manifest, publishedAt: new Date().toISOString() } as PublishManifest],
        destinations: dests,
        statusFilter: [manifest.status],
      });

      for (const pr of publishResult) {
        autoPublishEvents.push({
          manifestId: manifest.id,
          status: manifest.status,
          destination: pr.destination,
          success: pr.success,
          error: pr.errors[0],
        });

        if (pr.success) {
          // Update manifest status to published
          await updateManifestStatus(root, manifest.id, "published");
          console.log(`[scheduler] ${name}: published ${manifest.id} → ${pr.destination}`);
        } else {
          errors.push(`${name}/${manifest.id}: ${pr.errors.join("; ")}`);
        }
      }
    }

    scheduledRuns.push({
      scheduleName: name,
      assets: assets.map((a) => a.id),
      channels: sched.channelFilter,
      nextRun: getNextCronRun(sched.cron),
    });
  }

  // Auto-publish on status change
  if (config.rules.autoPublish?.enabled) {
    const toAutoPublish = manifests.filter((m) => {
      if (!config.rules.autoPublish!.onStatus.includes(m.status)) return false;
      if (config.rules.autoPublish!.excludeTypes?.some((t) => m.assetType.includes(t))) return false;
      return true;
    });

    for (const manifest of toAutoPublish) {
      const dests = config.destinations ?? getDefaultDestinations(root);
      const outputDir = resolve(root, "dist/assets");

      const genResult = await generateAsset({ manifest, tokens, outputDir });

      if (genResult.success && !config.dryRun) {
        const publishResult = await publishAssets({
          sourceDir: outputDir,
          manifests: [{ ...manifest, publishedAt: new Date().toISOString() } as PublishManifest],
          destinations: dests,
        });

        for (const pr of publishResult) {
          autoPublishEvents.push({
            manifestId: manifest.id,
            status: manifest.status,
            destination: pr.destination,
            success: pr.success,
          });
        }
      }
    }
  }

  // Save state
  saveState(root, state, errors);

  return { scheduledRuns, autoPublishEvents, errors, timestamp: new Date().toISOString() };
}

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

function loadScheduleConfig(path: string): ScheduleConfig | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ScheduleConfig;
  } catch {
    return null;
  }
}

function loadState(root: string): SchedulerState {
  const statePath = resolve(root, STATE_FILE);
  if (!existsSync(statePath)) {
    return { lastRun: "", lastPublish: "", publishCounts: {}, errors: [] };
  }
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return { lastRun: "", lastPublish: "", publishCounts: {}, errors: [] };
  }
}

function saveState(root: string, state: SchedulerState, errors: string[]): void {
  state.lastRun = new Date().toISOString();
  state.errors = errors.slice(-50); // keep last 50 errors
  const statePath = resolve(root, STATE_FILE);
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function getDefaultDestinations(root: string): Destination[] {
  return [{
    type: "local",
    name: "dist-assets",
    config: { outputPath: resolve(root, "dist/assets"), versioned: true, generateIndex: true },
  }];
}

async function loadManifests(root: string): Promise<AssetManifest[]> {
  const paths = await findFiles(root, ["manifests/assets/**/*.json"]);
  const manifests: AssetManifest[] = [];
  for (const p of paths) {
    try {
      const data = await readJsonFile<AssetManifest>(p);
      if (data.id && data.assetType) manifests.push(data);
    } catch { /* skip */ }
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
        Object.assign(merged, JSON.parse(readFileSync(file, "utf8")));
      } catch { /* skip */ }
    }
  }
  return merged;
}

async function updateManifestStatus(root: string, manifestId: string, newStatus: string): Promise<void> {
  const paths = await findFiles(root, ["manifests/assets/**/*.json"]);
  for (const p of paths) {
    try {
      const data = await readJsonFile<AssetManifest & Record<string, unknown>>(p);
      if (data.id === manifestId) {
        const content = readFileSync(p, "utf8");
        const parsed = JSON.parse(content);
        parsed.status = newStatus;
        parsed.publishedAt = new Date().toISOString();
        writeFileSync(p, JSON.stringify(parsed, null, 2));
        console.log(`[scheduler] Updated ${manifestId} status → ${newStatus}`);
        return;
      }
    } catch { /* skip */ }
  }
}

function getNextCronRun(cron: string): string {
  // Simple next-run estimation (not a full cron parser)
  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5) return "unknown";

    const [minute, hour, , , dayOfWeek] = parts;

    const now = new Date();

    if (minute === "0" && hour === "*") {
      return `every hour at :00`;
    }
    if (minute === "*/5") {
      return `every 5 minutes`;
    }
    if (minute !== "*" && hour !== "*") {
      return `daily at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    }

    return cron;
  } catch {
    return cron;
  }
}

// CLI entry point
async function main(): Promise<void> {
  const root = process.cwd();
  const configArg = process.argv.find((a) => a.startsWith("--config="));
  const configPath = configArg?.split("=")[1];

  const result = await runSchedulerTick(root, configPath);

  console.log("\n📊 Scheduler Run Report");
  console.log(`   Timestamp: ${result.timestamp}`);
  console.log(`   Scheduled runs: ${result.scheduledRuns.length}`);
  console.log(`   Auto-publish events: ${result.autoPublishEvents.length}`);
  console.log(`   Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    for (const err of result.errors) {
      console.log(`  - ${err}`);
    }
    process.exit(1);
  }
}

// Only run as CLI when executed directly (not imported)
const isMain = process.argv[1]?.endsWith("scheduler.ts") ||
  process.argv[1]?.endsWith("scheduler.js");
if (isMain) {
  main().catch((err) => {
    console.error("Scheduler fatal error:", err);
    process.exit(1);
  });
}
