import matter from "gray-matter";
import path from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject } from "ajv";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const addFormatsFn = require("ajv-formats") as (ajv: unknown) => void;
import { access } from "node:fs/promises";
import { findFiles, readJsonFile, readTextFile } from "./fs.js";
import { collectTokenPaths } from "./tokens.js";

type AssetManifest = {
  id: string;
  title: string;
  assetType: string;
  status: string;
  maturity: string;
  channels: string[];
  themes?: string[];
  formatProfiles: string[];
  tokenRefs?: string[];
  version: string;
};

type AssetDoc = {
  path: string;
  data: Record<string, unknown>;
};

type ValidationResult = {
  ok: boolean;
  errors: string[];
  assetCount: number;
  docCount: number;
  tokenCount: number;
};

type CatalogAsset = {
  id: string;
  title: string;
  assetType: string;
  status: string;
  maturity: string;
  version: string;
  channels: string[];
  themes: string[];
  formatProfiles: string[];
  manifestPath: string;
  docPath?: string;
};

export async function validateProject(root: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const schemaRoot = await resolveSchemaRoot(root);
  const [assetSchema, docSchema] = await Promise.all([
    readJsonFile<object>(path.join(schemaRoot, "schemas", "asset-manifest.schema.json")),
    readJsonFile<object>(path.join(schemaRoot, "schemas", "design-frontmatter.schema.json"))
  ]);

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormatsFn(ajv);

  const validateAsset = ajv.compile(assetSchema);
  const validateDoc = ajv.compile(docSchema);

  const [manifestPaths, docPaths, tokenPaths] = await Promise.all([
    findFiles(root, ["manifests/assets/**/*.json"]),
    findFiles(root, ["docs/assets/**/*.{md,mdx}"]),
    findFiles(root, ["tokens/**/*.json"])
  ]);

  const tokenRefs = new Set<string>();
  for (const tokenPath of tokenPaths) {
    const tokenFile = await readJsonFile<unknown>(tokenPath);
    collectTokenPaths(tokenFile, [], tokenRefs);
  }

  const manifestById = new Map<string, string>();
  for (const manifestPath of manifestPaths) {
    const manifest = await readJsonFile<AssetManifest>(manifestPath);
    const valid = validateAsset(manifest);
    if (!valid) {
      errors.push(...formatAjvErrors(`manifest ${relative(root, manifestPath)}`, validateAsset.errors));
    }

    manifestById.set(manifest.id, manifestPath);

    for (const tokenRef of manifest.tokenRefs ?? []) {
      if (!tokenRefs.has(tokenRef)) {
        errors.push(`manifest ${relative(root, manifestPath)} references missing token "${tokenRef}"`);
      }
    }
  }

  const docById = new Map<string, string>();
  for (const docPath of docPaths) {
    const source = await readTextFile(docPath);
    const parsed = matter(source);
    const valid = validateDoc(parsed.data);
    if (!valid) {
      errors.push(...formatAjvErrors(`doc ${relative(root, docPath)}`, validateDoc.errors));
    }

    const id = String(parsed.data.id ?? "");
    if (!id) {
      errors.push(`doc ${relative(root, docPath)} is missing front matter id`);
      continue;
    }

    docById.set(id, docPath);
  }

  for (const id of manifestById.keys()) {
    if (!docById.has(id)) {
      errors.push(`missing asset doc for manifest id "${id}"`);
    }
  }

  for (const id of docById.keys()) {
    if (!manifestById.has(id)) {
      errors.push(`missing manifest for asset doc id "${id}"`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    assetCount: manifestPaths.length,
    docCount: docPaths.length,
    tokenCount: tokenRefs.size
  };
}

export async function buildCatalog(root: string): Promise<{
  generatedAt: string;
  assetCount: number;
  assets: CatalogAsset[];
}> {
  const [manifestPaths, docs] = await Promise.all([
    findFiles(root, ["manifests/assets/**/*.json"]),
    loadDocs(root)
  ]);

  const docsById = new Map<string, AssetDoc>();
  for (const doc of docs) {
    const id = String(doc.data.id ?? "");
    if (id) {
      docsById.set(id, doc);
    }
  }

  const assets: CatalogAsset[] = [];
  for (const manifestPath of manifestPaths) {
    const manifest = await readJsonFile<AssetManifest>(manifestPath);
    const matchingDoc = docsById.get(manifest.id);

    assets.push({
      id: manifest.id,
      title: manifest.title,
      assetType: manifest.assetType,
      status: manifest.status,
      maturity: manifest.maturity,
      version: manifest.version,
      channels: manifest.channels,
      themes: manifest.themes ?? [],
      formatProfiles: manifest.formatProfiles,
      manifestPath: relative(root, manifestPath),
      docPath: matchingDoc ? relative(root, matchingDoc.path) : undefined
    });
  }

  assets.sort((a, b) => a.id.localeCompare(b.id));

  return {
    generatedAt: new Date().toISOString(),
    assetCount: assets.length,
    assets
  };
}

async function loadDocs(root: string): Promise<AssetDoc[]> {
  const docPaths = await findFiles(root, ["docs/assets/**/*.{md,mdx}"]);
  const docs: AssetDoc[] = [];

  for (const docPath of docPaths) {
    const source = await readTextFile(docPath);
    const parsed = matter(source);
    docs.push({
      path: docPath,
      data: parsed.data as Record<string, unknown>
    });
  }

  return docs;
}

function formatAjvErrors(prefix: string, errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((error) => {
    const pathSuffix = error.instancePath ? ` at ${error.instancePath}` : "";
    return `${prefix}${pathSuffix}: ${error.message ?? "schema validation error"}`;
  });
}

function relative(root: string, target: string): string {
  return path.relative(root, target).replaceAll("\\", "/");
}

async function resolveSchemaRoot(root: string): Promise<string> {
  const candidate = path.join(root, "schemas", "asset-manifest.schema.json");
  try {
    await access(candidate);
    return root;
  } catch {
    return process.cwd();
  }
}
