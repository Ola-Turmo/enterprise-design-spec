import { findFiles, readJsonFile, writeTextFile } from "./fs.js";
import path from "node:path";

export type PlaygroundResult = {
  outputPath: string;
  tokenCount: number;
};

export async function generatePlayground(
  root: string,
  outputPath: string,
): Promise<PlaygroundResult> {
  const tokenPaths = await findFiles(root, ["tokens/**/*.json"]);
  const allTokens: Record<string, unknown> = {};

  for (const tokenPath of tokenPaths) {
    const tokens = await readJsonFile<Record<string, unknown>>(tokenPath);
    deepMergeTokens(allTokens, tokens);
  }

  const flat = flattenTokens(allTokens);
  const resolved = resolveAliasesForPlayground(flat);

  const html = generatePlaygroundHTML(resolved);
  await writeTextFile(outputPath, html);

  return {
    outputPath,
    tokenCount: Object.keys(resolved).length,
  };
}

function generatePlaygroundHTML(
  tokens: Record<string, { $value: string; $type: string }>,
): string {
  const colorTokens: Record<string, string> = {};
  const dimensionTokens: Record<string, string> = {};
  const otherTokens: Record<string, { value: string; type: string }> = {};

  for (const [key, token] of Object.entries(tokens)) {
    if (token.$type === "color") {
      colorTokens[key] = token.$value;
    } else if (token.$type === "dimension") {
      dimensionTokens[key] = token.$value;
    } else {
      otherTokens[key] = { value: token.$value, type: token.$type };
    }
  }

  const colorGrid = Object.entries(colorTokens)
    .map(
      ([key, value]) => `
    <div class="color-card">
      <div class="color-swatch" style="background-color: ${value}"></div>
      <div class="color-info">
        <span class="color-name">${key}</span>
        <span class="color-value">${value}</span>
      </div>
    </div>`,
    )
    .join("\n");

  const dimensionGrid = Object.entries(dimensionTokens)
    .map(
      ([key, value]) => `
    <div class="dimension-card">
      <div class="dimension-preview">
        <div class="dimension-bar" style="height: ${value}; background: var(--brand); width: 100%"></div>
      </div>
      <div class="dimension-info">
        <span class="dimension-name">${key}</span>
        <span class="dimension-value">${value}</span>
      </div>
    </div>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Token Playground</title>
  <style>
    :root {
      --bg: #0F172A;
      --surface: #1E293B;
      --border: #334155;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --brand: #8B5CF6;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }

    .header {
      padding: 2rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header h1 {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .header .stats {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .nav {
      padding: 1rem 2rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 1rem;
      position: sticky;
      top: 0;
      background: var(--bg);
      z-index: 100;
    }

    .nav a {
      color: var(--text-muted);
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      transition: all 0.15s ease;
    }

    .nav a:hover, .nav a.active {
      color: var(--text);
      background: var(--surface);
    }

    .section {
      padding: 2rem;
    }

    .section h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }

    .color-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      overflow: hidden;
      transition: transform 0.15s ease;
    }

    .color-card:hover {
      transform: translateY(-2px);
    }

    .color-swatch {
      height: 80px;
      border-bottom: 1px solid var(--border);
    }

    .color-info {
      padding: 0.75rem;
    }

    .color-name {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
    }

    .color-value {
      display: block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
    }

    .dimension-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      overflow: hidden;
    }

    .dimension-preview {
      padding: 0.75rem;
      background: var(--bg);
    }

    .dimension-bar {
      border-radius: 0.25rem;
      min-height: 4px;
    }

    .dimension-info {
      padding: 0.75rem;
    }

    .dimension-name {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
    }

    .dimension-value {
      display: block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
    }

    .search {
      padding: 0.5rem 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      color: var(--text);
      font-size: 0.875rem;
      width: 300px;
    }

    .search::placeholder {
      color: var(--text-muted);
    }

    .search:focus {
      outline: none;
      border-color: var(--brand);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Token Playground</h1>
    <div class="stats">${Object.keys(tokens).length} tokens</div>
    <input type="text" class="search" placeholder="Search tokens..." id="search">
  </div>

  <nav class="nav">
    <a href="#colors" class="active">Colors (${Object.keys(colorTokens).length})</a>
    <a href="#dimensions">Dimensions (${Object.keys(dimensionTokens).length})</a>
    <a href="#other">Other (${Object.keys(otherTokens).length})</a>
  </nav>

  <section class="section" id="colors">
    <h2>Colors</h2>
    <div class="grid">
      ${colorGrid}
    </div>
  </section>

  <section class="section" id="dimensions">
    <h2>Dimensions</h2>
    <div class="grid">
      ${dimensionGrid}
    </div>
  </section>

  <section class="section" id="other">
    <h2>Other Tokens</h2>
    <div class="grid">
      ${Object.entries(otherTokens)
        .map(
          ([key, { value, type }]) => `
        <div class="dimension-card">
          <div class="dimension-info">
            <span class="dimension-name">${key}</span>
            <span class="dimension-value">${value}</span>
            <span class="color-name">${type}</span>
          </div>
        </div>`,
        )
        .join("\n")}
    </div>
  </section>

  <script>
    const search = document.getElementById('search');
    search.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.color-card, .dimension-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? '' : 'none';
      });
    });

    document.querySelectorAll('.nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        document.querySelectorAll('.nav a').forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
      });
    });
  </script>
</body>
</html>`;
}

function flattenTokens(tokens: Record<string, unknown>): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  const visit = (obj: unknown, prefix: string[] = []) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    const record = obj as Record<string, unknown>;
    if ("$value" in record) {
      resolved[prefix.join(".")] = record;
      return;
    }
    for (const [k, v] of Object.entries(record)) {
      if (k.startsWith("$")) continue;
      visit(v, [...prefix, k]);
    }
  };
  visit(tokens, []);
  return resolved;
}

function resolveAliasesForPlayground(
  flat: Record<string, unknown>,
): Record<string, { $value: string; $type: string }> {
  const resolved: Record<string, { $value: string; $type: string }> = {};

  for (const [key, value] of Object.entries(flat)) {
    if (value && typeof value === "object" && "$value" in value) {
      const record = { ...value } as Record<string, unknown>;
      let rawValue = String(record.$value);
      let depth = 0;

      while (rawValue.startsWith("{") && rawValue.endsWith("}") && depth < 20) {
        const aliasTarget = rawValue.slice(1, -1);
        const aliased = flat[aliasTarget];
        if (aliased && typeof aliased === "object" && "$value" in aliased) {
          rawValue = String((aliased as Record<string, unknown>).$value);
        } else {
          break;
        }
        depth++;
      }

      resolved[key] = {
        $value: rawValue,
        $type: String(record.$type),
      };
    }
  }

  return resolved;
}

function deepMergeTokens(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMergeTokens(target[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      target[key] = value;
    }
  }
}
