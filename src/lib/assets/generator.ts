/**
 * Asset Generator Engine
 *
 * Generates actual asset files from manifest specifications.
 * Supports three generation methods:
 * - AI_IMAGE: Uses FAL/MiniMax image generation
 * - PROGRAMMATIC: Renders from templates + tokens (SVG, HTML-to-canvas, QR codes)
 * - HYBRID: Combines AI-generated elements with programmatic composition
 * - MANUAL: Requires human designer — generates placeholder/approved skeleton
 *
 * Each generator is a pure function: manifest + tokens → generated file(s)
 */

import type { AssetTypeSpec, FormatProfile } from "./registry.js";
import { getAssetTypeSpec } from "./registry.js";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { execSync } from "node:child_process";

/**
 * Generate an image using the FAL API.
 * Requires FAL_KEY environment variable or --fal-key option.
 */
async function falGenerate(prompt: string, aspectRatio: "landscape" | "portrait" | "square"): Promise<{ image: string } | null> {
  const falKey = process.env.FAL_KEY ?? process.env.FAL_API_KEY;
  if (!falKey) {
    throw new Error("FAL_KEY or FAL_API_KEY environment variable not set. Get your key at https://fal.ai/dashboard");
  }

  const style = aspectRatio === "landscape" ? " Wide (16:9)" : aspectRatio === "portrait" ? " Tall (9:16)" : " Square (1:1)";
  const fullPrompt = `${prompt} --ar ${aspectRatio === "landscape" ? "16:9" : aspectRatio === "portrait" ? "9:16" : "1:1"}`;

  try {
    const response = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        image_size: aspectRatio === "landscape" ? "1280x720" : aspectRatio === "portrait" ? "720x1280" : "1024x1024",
        num_inference_steps: 4,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`FAL API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as { images?: { url: string }[]; image?: { url: string } };
    const imageUrl = data.images?.[0]?.url ?? data.image?.url;

    if (!imageUrl) {
      throw new Error("FAL returned no image URL");
    }

    return { image: imageUrl };
  } catch (err) {
    throw new Error(`FAL image generation failed: ${err}`);
  }
}

async function downloadOrCopyImage(imageUrl: string, outputPath: string): Promise<void> {
  if (imageUrl.startsWith("http")) {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, buffer);
  } else if (existsSync(imageUrl)) {
    mkdirSync(dirname(outputPath), { recursive: true });
    require("node:fs").copyFileSync(imageUrl, outputPath);
  } else {
    throw new Error(`Image source not found: ${imageUrl}`);
  }
}

export interface GenerateOptions {
  manifest: AssetManifest;
  tokens: DesignTokens;
  outputDir: string;
  profile?: string; // specific format profile ID
  prompt?: string; // override prompt for AI generation
  brand?: string;
}

export interface GenerateResult {
  success: boolean;
  files: GeneratedFile[];
  errors: string[];
  warnings: string[];
  method: "AI_IMAGE" | "PROGRAMMATIC" | "HYBRID" | "MANUAL";
}

export interface GeneratedFile {
  path: string;
  formatProfile: string;
  width: number;
  height: number;
  fileType: string;
  sizeBytes?: number;
}

export interface AssetManifest {
  id: string;
  title: string;
  assetType: string;
  status: string;
  maturity: string;
  brand: string;
  channels: string[];
  themes?: string[];
  formatProfiles: string[];
  tokenRefs?: string[];
  dimensions?: { w: number; h: number; ratio?: string };
  version: string;
  accessibility?: {
    altText?: string;
    wcagTarget?: string;
  };
  /** For AI_IMAGE types: custom prompt override */
  generationPrompt?: string;
  /** For PROGRAMMATIC types: template path override */
  templatePath?: string;
}

export interface DesignTokens {
  [key: string]: unknown;
}

// ══════════════════════════════════════════════════════════════════
// CORE GENERATOR
// ══════════════════════════════════════════════════════════════════

export async function generateAsset(opts: GenerateOptions): Promise<GenerateResult> {
  const { manifest, tokens, outputDir } = opts;
  const spec = getAssetTypeSpec(manifest.assetType);

  if (!spec) {
    return { success: false, files: [], errors: [`Unknown asset type: ${manifest.assetType}`], warnings: [], method: "MANUAL" };
  }

  mkdirSync(outputDir, { recursive: true });

  switch (spec.generation) {
    case "AI_IMAGE":
      return generateAIAsset(manifest, spec, tokens, outputDir, opts.prompt);
    case "PROGRAMMATIC":
      return await generateProgrammaticAsset(manifest, spec, tokens, outputDir);
    case "HYBRID":
      return generateHybridAsset(manifest, spec, tokens, outputDir);
    case "MANUAL":
      return generateManualPlaceholder(manifest, spec, tokens, outputDir);
    default:
      return { success: false, files: [], errors: [`Unknown generation method for ${manifest.assetType}`], warnings: [], method: "MANUAL" };
  }
}

// ══════════════════════════════════════════════════════════════════
// AI IMAGE GENERATION
// ══════════════════════════════════════════════════════════════════

async function generateAIAsset(
  manifest: AssetManifest,
  spec: AssetTypeSpec,
  tokens: DesignTokens,
  outputDir: string,
  promptOverride?: string,
): Promise<GenerateResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const files: GeneratedFile[] = [];

  for (const fp of spec.formatProfiles) {
    try {
      const prompt = buildGenerationPrompt(manifest, spec, fp, tokens, promptOverride);
      const aspectRatio = fp.width > fp.height ? "landscape" : fp.height > fp.width ? "portrait" : "square";

      // Use the FAL API for image generation
      const result = await falGenerate(prompt, aspectRatio);

      if (result?.image) {
        const outputPath = join(outputDir, `${manifest.id}.${fp.id}.${fp.fileType}`);
        // result.image may be a URL or file path
        await downloadOrCopyImage(result.image, outputPath);
        files.push({
          path: outputPath,
          formatProfile: fp.id,
          width: fp.width,
          height: fp.height,
          fileType: fp.fileType,
        });
      } else {
        warnings.push(`No image generated for profile ${fp.id} — FAL API returned empty`);
      }
    } catch (err) {
      errors.push(`Failed to generate ${fp.id}: ${err}`);
    }
  }

  return {
    success: errors.length === 0,
    files,
    errors,
    warnings,
    method: "AI_IMAGE",
  };
}

function buildGenerationPrompt(
  manifest: AssetManifest,
  spec: AssetTypeSpec,
  fp: FormatProfile,
  tokens: DesignTokens,
  override?: string,
): string {
  if (override) return override;

  const brandPrimary = resolveToken(tokens, "color.brand.primary") ?? "#7C3AED";
  const brandSecondary = resolveToken(tokens, "color.brand.secondary") ?? "#0EA5E9";
  const background = resolveToken(tokens, "color.background.site") ?? "#FFFFFF";

  const basePrompts: Record<string, string> = {
    "social.banner.linkedin": `${manifest.title}. Professional LinkedIn company banner. Brand colors: primary ${brandPrimary}, secondary ${brandSecondary}. Clean modern corporate design. Typography-forward with large headline text. ${fp.width}x${fp.height}px aspect ratio. No photograph. Vector-style illustration.`,
    "social.banner.twitter-x": `${manifest.title}. X/Twitter profile banner. Brand colors: ${brandPrimary}, ${brandSecondary}. Modern tech company aesthetic. ${fp.width}x${fp.height}px. Bold graphic design.`,
    "social.banner.youtube": `${manifest.title}. YouTube channel art. Brand colors ${brandPrimary} and ${brandSecondary}. Bold, eye-catching banner with brand logo and tagline space. ${fp.width}x${fp.height}px. High contrast for thumbnails.`,
    "social.post.linkedin": `${manifest.title}. LinkedIn feed post image. Professional illustration. Brand color ${brandPrimary}. Clean ${fp.width}x${fp.height}px graphic. Minimalist corporate design.`,
    "social.post.twitter-x": `${manifest.title}. X/Twitter post image. Bold graphic with brand color ${brandPrimary}. ${fp.width}x${fp.height}px. Modern social media design.`,
    "social.post.instagram": `${manifest.title}. Instagram post. Vibrant ${brandPrimary} brand palette. ${fp.width}x${fp.height}px square format. Modern lifestyle aesthetic.`,
    "advertising.display.leaderboard": `${manifest.title}. Digital display banner ad. IAB leaderboard ${fp.width}x${fp.height}. Bold brand color ${brandPrimary}. Clear CTA text space. High contrast for readability. Animated GIF style composition.`,
    "advertising.display.medium-rectangle": `${manifest.title}. Display ad ${fp.width}x${fp.height}. IAB medium rectangle. ${brandPrimary} brand. Bold typography. High click-through rate design.`,
    "illustration.spot": `${manifest.title}. Modern spot illustration for web. Brand colors ${brandPrimary} and ${brandSecondary} on ${background} background. ${fp.width}x${fp.height}px. Clean vector illustration style.`,
    "illustration.hero": `${manifest.title}. Large hero illustration. Brand colors ${brandPrimary} ${brandSecondary}. ${fp.width}x${fp.height}px wide format. Modern tech/startup aesthetic. Detailed scene composition.`,
    "product.og-image": `${manifest.title}. Open Graph link preview image ${fp.width}x${fp.height}. Brand ${brandPrimary}. Clean minimal design. Headline text space. Optimized for Facebook/LinkedIn social sharing.`,
    "ecommerce.category-banner": `${manifest.title}. E-commerce category page banner. ${brandPrimary} brand colors. ${fp.width}x${fp.height}px. Wide format with ample headline text area.`,
  };

  return basePrompts[manifest.assetType] ?? `${manifest.title}. ${spec.description}. Brand colors: ${brandPrimary}, ${brandSecondary}. ${fp.width}x${fp.height}px ${fp.fileType}. Modern professional design.`;
}

// ══════════════════════════════════════════════════════════════════
// PROGRAMMATIC GENERATION
// ══════════════════════════════════════════════════════════════════

async function generateProgrammaticAsset(
  manifest: AssetManifest,
  spec: AssetTypeSpec,
  tokens: DesignTokens,
  outputDir: string,
): Promise<GenerateResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const files: GeneratedFile[] = [];

  for (const fp of spec.formatProfiles) {
    try {
      let outputPath = join(outputDir, `${manifest.id}.${fp.id}.${fp.fileType}`);
      let content: string | Buffer = "";

      switch (manifest.assetType) {
        case "product.og-image":
        case "product.twitter-card":
          content = generateOgImageSvg(manifest, fp, tokens);
          if (fp.fileType === "png" || fp.fileType === "jpg") {
            outputPath = outputPath.replace(`.${fp.fileType}`, ".svg");
            // Note: for PNG/JPG output, would need puppeteer/playwright screenshot
            // Writing SVG first, CLI can convert with: npx @respage/screenshot or similar
          }
          break;

        case "dataviz.qr-code":
          content = await generateQrCode(manifest, fp, tokens);
          break;

        case "icon.ui":
        case "icon.featured":
          content = generateIconSvg(manifest, fp, tokens);
          break;

        case "email.button":
          content = generateEmailButtonSvg(manifest, fp, tokens);
          break;

        case "email.social-icons":
          content = generateSocialIconsSvg(manifest, fp, tokens);
          break;

        case "video.lower-third":
          content = generateLowerThirdSvg(manifest, fp, tokens);
          break;

        case "dataviz.barcode":
          content = generateBarcode(manifest, fp, tokens);
          break;

        case "product.placeholder":
          content = generatePlaceholderSvg(manifest, fp, tokens);
          break;

        case "product.error-state":
          content = generateErrorStateSvg(manifest, fp, tokens);
          break;

        case "logo.favicon":
          content = generateFaviconSvg(manifest, fp, tokens);
          break;

        case "ecommerce.promotional-badge":
          content = generateBadgeSvg(manifest, fp, tokens);
          break;

        case "print.business-card":
        case "print.letterhead":
          content = generatePrintDocumentSvg(manifest, fp, tokens);
          break;

        case "advertising.display.leaderboard":
        case "advertising.display.medium-rectangle":
        case "advertising.display.billboard":
        case "advertising.display.large-mobile":
        case "advertising.display.half-page":
          content = generateDisplayAdSvg(manifest, fp, tokens);
          break;

        default:
          // For any programmatic type, generate a branded SVG template
          content = generateBrandedSvg(manifest, fp, tokens);
      }

      writeFileSync(outputPath, content);
      files.push({
        path: outputPath,
        formatProfile: fp.id,
        width: fp.width,
        height: fp.height,
        fileType: fp.fileType,
      });
    } catch (err) {
      errors.push(`Failed to generate ${fp.id}: ${err}`);
    }
  }

  return {
    success: errors.length === 0,
    files,
    errors,
    warnings,
    method: "PROGRAMMATIC",
  };
}

// ══════════════════════════════════════════════════════════════════
// HYBRID GENERATION
// ══════════════════════════════════════════════════════════════════

async function generateHybridAsset(
  manifest: AssetManifest,
  spec: AssetTypeSpec,
  tokens: DesignTokens,
  outputDir: string,
): Promise<GenerateResult> {
  // Hybrid: AI generate a base image, then programmatically add text/overlays
  const warnings = ["Hybrid generation: AI base + programmatic overlay — confirm output manually"];
  const files: GeneratedFile[] = [];
  const errors: string[] = [];

  for (const fp of spec.formatProfiles) {
    // Generate base with AI, then overlay with programmatic text/branding
    try {
      const prompt = buildGenerationPrompt(manifest, spec, fp, tokens, manifest.generationPrompt);
      const aspectRatio = fp.width > fp.height ? "landscape" : fp.height > fp.width ? "portrait" : "square";
      const result = await falGenerate(prompt, aspectRatio);

      if (result?.image) {
        const basePath = join(outputDir, `${manifest.id}.${fp.id}.base.png`);
        await downloadOrCopyImage(result.image, basePath);

        // Then programmatically add text overlay (title, brand mark, CTA)
        const overlaidPath = join(outputDir, `${manifest.id}.${fp.id}.${fp.fileType}`);
        await overlayTextOnImage(basePath, overlaidPath, manifest, fp, tokens);
        files.push({ path: overlaidPath, formatProfile: fp.id, width: fp.width, height: fp.height, fileType: fp.fileType });
      }
    } catch (err) {
      errors.push(`Hybrid generation failed for ${fp.id}: ${err}`);
    }
  }

  return { success: errors.length === 0, files, errors, warnings, method: "HYBRID" };
}

async function overlayTextOnImage(
  basePath: string,
  outputPath: string,
  manifest: AssetManifest,
  fp: FormatProfile,
  tokens: DesignTokens,
): Promise<void> {
  // Use ImageMagick or similar if available
  try {
    const brandPrimary = resolveToken(tokens, "color.brand.primary") ?? "#7C3AED";
    const fontSize = Math.round(fp.height * 0.08);
    const title = manifest.title || "Brand";

    execSync(
      `convert "${basePath}" -gravity center -fill white -font Helvetica-Bold -pointsize ${fontSize} ` +
        `-annotate +0+${Math.round(fp.height * 0.15)} "${title}" "${outputPath}"`,
      { stdio: "ignore" },
    );
  } catch {
    // If ImageMagick not available, just copy the base as output
    const { copyFileSync } = await import("node:fs");
    copyFileSync(basePath, outputPath);
  }
}

// ══════════════════════════════════════════════════════════════════
// MANUAL PLACEHOLDER
// ══════════════════════════════════════════════════════════════════

function generateManualPlaceholder(
  manifest: AssetManifest,
  spec: AssetTypeSpec,
  tokens: DesignTokens,
  outputDir: string,
): GenerateResult {
  const warnings = [`${manifest.assetType} is MANUAL — requires designer to create. Placeholder generated.`];
  const files: GeneratedFile[] = [];

  for (const fp of spec.formatProfiles) {
    const outputPath = join(outputDir, `${manifest.id}.${fp.id}.placeholder.svg`);
    const svg = generateBrandedSvg(
      {
        ...manifest,
        title: `[PLACEHOLDER] ${manifest.title}`,
      },
      fp,
      tokens,
    );
    writeFileSync(outputPath, svg);
    files.push({
      path: outputPath,
      formatProfile: fp.id,
      width: fp.width,
      height: fp.height,
      fileType: "svg",
    });
  }

  return {
    success: true,
    files,
    errors: [],
    warnings,
    method: "MANUAL",
  };
}

// ══════════════════════════════════════════════════════════════════
// SVG GENERATORS — PROGRAMMATIC ASSET TYPES
// ══════════════════════════════════════════════════════════════════

function generateOgImageSvg(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): string {
  const brandPrimary = resolveToken(tokens, "color.brand.primary") ?? "#7C3AED";
  const brandSecondary = resolveToken(tokens, "color.brand.secondary") ?? "#0EA5E9";
  const background = resolveToken(tokens, "color.background.site") ?? "#FFFFFF";
  const textColor = resolveToken(tokens, "color.text.default") ?? "#0F172A";
  const altText = manifest.accessibility?.altText ?? manifest.title;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${background}"/>
      <stop offset="100%" style="stop-color:${brandPrimary}15"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${brandPrimary}"/>
      <stop offset="100%" style="stop-color:${brandSecondary}"/>
    </linearGradient>
  </defs>
  <rect width="${fp.width}" height="${fp.height}" fill="url(#bg)"/>
  <rect x="60" y="60" width="8" height="${fp.height - 120}" rx="4" fill="url(#accent)"/>
  <text x="100" y="${Math.round(fp.height * 0.42)}" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.round(fp.height * 0.1)}" font-weight="700" fill="${textColor}" letter-spacing="-1">${escapeXml(manifest.title)}</text>
  <text x="100" y="${Math.round(fp.height * 0.58)}" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.round(fp.height * 0.05)}" fill="${textColor}" opacity="0.6">${escapeXml(altText)}</text>
  <circle cx="${fp.width - 100}" cy="${fp.height * 0.75}" r="40" fill="url(#accent)" opacity="0.15"/>
  <text x="100%" y="95%" text-anchor="end" font-family="system-ui, sans-serif" font-size="${Math.round(fp.height * 0.04)}" fill="${brandPrimary}" font-weight="600">${escapeXml(String((tokens.brand as {name?: string})?.name ?? "Brand"))}</text>
</svg>`;
}

async function generateQrCode(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): Promise<string> {
  const fg = resolveToken(tokens, "color.qr.foreground") ?? "#0F172A";
  const bg = resolveToken(tokens, "color.qr.background") ?? "#FFFFFF";
  const size = Math.min(fp.width, fp.height);

  // Generate a real QR code SVG using the qrcode library's native SVG output
  try {
    const QRCode = await import("qrcode");
    const svgData = await QRCode.default.toString(
      JSON.stringify({ asset: manifest.id, type: manifest.assetType }),
      {
        errorCorrectionLevel: "M",
        type: "svg",
        width: size,
        margin: 1,
        color: { dark: fg, light: bg },
      }
    );
    return svgData;
  } catch (err) {
    // Fallback: visual placeholder if qrcode library fails
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <rect width="${fp.width}" height="${fp.height}" fill="${bg}" rx="8"/>
  <g transform="translate(${fp.width * 0.1}, ${fp.height * 0.1})">
    ${generateQrPattern(fg, size * 0.8)}
  </g>
  <text x="50%" y="98%" text-anchor="middle" font-family="monospace" font-size="${Math.round(size * 0.06)}" fill="${fg}" opacity="0.4">QR: ${manifest.id}</text>
</svg>`;
  }
}

function generateQrPattern(color: string, size: number): string {
  // Simple QR-like pattern (not a real QR code — use the qrcode library for production)
  const cellSize = size / 25;
  let rects = "";

  // Corner finder patterns
  const addFinder = (x: number, y: number) => {
    rects += `<rect x="${x}" y="${y}" width="${cellSize * 7}" height="${cellSize * 7}" fill="${color}"/>`;
    rects += `<rect x="${x + cellSize}" y="${y + cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" fill="${color}" opacity="0"/>`;
    rects += `<rect x="${x + cellSize * 2}" y="${y + cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" fill="${color}"/>`;
  };

  addFinder(0, 0);
  addFinder(size - cellSize * 7, 0);
  addFinder(0, size - cellSize * 7);

  // Data pattern (pseudo-random cells)
  const seed = 42;
  for (let row = 0; row < 25; row++) {
    for (let col = 0; col < 25; col++) {
      const isCorner = (row < 8 && col < 8) || (row < 8 && col > 16) || (row > 16 && col < 8);
      if (!isCorner && ((row * 7 + col * 3 + seed) % 5 === 0)) {
        rects += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`;
      }
    }
  }

  return rects;
}

function generateIconSvg(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): string {
  const color = resolveToken(tokens, "color.icon.default") ?? "#0F172A";
  const size = Math.min(fp.width, fp.height);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <rect width="${fp.width}" height="${fp.height}" fill="none"/>
  <circle cx="${fp.width / 2}" cy="${fp.height / 2}" r="${size * 0.35}" fill="${color}"/>
  <text x="50%" y="55%" text-anchor="middle" font-family="system-ui" font-size="${Math.round(size * 0.3)}" font-weight="700" fill="${color}" opacity="0.8">${escapeXml(manifest.title.charAt(0).toUpperCase())}</text>
</svg>`;
}

function generateEmailButtonSvg(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): string {
  const bg = resolveToken(tokens, "color.brand.primary") ?? "#7C3AED";
  const textColor = resolveToken(tokens, "color.text.inverse") ?? "#FFFFFF";
  const radius = resolveToken(tokens, "radius.button") ?? "8";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
    </filter>
  </defs>
  <rect width="${fp.width}" height="${fp.height}" rx="${radius}" fill="${bg}" filter="url(#shadow)"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.round(fp.height * 0.4)}" font-weight="600" fill="${textColor}">${escapeXml(manifest.title)}</text>
</svg>`;
}

function generateSocialIconsSvg(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): string {
  const color = resolveToken(tokens, "color.brand.primary") ?? "#7C3AED";
  const size = Math.min(fp.width, fp.height);
  const iconSize = size * 0.6;
  const offset = (size - iconSize) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <circle cx="${fp.width / 2}" cy="${fp.height / 2}" r="${iconSize / 2}" fill="${color}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="${Math.round(iconSize * 0.5)}" font-weight="600" fill="white">${escapeXml(manifest.title.charAt(0).toUpperCase())}</text>
</svg>`;
}

function generateLowerThirdSvg(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): string {
  const brandPrimary = resolveToken(tokens, "color.brand.primary") ?? "#7C3AED";
  const textColor = resolveToken(tokens, "color.text.inverse") ?? "#FFFFFF";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <defs>
    <linearGradient id="lt-bg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${brandPrimary};stop-opacity:0.95"/>
      <stop offset="100%" style="stop-color:${brandPrimary};stop-opacity:0.8"/>
    </linearGradient>
  </defs>
  <rect x="40" y="${fp.height - 120}" width="${fp.width * 0.5}" height="80" rx="4" fill="url(#lt-bg)"/>
  <text x="60" y="${fp.height - 80}" font-family="system-ui, sans-serif" font-size="32" font-weight="700" fill="${textColor}">${escapeXml(manifest.title)}</text>
  <text x="60" y="${fp.height - 50}" font-family="system-ui, sans-serif" font-size="20" fill="${textColor}" opacity="0.8">Speaker Name</text>
</svg>`;
}

function generateBarcode(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): string {
  const fg = resolveToken(tokens, "color.barcode.foreground") ?? "#0F172A";
  const bg = resolveToken(tokens, "color.barcode.background") ?? "#FFFFFF";
  const barCount = 30;
  const barWidth = fp.width / barCount;
  const seed = hashCode(manifest.id);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <rect width="${fp.width}" height="${fp.height}" fill="${bg}"/>
  ${Array.from({ length: barCount }, (_, i) => {
    const width = (i % 3 === 0) ? barWidth : barWidth * 0.6;
    const x = i * barWidth + (barWidth - width) / 2;
    const visible = ((seed + i * 7) % 3) !== 0;
    return visible ? `<rect x="${x}" y="0" width="${width}" height="${fp.height * 0.85}" fill="${fg}"/>` : "";
  }).join("\n  ")}
  <text x="50%" y="${fp.height * 0.95}" text-anchor="middle" font-family="monospace" font-size="${Math.round(fp.height * 0.15)}" fill="${fg}">${escapeXml(manifest.id)}</text>
</svg>`;
}

function generatePlaceholderSvg(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): string {
  const bg = resolveToken(tokens, "color.background.muted") ?? "#F1F5F9";
  const opacity = resolveToken(tokens, "opacity.skeleton") ?? "0.4";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <defs>
    <pattern id="shimmer" x="0" y="0" width="${fp.width}" height="${fp.height}" patternUnits="userSpaceOnUse">
      <rect width="${fp.width}" height="${fp.height}" fill="${bg}"/>
      <rect width="${fp.width / 2}" height="${fp.height}" fill="${bg}" opacity="${opacity}">
        <animate attributeName="x" from="${fp.width}" to="0" dur="1.5s" repeatCount="indefinite"/>
      </rect>
    </pattern>
  </defs>
  <rect width="${fp.width}" height="${fp.height}" fill="url(#shimmer)"/>
</svg>`;
}

function generateErrorStateSvg(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): string {
  const textMuted = resolveToken(tokens, "color.text.muted") ?? "#64748B";
  const bg = resolveToken(tokens, "color.background.site") ?? "#FFFFFF";
  const errorColor = resolveToken(tokens, "color.semantic.error") ?? "#EF4444";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <rect width="${fp.width}" height="${fp.height}" fill="${bg}"/>
  <circle cx="${fp.width / 2}" cy="${fp.height * 0.35}" r="${Math.min(fp.width, fp.height) * 0.2}" fill="${errorColor}" opacity="0.1" stroke="${errorColor}" stroke-width="3"/>
  <line x1="${fp.width / 2 - 20}" y1="${fp.height * 0.35 - 20}" x2="${fp.width / 2 + 20}" y2="${fp.height * 0.35 + 20}" stroke="${errorColor}" stroke-width="4" stroke-linecap="round"/>
  <line x1="${fp.width / 2 + 20}" y1="${fp.height * 0.35 - 20}" x2="${fp.width / 2 - 20}" y2="${fp.height * 0.35 + 20}" stroke="${errorColor}" stroke-width="4" stroke-linecap="round"/>
  <text x="50%" y="${fp.height * 0.62}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.round(fp.height * 0.07)}" font-weight="600" fill="${textMuted}">${escapeXml(manifest.title)}</text>
  <text x="50%" y="${fp.height * 0.72}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.round(fp.height * 0.045)}" fill="${textMuted}" opacity="0.6">Something went wrong</text>
</svg>`;
}

function generateFaviconSvg(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): string {
  const brandPrimary = resolveToken(tokens, "color.brand.primary") ?? "#7C3AED";
  const size = Math.min(fp.width, fp.height);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <rect width="${fp.width}" height="${fp.height}" rx="${size * 0.15}" fill="${brandPrimary}"/>
  <text x="50%" y="55%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.round(size * 0.55)}" font-weight="700" fill="white">${escapeXml(String((tokens.brand as {name?: string})?.name ?? "B").charAt(0))}</text>
</svg>`;
}

function generatePrintDocumentSvg(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): string {
  const brandPrimary = resolveToken(tokens, "color.brand.primary") ?? "#7C3AED";
  const textColor = resolveToken(tokens, "color.text.default") ?? "#0F172A";
  const printBg = resolveToken(tokens, "color.print.background") ?? "#FFFFFF";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <rect width="${fp.width}" height="${fp.height}" fill="${printBg}"/>
  <rect x="${fp.width * 0.05}" y="${fp.height * 0.05}" width="${fp.width * 0.9}" height="${fp.height * 0.12}" fill="${brandPrimary}"/>
  <text x="${fp.width * 0.55}" y="${fp.height * 0.115}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.round(fp.height * 0.07)}" font-weight="600" fill="white">${escapeXml(String((tokens.brand as {name?: string})?.name ?? "Brand"))}</text>
  <line x1="${fp.width * 0.05}" y1="${fp.height * 0.22}" x2="${fp.width * 0.95}" y2="${fp.height * 0.22}" stroke="${brandPrimary}" stroke-width="1" opacity="0.3"/>
  <rect x="${fp.width * 0.05}" y="${fp.height * 0.25}" width="${fp.width * 0.4}" height="${fp.height * 0.04}" fill="${textColor}" opacity="0.8" rx="2"/>
  <rect x="${fp.width * 0.05}" y="${fp.height * 0.32}" width="${fp.width * 0.9}" height="${fp.height * 0.015}" fill="${textColor}" opacity="0.15" rx="1"/>
  <rect x="${fp.width * 0.05}" y="${fp.height * 0.34}" width="${fp.width * 0.75}" height="${fp.height * 0.015}" fill="${textColor}" opacity="0.15" rx="1"/>
  <rect x="${fp.width * 0.05}" y="${fp.height * 0.36}" width="${fp.width * 0.85}" height="${fp.height * 0.015}" fill="${textColor}" opacity="0.15" rx="1"/>
  <rect x="${fp.width * 0.05}" y="${fp.height * 0.38}" width="${fp.width * 0.6}" height="${fp.height * 0.015}" fill="${textColor}" opacity="0.15" rx="1"/>
</svg>`;
}

function generateDisplayAdSvg(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): string {
  const brandPrimary = resolveToken(tokens, "color.brand.primary") ?? "#7C3AED";
  const textColor = "#FFFFFF";
  const fontSize = Math.max(Math.round(fp.height * 0.35), 14);
  const ctaSize = Math.max(Math.round(fp.height * 0.22), 10);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <defs>
    <linearGradient id="ad-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${brandPrimary}"/>
      <stop offset="100%" style="stop-color:${adjustColor(brandPrimary, -20)}"/>
    </linearGradient>
  </defs>
  <rect width="${fp.width}" height="${fp.height}" fill="url(#ad-bg)"/>
  <text x="${fp.width / 2}" y="${fp.height * 0.45}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${fontSize}" font-weight="700" fill="${textColor}">${escapeXml(manifest.title)}</text>
  <rect x="${fp.width / 2 - 60}" y="${fp.height * 0.62}" width="120" height="${fp.height * 0.28}" rx="${fp.height * 0.05}" fill="white" opacity="0.95"/>
  <text x="${fp.width / 2}" y="${fp.height * 0.78}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${ctaSize}" font-weight="700" fill="${brandPrimary}">Learn More →</text>
</svg>`;
}

function generateBrandedSvg(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): string {
  const brandPrimary = resolveToken(tokens, "color.brand.primary") ?? "#7C3AED";
  const bg = resolveToken(tokens, "color.background.site") ?? "#FFFFFF";
  const textColor = resolveToken(tokens, "color.text.default") ?? "#0F172A";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <rect width="${fp.width}" height="${fp.height}" fill="${bg}"/>
  <rect x="${fp.width * 0.1}" y="${fp.height * 0.35}" width="6" height="${fp.height * 0.3}" fill="${brandPrimary}" rx="3"/>
  <text x="${fp.width * 0.15}" y="${fp.height * 0.5}" font-family="system-ui, sans-serif" font-size="${Math.round(fp.height * 0.12)}" font-weight="700" fill="${textColor}">${escapeXml(manifest.title)}</text>
  <text x="${fp.width * 0.15}" y="${fp.height * 0.62}" font-family="system-ui, sans-serif" font-size="${Math.round(fp.height * 0.05)}" fill="${textColor}" opacity="0.5">${escapeXml(manifest.assetType)}</text>
</svg>`;
}

function generateBadgeSvg(manifest: AssetManifest, fp: FormatProfile, tokens: DesignTokens): string {
  // Derive badge text from the format profile ID: sale → SALE, new → NEW, hot → HOT
  const id = fp.id.toLowerCase();
  let text = "BADGE";
  let bgColor = "#7C3AED"; // brand primary purple
  if (id.includes("sale")) { text = "SALE"; bgColor = "#DC2626"; } // red
  else if (id.includes("new")) { text = "NEW"; bgColor = "#059669"; } // green
  else if (id.includes("hot")) { text = "HOT"; bgColor = "#EA580C"; } // orange
  else if (id.includes("discount")) { text = "-20%"; bgColor = "#DC2626"; }

  const fgColor = "#FFFFFF";
  const fontSize = Math.round(fp.height * 0.35);
  const padding = fp.width * 0.1;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fp.width}" height="${fp.height}" viewBox="0 0 ${fp.width} ${fp.height}">
  <rect width="${fp.width}" height="${fp.height}" fill="${bgColor}" rx="${Math.round(fp.height * 0.1)}"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${fontSize}" font-weight="800" fill="${fgColor}" letter-spacing="1">${text}</text>
</svg>`;
}

// ══════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════

export function resolveToken(tokens: DesignTokens, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = tokens;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  // Resolve to $value if present
  if (typeof current === "object" && current !== null && "$value" in (current as object)) {
    current = (current as { $value: unknown }).$value;
  }

  // If it's a DTF token reference like "{color.white}", resolve recursively
  if (typeof current === "string" && current.startsWith("{") && current.endsWith("}")) {
    const innerPath = current.slice(1, -1); // strip { and }
    return resolveToken(tokens, innerPath);
  }

  return typeof current === "string" ? current : String(current);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}


