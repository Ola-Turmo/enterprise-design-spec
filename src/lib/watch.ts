#!/usr/bin/env node
/**
 * Watch mode: monitor token files and auto-regenerate outputs on change.
 * No external services — pure Node.js file watching + child processes.
 *
 * Usage: npx tsx src/lib/watch.ts [--root <dir>] [--output <dir>]
 *        npx enterprise-design-spec watch
 */

import { watch } from "node:fs";
import { stat } from "node:fs/promises";
import { exec } from "node:child_process";
import { resolve } from "node:path";

interface WatchOptions {
  root: string;
  output: string;
  debounceMs: number;
  verbose: boolean;
  commands: string[];
}

const DEFAULT_OPTIONS: WatchOptions = {
  root: process.cwd(),
  output: "dist/tokens",
  debounceMs: 300,
  verbose: true,
  commands: ["validate", "aliases", "export", "types", "playground"],
};

interface PendingRun {
  timer: ReturnType<typeof setTimeout>;
}

let pendingRun: PendingRun | null = null;
let isRunning = false;
let runCount = 0;

function parseArgs(): Partial<WatchOptions> {
  const args = process.argv.slice(2);
  const options: Partial<WatchOptions> = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--root":
        options.root = args[++i];
        break;
      case "--output":
        options.output = args[++i];
        break;
      case "--debounce":
        options.debounceMs = parseInt(args[++i], 10);
        break;
      case "--quiet":
        options.verbose = false;
        break;
      case "--commands":
        options.commands = args[++i].split(",");
        break;
    }
  }

  return options;
}

function log(msg: string, type: "info" | "ok" | "warn" | "error" = "info"): void {
  const opts = globalThis.__watchOpts as WatchOptions | undefined;
  if (opts && !opts.verbose && type !== "error") return;

  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const icons: Record<string, string> = {
    info: "🔄",
    ok: "✅",
    warn: "⚠️",
    error: "❌",
  };

  console.log(`${icons[type]} [${timestamp}] ${msg}`);
}

async function runCommands(opts: WatchOptions): Promise<void> {
  if (isRunning) {
    log("Previous run still in progress, skipping...", "warn");
    return;
  }

  isRunning = true;
  runCount++;
  const runId = runCount;

  log(`[Run #${runId}] Starting token pipeline...`);

  const results: Record<string, { ok: boolean; time: number; output: string }> = {};

  for (const cmd of opts.commands) {
    const start = Date.now();
    const output = await runCommand(cmd, opts);

    results[cmd] = {
      ok: output.exitCode === 0,
      time: Date.now() - start,
      output: output.stdout.slice(0, 200) + (output.stdout.length > 200 ? "..." : ""),
    };
  }

  log(`[Run #${runId}] Complete:`, "ok");
  for (const [cmd, result] of Object.entries(results)) {
    const status = result.ok ? "✅" : "❌";
    log(`  ${status} ${cmd} (${result.time}ms)`);
  }

  // Check for failures
  const failures = Object.entries(results).filter(([, r]) => !r.ok);
  if (failures.length > 0) {
    log(`${failures.length} command(s) failed — check output above`, "error");
  } else {
    log(`All ${opts.commands.length} commands succeeded`, "ok");
  }

  isRunning = false;
}

function runCommand(
  cmd: string,
  opts: WatchOptions,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    const args = [
      "tsx",
      "src/cli.ts",
      cmd,
      "--root",
      opts.root,
    ];

    if (cmd === "export") {
      args.push("--output", opts.output);
    }

    const child = exec(
      `${npx} ${args.join(" ")}`,
      { cwd: opts.root, timeout: 60000 },
      (error, stdout, stderr) => {
        resolve({
          stdout: stdout || "",
          stderr: stderr || "",
          exitCode: error && "code" in error ? (error.code as number) ?? 1 : 0,
        });
      },
    );

    // Kill after timeout
    setTimeout(() => {
      child.kill("SIGTERM");
    }, 60000);
  });
}

function scheduleRun(opts: WatchOptions): void {
  if (pendingRun) {
    clearTimeout(pendingRun.timer);
  }

  pendingRun = {
    timer: setTimeout(() => {
      pendingRun = null;
      runCommands(opts).catch(console.error);
    }, opts.debounceMs),
  };
}

function getTokenFiles(dir: string): string[] {
  try {
    const { execSync } = require("node:child_process");
    const files = execSync(
      `find "${dir}" -type f -name "*.tokens.json" -o -name "*.json" | grep tokens | head -50`,
      { encoding: "utf8", timeout: 5000 },
    );
    return files.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export function watchTokens(opts: Partial<WatchOptions> = {}): void {
  const fullOpts: WatchOptions = { ...DEFAULT_OPTIONS, ...opts };
  globalThis.__watchOpts = fullOpts;

  log(`Starting token watch mode`);
  log(`  Root: ${fullOpts.root}`);
  log(`  Output: ${fullOpts.output}`);
  log(`  Commands: ${fullOpts.commands.join(", ")}`);
  log(`  Debounce: ${fullOpts.debounceMs}ms`);
  log("");

  // Initial run
  runCommands(fullOpts).catch(console.error);

  // Get all token files to watch
  const tokenFiles = getTokenFiles(fullOpts.root);

  if (tokenFiles.length === 0) {
    log("No token files found — watching all JSON files in tokens/", "warn");
  }

  // Watch with node:fs watch (more portable than chokidar)
  const watcher = watch(fullOpts.root, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    const isTokenFile =
      filename.includes("tokens/") &&
      (filename.endsWith(".json") || filename.endsWith(".tokens.json"));

    if (!isTokenFile) return;

    log(`Detected change: ${eventType} — ${filename}`);
    scheduleRun(fullOpts);
  });

  // Handle graceful shutdown
  const shutdown = () => {
    log("Shutting down watch mode...", "info");
    watcher.close();
    if (pendingRun) clearTimeout(pendingRun.timer);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  log("");
  log("👀 Watching for token file changes... (Ctrl+C to stop)");
}

// Auto-run if called directly
const isMain = process.argv[1]?.endsWith("watch.ts") ||
               process.argv[1]?.endsWith("watch.js");
if (isMain) {
  const opts = parseArgs();
  watchTokens(opts);
}

// Extend global for type safety
declare global {
  // eslint-disable-next-line no-var
  var __watchOpts: WatchOptions | undefined;
}
