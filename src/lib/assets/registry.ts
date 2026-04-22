/**
 * Comprehensive Asset Type Taxonomy
 *
 * Every design asset type needed for modern web apps, social media,
 * advertising, email, print, and product teams. Each entry defines:
 * - All required format profiles (dimensions, DPI, color space, file type)
 * - Token dependencies (which design tokens drive the visual)
 * - Generation method (AI_IMAGE, PROGRAMMATIC, or HYBRID)
 * - Publishing channels and destinations
 * - WCAG accessibility requirements
 *
 * This is the definitive registry. Add new asset types here, and the
 * generator/publisher CLI automatically knows what to do.
 */

export type AssetCategory =
  | "brand"
  | "marketing"
  | "social"
  | "advertising"
  | "email"
  | "print"
  | "product-ui"
  | "video"
  | "document"
  | "data-visualization"
  | "motion"
  | "illustration"
  | "icon"
  | "ar-vr"
  | "ecommerce";

export type GenerationMethod = "AI_IMAGE" | "PROGRAMMATIC" | "HYBRID" | "MANUAL";

export type ColorSpace = "sRGB" | "Display-P3" | "CMYK" | "Grayscale";
export type Units = "px" | "in" | "mm" | "pt";

export interface FormatProfile {
  /** Unique profile name e.g. "png-icon-512" */
  id: string;
  /** Render dimensions */
  width: number;
  height: number;
  /** Physical units for print */
  units?: Units;
  /** DPI for print assets */
  dpi?: number;
  colorSpace: ColorSpace;
  fileType: "svg" | "png" | "jpg" | "webp" | "avif" | "gif" | "pdf" | "eps" | "ai" | "fig" | "mp4" | "webm" | "lottie" | "webp-animated" | "gif-animated" | "zip";
  alpha: boolean;
  /** Compression hint */
  quality?: number;
  /** For responsive/HIDPI variants */
  scaleFactors?: number[];
  notes?: string;
}

export interface AssetTypeSpec {
  /** Unique asset type identifier */
  type: string;
  category: AssetCategory;
  /** Human-readable name */
  name: string;
  /** Markdown description */
  description: string;
  generation: GenerationMethod;
  /** Required format profiles for this asset type */
  formatProfiles: FormatProfile[];
  /** Token paths that drive the visual rendering */
  tokenRefs?: string[];
  /** Default status for new assets */
  defaultStatus: "draft" | "in-review" | "approved" | "published" | "deprecated";
  /** WCAG level required */
  wcagLevel: "A" | "AA" | "AAA";
  /** Minimum contrast ratio required */
  minContrastRatio?: number;
  /** Platforms/channels this asset is used on */
  channels: string[];
  /** Usage contexts */
  usageContexts: string[];
  /** Whether this asset type supports theming */
  thematic: boolean;
  /** Whether this asset supports animation */
  animated: boolean;
  /** Whether this asset requires text localization */
  localized: boolean;
  /** Sort order in UI */
  sortOrder: number;
}

/**
 * FORMAT PROFILE NAMING CONVENTIONS:
 *
 * png-icon-{size}        → icon at specific px size (16, 24, 32, 48, 64, 128, 256, 512, 1024)
 * svg-web                → SVG for web use
 * jpg-social-{platform}  → JPG optimized for specific social platform
 * png-social-{platform}-{size} → PNG for social at 1x/2x/3x
 * pdfx4-print            → PDF/X-4 for press
 * mp4-video-{quality}    → MP4 video at quality tier
 * webp-animated          → Animated WebP
 */

/**
 * Complete Asset Type Registry
 * 60+ asset types covering every conceivable design asset need
 */
export const ASSET_TYPE_REGISTRY: AssetTypeSpec[] = [
  // ══════════════════════════════════════════════════════════════
  // BRAND IDENTITY
  // ══════════════════════════════════════════════════════════════

  {
    type: "logo.wordmark",
    category: "brand",
    name: "Wordmark Logo",
    description: "Company name in custom typeface. Primary brand identifier.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "svg-web", width: 800, height: 200, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "png-light-512", width: 512, height: 128, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2, 3] },
      { id: "png-dark-512", width: 512, height: 128, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2, 3] },
      { id: "pdfx4-print", width: 50, height: 15, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "pdf", alpha: false },
      { id: "eps-print", width: 50, height: 15, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "eps", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "font.family.brand"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["web", "email", "print", "presentation", "social", "broadcast"],
    usageContexts: ["site-header", "invoice-header", "proposal-cover", "press-kit", "merchandise"],
    thematic: true,
    animated: false,
    localized: false,
    sortOrder: 1,
  },

  {
    type: "logo.mark",
    category: "brand",
    name: "Brand Mark / Symbol",
    description: "Standalone icon/symbol without wordmark. Used when company name is visible nearby.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "svg-web", width: 400, height: 400, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "png-light-256", width: 256, height: 256, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2, 3, 4] },
      { id: "png-dark-256", width: 256, height: 256, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2, 3, 4] },
      { id: "pdfx4-print", width: 30, height: 30, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "pdf", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "logo.mark.color"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["web", "email", "print", "presentation", "social", "broadcast", "app-icon"],
    usageContexts: ["app-icon", "favicon", "social-profile", "stamp", "seal"],
    thematic: true,
    animated: false,
    localized: false,
    sortOrder: 2,
  },

  {
    type: "logo.combination",
    category: "brand",
    name: "Combination Lockup",
    description: "Wordmark + mark together in approved layout. Default for most uses.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "svg-web-h", width: 800, height: 300, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "svg-web-v", width: 400, height: 500, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "png-h-512", width: 512, height: 192, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2, 3] },
      { id: "png-v-512", width: 256, height: 320, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2, 3] },
      { id: "pdfx4-print", width: 80, height: 30, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "pdf", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.secondary", "font.family.brand"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["web", "email", "print", "presentation", "social"],
    usageContexts: ["site-header", "proposal-cover", "deck-title", "press-kit"],
    thematic: true,
    animated: false,
    localized: false,
    sortOrder: 3,
  },

  {
    type: "logo.app-icon",
    category: "brand",
    name: "App Icon",
    description: "Icon for iOS, Android, macOS, Windows, and PWA app stores and launch screens.",
    generation: "HYBRID",
    formatProfiles: [
      { id: "png-ios-1024", width: 1024, height: 1024, colorSpace: "Display-P3", fileType: "png", alpha: false, scaleFactors: [1] },
      { id: "png-android-512", width: 512, height: 512, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2, 3, 4] },
      { id: "png-macos-1024", width: 1024, height: 1024, colorSpace: "Display-P3", fileType: "png", alpha: false },
      { id: "png-windows-256", width: 256, height: 256, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2, 4] },
      { id: "svg-pwa", width: 512, height: 512, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "webp-pwa", width: 512, height: 512, colorSpace: "sRGB", fileType: "webp", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.accent", "logo.mark.color", "radius.app-icon"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    channels: ["ios-app-store", "android-google-play", "macos-app-store", "windows-store", "pwa", "linux"],
    usageContexts: ["app-launch", "app-store-listing", "system-app-switcher", "spotlight"],
    thematic: true,
    animated: false,
    localized: false,
    sortOrder: 4,
  },

  {
    type: "logo.favicon",
    category: "brand",
    name: "Favicon & Browser Icons",
    description: "Browser tab, address bar, and bookmark icons. Multiple formats for cross-browser support.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "ico-favicon", width: 32, height: 32, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "svg-favicon", width: 32, height: 32, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "png-favicon-16", width: 16, height: 16, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-favicon-32", width: 32, height: 32, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-favicon-48", width: 48, height: 48, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "webp-favicon", width: 32, height: 32, colorSpace: "sRGB", fileType: "webp", alpha: true },
      { id: "png-apple-touch", width: 180, height: 180, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "png-mstile-150", width: 150, height: 150, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "png-msapplication-310", width: 310, height: 310, colorSpace: "sRGB", fileType: "png", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "logo.mark.color"],
    defaultStatus: "published",
    wcagLevel: "AA",
    channels: ["web-browser", "pwa"],
    usageContexts: ["browser-tab", "bookmark", "address-bar", "tiles"],
    thematic: true,
    animated: false,
    localized: false,
    sortOrder: 5,
  },

  {
    type: "logo.social-profile",
    category: "brand",
    name: "Social Profile Image",
    description: "Avatar/profile picture for social media platforms. Must work at tiny sizes.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "png-400", width: 400, height: 400, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "jpg-400", width: 400, height: 400, colorSpace: "sRGB", fileType: "jpg", alpha: false },
      { id: "webp-400", width: 400, height: 400, colorSpace: "sRGB", fileType: "webp", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "logo.mark.color"],
    defaultStatus: "published",
    wcagLevel: "AA",
    minContrastRatio: 3,
    channels: ["twitter-x", "linkedin", "facebook", "instagram", "youtube", "tiktok", "threads", "mastodon", "bluesky"],
    usageContexts: ["profile-avatar", "comment-avatar", "chat-avatar"],
    thematic: true,
    animated: false,
    localized: false,
    sortOrder: 6,
  },

  {
    type: "brand.guidelines-pdf",
    category: "brand",
    name: "Brand Guidelines PDF",
    description: "Comprehensive brand style guide PDF covering logo usage, colors, typography, voice.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "pdf-brand-guidelines", width: 210, height: 297, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "pdf", alpha: false },
      { id: "pdf-brand-guidelines-web", width: 1920, height: 1080, colorSpace: "sRGB", fileType: "pdf", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "font.family.brand", "font.family.sans", "space.section", "radius.default"],
    defaultStatus: "approved",
    wcagLevel: "AAA",
    channels: ["print", "web-download", "email-attachment"],
    usageContexts: ["brand-onboarding", "partner-onboarding", "press-kit"],
    thematic: false,
    animated: false,
    localized: true,
    sortOrder: 7,
  },

  // ══════════════════════════════════════════════════════════════
  // SOCIAL MEDIA
  // ══════════════════════════════════════════════════════════════

  {
    type: "social.banner.linkedin",
    category: "social",
    name: "LinkedIn Banner",
    description: "Cover/banner image for LinkedIn company page and personal profiles.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-company-cover-1584x396", width: 1584, height: 396, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "jpg-company-cover-1584x396", width: 1584, height: 396, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
      { id: "png-personal-cover-1584x396", width: 1584, height: 396, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.secondary", "typography.heading", "color.background.site"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["linkedin"],
    usageContexts: ["company-profile-cover", "personal-profile-header"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 10,
  },

  {
    type: "social.banner.twitter-x",
    category: "social",
    name: "X (Twitter) Banner",
    description: "Profile banner image for X/Twitter profiles.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-banner-1500x500", width: 1500, height: 500, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "jpg-banner-1500x500", width: 1500, height: 500, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
      { id: "webp-banner-1500x500", width: 1500, height: 500, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.background.site"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["twitter-x"],
    usageContexts: ["profile-header", "campaign-branding"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 11,
  },

  {
    type: "social.banner.youtube",
    category: "social",
    name: "YouTube Channel Banner & Thumbnails",
    description: "Channel art + video thumbnails. Thumbnails are the #1 driver of click-through rate.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-channel-art-2560x1440", width: 2560, height: 1440, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "jpg-channel-art-2560x1440", width: 2560, height: 1440, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
      { id: "png-thumb-hd-1280x720", width: 1280, height: 720, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "webp-thumb-hd-1280x720", width: 1280, height: 720, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
      { id: "png-thumb-mobile-480x360", width: 480, height: 360, colorSpace: "sRGB", fileType: "png", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.text.inverse", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["youtube"],
    usageContexts: ["channel-art", "video-thumbnail", "shorts-thumbnail", "live-stream-thumb"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 12,
  },

  {
    type: "social.banner.facebook",
    category: "social",
    name: "Facebook Page Banner & Cover",
    description: "Cover photo for Facebook pages, groups, and personal profiles.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-cover-820x312", width: 820, height: 312, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "png-cover-high-1640x624", width: 1640, height: 624, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "jpg-cover-820x312", width: 820, height: 312, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
      { id: "webp-cover-820x312", width: 820, height: 312, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.background.site"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["facebook"],
    usageContexts: ["page-cover", "group-cover"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 13,
  },

  {
    type: "social.banner.instagram",
    category: "social",
    name: "Instagram Profile & Story Assets",
    description: "Instagram profile grid images, story stickers, and highlight covers.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-profile-grid-1080x1080", width: 1080, height: 1080, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "jpg-profile-grid-1080x1080", width: 1080, height: 1080, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
      { id: "png-story-1080x1920", width: 1080, height: 1920, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "jpg-story-1080x1920", width: 1080, height: 1920, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
      { id: "png-reel-1080x1920", width: 1080, height: 1920, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "png-highlight-cover-320x320", width: 320, height: 320, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "png-carousel-1080x1080", width: 1080, height: 1080, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.text.inverse", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["instagram"],
    usageContexts: ["profile-grid", "story-sticker", "reels", "carousel-post", "highlight-cover"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 14,
  },

  {
    type: "social.post.linkedin",
    category: "social",
    name: "LinkedIn Post Image",
    description: "Shared image posts for LinkedIn feed. Landscape and square formats.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-post-landscape-1200x627", width: 1200, height: 627, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "jpg-post-landscape-1200x627", width: 1200, height: 627, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
      { id: "png-post-square-1080x1080", width: 1080, height: 1080, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "webp-post-1200x627", width: 1200, height: 627, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["linkedin"],
    usageContexts: ["feed-post", "article-featured-image", "poll-graphic"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 15,
  },

  {
    type: "social.post.twitter-x",
    category: "social",
    name: "X (Twitter) Post Image",
    description: "In-feed images for X/Twitter posts. Must work at 16:9 and square.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-post-16x9-1200x675", width: 1200, height: 675, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "png-post-square-1080x1080", width: 1080, height: 1080, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "webp-post-1200x675", width: 1200, height: 675, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
      { id: "gif-animated-1200x675", width: 1200, height: 675, colorSpace: "sRGB", fileType: "gif-animated", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["twitter-x"],
    usageContexts: ["feed-post", "quote-tweet-graphic", "thread-header"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 16,
  },

  {
    type: "social.post.instagram",
    category: "social",
    name: "Instagram Post & Reel",
    description: "Feed posts, carousel images, and Reels for Instagram.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-feed-square-1080x1080", width: 1080, height: 1080, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "png-feed-portrait-1080x1350", width: 1080, height: 1350, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "png-feed-landscape-1080x566", width: 1080, height: 566, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "jpg-feed-1080x1080", width: 1080, height: 1080, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
      { id: "png-carousel-1080x1080", width: 1080, height: 1080, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "mp4-reel-1080x1920", width: 1080, height: 1920, colorSpace: "sRGB", fileType: "mp4", alpha: false },
      { id: "webp-animated-reel-1080x1920", width: 1080, height: 1920, colorSpace: "sRGB", fileType: "webp-animated", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.text.inverse", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["instagram"],
    usageContexts: ["feed-post", "carousel-post", "reels", "igtv"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 17,
  },

  {
    type: "social.post.tiktok",
    category: "social",
    name: "TikTok Post & Thumbnail",
    description: "Video thumbnails and cover images for TikTok content.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-video-cover-1080x1920", width: 1080, height: 1920, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "jpg-video-cover-1080x1920", width: 1080, height: 1920, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
      { id: "mp4-video-1080x1920", width: 1080, height: 1920, colorSpace: "sRGB", fileType: "mp4", alpha: false },
      { id: "webp-cover-1080x1920", width: 1080, height: 1920, colorSpace: "sRGB", fileType: "webp", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.text.inverse"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["tiktok"],
    usageContexts: ["video-cover", "profile-video", "duet-cover"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 18,
  },

  {
    type: "social.post.pinterest",
    category: "social",
    name: "Pinterest Pin",
    description: "Pins for Pinterest. Long-form vertical pins drive the most engagement.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-pin-standard-1000x1500", width: 1000, height: 1500, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "png-pin-long-1000x2100", width: 1000, height: 2100, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "jpg-pin-1000x1500", width: 1000, height: 1500, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
      { id: "png-pin-square-1200x1200", width: 1200, height: 1200, colorSpace: "sRGB", fileType: "png", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["pinterest"],
    usageContexts: ["product-pin", "article-pin", "idea-pin", "shop-the-look"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 19,
  },

  {
    type: "social.post.threads",
    category: "social",
    name: "Threads Post Image",
    description: "Image posts for Meta's Threads platform.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-post-1080x1350", width: 1080, height: 1350, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "png-post-square-1080x1080", width: 1080, height: 1080, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "jpg-post-1080x1350", width: 1080, height: 1350, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["threads"],
    usageContexts: ["feed-post"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 20,
  },

  // ══════════════════════════════════════════════════════════════
  // ADVERTISING — DISPLAY ADS (IAB Standard Sizes)
  // ══════════════════════════════════════════════════════════════

  {
    type: "advertising.display.leaderboard",
    category: "advertising",
    name: "Display Ad — Leaderboard",
    description: "IAB standard leaderboard. 728×90. Top of page web banner.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "gif-animated-728x90", width: 728, height: 90, colorSpace: "sRGB", fileType: "gif-animated", alpha: false },
      { id: "html5-728x90", width: 728, height: 90, colorSpace: "sRGB", fileType: "zip", alpha: false },
      { id: "png-728x90", width: 728, height: 90, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "webp-728x90", width: 728, height: 90, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
      { id: "jpg-728x90", width: 728, height: 90, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
    ],
    tokenRefs: ["color.brand.primary", "typography.cta", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["programmatic-display", "direct-web", "google-display-network"],
    usageContexts: ["web-banner-top", "email-banner"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 30,
  },

  {
    type: "advertising.display.medium-rectangle",
    category: "advertising",
    name: "Display Ad — Medium Rectangle",
    description: "IAB medium rectangle. 300×250. In-content placement. Highest CTR.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "gif-animated-300x250", width: 300, height: 250, colorSpace: "sRGB", fileType: "gif-animated", alpha: false },
      { id: "html5-300x250", width: 300, height: 250, colorSpace: "sRGB", fileType: "zip", alpha: false },
      { id: "png-300x250", width: 300, height: 250, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "webp-300x250", width: 300, height: 250, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
      { id: "jpg-300x250", width: 300, height: 250, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
    ],
    tokenRefs: ["color.brand.primary", "typography.cta", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["programmatic-display", "direct-web", "google-display-network"],
    usageContexts: ["sidebar-ad", "in-content-ad", "newsletter-ad"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 31,
  },

  {
    type: "advertising.display.billboard",
    category: "advertising",
    name: "Display Ad — Billboard",
    description: "IAB billboard. 970×250. Wide leaderboard for high-impact placements.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "gif-animated-970x250", width: 970, height: 250, colorSpace: "sRGB", fileType: "gif-animated", alpha: false },
      { id: "png-970x250", width: 970, height: 250, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "webp-970x250", width: 970, height: 250, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
      { id: "jpg-970x250", width: 970, height: 250, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["programmatic-display", "direct-web"],
    usageContexts: ["wide-banner", "homepage-takeover-break"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 32,
  },

  {
    type: "advertising.display.wide-skyscraper",
    category: "advertising",
    name: "Display Ad — Wide Skyscraper",
    description: "IAB wide skyscraper. 160x600. Tall sidebar placement.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-160x600", width: 160, height: 600, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "svg-160x600", width: 160, height: 600, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "jpg-160x600", width: 160, height: 600, colorSpace: "sRGB", fileType: "jpg", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "typography.cta"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["programmatic-display", "direct-web"],
    usageContexts: ["sidebar-ad", "narrow-column"],
    thematic: true,
    sortOrder: 33,
    animated: false,
    localized: false,
  },

  {
    type: "social.story.instagram",
    category: "social",
    name: "Instagram / Snapchat / TikTok Story",
    description: "Full-screen vertical story format. 1080x1920. Mobile-first immersive.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "jpg-story-1080x1920", width: 1080, height: 1920, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
      { id: "png-story-1080x1920", width: 1080, height: 1920, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "jpg-story-square-1080x1080", width: 1080, height: 1080, colorSpace: "sRGB", fileType: "jpg", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.text.inverse"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["instagram", "snapchat", "tiktok"],
    usageContexts: ["story-ad", "announcement", "promotion"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 20,
  },

  {
    type: "social.post.linkedin-carousel",
    category: "social",
    name: "LinkedIn Carousel Post",
    description: "Multi-slide LinkedIn carousel. 1080x1350 per slide.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "jpg-carousel-1080x1350", width: 1080, height: 1350, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
      { id: "png-carousel-1080x1350", width: 1080, height: 1350, colorSpace: "sRGB", fileType: "png", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.text.default"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["linkedin"],
    usageContexts: ["carousel-ad", "case-study", "educational-content"],
    thematic: true,
    sortOrder: 21,
    animated: false,
    localized: true,
  },

  {
    type: "social.pin.pinterest",
    category: "social",
    name: "Pinterest Pin",
    description: "Pinterest pin/idea pin. Tall format optimized for discovery.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "jpg-pin-1000x1500", width: 1000, height: 1500, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
      { id: "jpg-pin-landscape-1000x800", width: 1000, height: 800, colorSpace: "sRGB", fileType: "jpg", alpha: false },
      { id: "png-pin-1000x1500", width: 1000, height: 1500, colorSpace: "sRGB", fileType: "png", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.background.pinterest"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["pinterest"],
    usageContexts: ["idea-pin", "product-pin", "article-pin"],
    thematic: true,
    sortOrder: 22,
    animated: false,
    localized: true,
  },

  {
    type: "social-banner",
    category: "social",
    name: "Social Platform Generic Banner",
    description: "Generic social media banner template for cross-platform use.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "jpg-banner-1200x628", width: 1200, height: 628, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
      { id: "jpg-banner-1200x630", width: 1200, height: 630, colorSpace: "sRGB", fileType: "jpg", alpha: false },
      { id: "png-banner-1200x628", width: 1200, height: 628, colorSpace: "sRGB", fileType: "png", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["twitter-x", "linkedin", "facebook"],
    usageContexts: ["profile-banner", "page-banner"],
    thematic: true,
    sortOrder: 10,
    animated: false,
    localized: false,
  },

  {
    type: "icon.app",
    category: "icon",
    name: "Mobile App Icon",
    description: "iOS/Android/macOS app icon. Multiple sizes from 16px to 1024px.",
    generation: "HYBRID",
    formatProfiles: [
      { id: "png-1024", width: 1024, height: 1024, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-512", width: 512, height: 512, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-256", width: 256, height: 256, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-180", width: 180, height: 180, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-128", width: 128, height: 128, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-64", width: 64, height: 64, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-48", width: 48, height: 48, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-32", width: 32, height: 32, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-16", width: 16, height: 16, colorSpace: "sRGB", fileType: "png", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "logo.mark"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["ios-app-store", "android-google-play", "macos-app-store", "windows"],
    usageContexts: ["app-icon", "shortcut-icon"],
    thematic: true,
    sortOrder: 50,
    animated: false,
    localized: false,
  },

  {
    type: "product.empty-state",
    category: "product-ui",
    name: "Empty State Illustration",
    description: "Illustrated empty state for dashboards, lists, and onboarding flows.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "jpg-empty-state-400x300", width: 400, height: 300, colorSpace: "sRGB", fileType: "jpg", alpha: false },
      { id: "png-empty-state-400x300", width: 400, height: 300, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "svg-empty-state-responsive", width: 400, height: 300, colorSpace: "sRGB", fileType: "svg", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "color.text.muted", "color.background.muted"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["web", "mobile-app"],
    usageContexts: ["empty-dashboard", "no-results", "onboarding-step"],
    thematic: true,
    sortOrder: 60,
    animated: false,
    localized: true,
  },

  {
    type: "email.hero",
    category: "email",
    name: "Email Hero Image",
    description: "Large hero image for email newsletters and promotions.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-hero-600x300", width: 600, height: 300, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "jpg-hero-600x300", width: 600, height: 300, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
      { id: "png-hero-1200x600", width: 1200, height: 600, colorSpace: "sRGB", fileType: "png", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.text.inverse"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["email-marketing", "email-newsletter"],
    usageContexts: ["newsletter-hero", "promotional-email"],
    thematic: true,
    sortOrder: 41,
    animated: false,
    localized: true,
  },

  {
    type: "print.report-cover",
    category: "print",
    name: "Report / Whitepaper Cover",
    description: "A4/Letter report or whitepaper cover page.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "pdf-cover-a4", width: 210, height: 297, colorSpace: "sRGB", fileType: "pdf", alpha: false },
      { id: "jpg-cover-a4-300dpi", width: 2480, height: 3508, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 95 },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.background.print"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["print", "web-download", "email-attachment"],
    usageContexts: ["annual-report", "whitepaper", "case-study"],
    thematic: true,
    sortOrder: 71,
    animated: false,
    localized: false,
  },

  {
    type: "video.intro-frame",
    category: "video",
    name: "Video Intro / Splash Frame",
    description: "Logo intro frame for video content, apps, and presentations.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-intro-1920x1080", width: 1920, height: 1080, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-intro-4k", width: 3840, height: 2160, colorSpace: "sRGB", fileType: "png", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.secondary", "logo.combination"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["youtube", "vimeo", "broadcast", "presentation"],
    usageContexts: ["video-intro", "app-splash", "presentation-intro"],
    thematic: true,
    sortOrder: 80,
    animated: false,
    localized: false,
  },
  {
    type: "advertising.display.large-mobile",
    category: "advertising",
    name: "Display Ad — Large Mobile Banner",
    description: "IAB large mobile banner. 320×100. Mobile-optimized ad format.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-320x100", width: 320, height: 100, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2, 3] },
      { id: "webp-320x100", width: 320, height: 100, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
      { id: "jpg-320x100", width: 320, height: 100, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
      { id: "gif-animated-320x100", width: 320, height: 100, colorSpace: "sRGB", fileType: "gif-animated", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "typography.cta", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["programmatic-display", "mobile-web", "in-app-ad"],
    usageContexts: ["mobile-banner-top", "mobile-in-content"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 33,
  },

  {
    type: "advertising.display.half-page",
    category: "advertising",
    name: "Display Ad — Half Page",
    description: "IAB half page. 300×600. High-impact sidebar placement.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-300x600", width: 300, height: 600, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "webp-300x600", width: 300, height: 600, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
      { id: "jpg-300x600", width: 300, height: 600, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
      { id: "gif-animated-300x600", width: 300, height: 600, colorSpace: "sRGB", fileType: "gif-animated", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["programmatic-display", "direct-web"],
    usageContexts: ["sidebar-half-page", "article-sidebar"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 34,
  },

  {
    type: "advertising.display.portrait",
    category: "advertising",
    name: "Display Ad — Portrait",
    description: "IAB portrait. 300×1050. Mobile-optimized tall format.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-300x1050", width: 300, height: 1050, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "webp-300x1050", width: 300, height: 1050, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
      { id: "jpg-300x1050", width: 300, height: 1050, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["mobile-web", "in-app-ad"],
    usageContexts: ["mobile-portrait-banner"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 35,
  },

  {
    type: "advertising.search.dynamic-ads",
    category: "advertising",
    name: "Google & Bing Search Dynamic Ads",
    description: "Responsive search ads for Google Ads and Microsoft Advertising.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-logo-1200x628", width: 1200, height: 628, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "png-square-1200x1200", width: 1200, height: 1200, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "jpg-landscape-1200x628", width: 1200, height: 628, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.secondary", "typography.cta"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["google-ads", "microsoft-ads", "amazon-ads"],
    usageContexts: ["responsive-search-ad", "dynamic-search-ad", "shopping-ad"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 36,
  },

  // ══════════════════════════════════════════════════════════════
  // EMAIL MARKETING
  // ══════════════════════════════════════════════════════════════

  {
    type: "email.header",
    category: "email",
    name: "Email Header / Hero",
    description: "Top-of-email banner/header image. Must render across all major email clients.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-header-600x200", width: 600, height: 200, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "jpg-header-600x200", width: 600, height: 200, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
      { id: "gif-animated-header-600x200", width: 600, height: 200, colorSpace: "sRGB", fileType: "gif-animated", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.secondary", "typography.heading", "color.background.email"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["email-marketing", "transactional-email", "email-newsletter"],
    usageContexts: ["email-header", "email-hero", "newsletter-banner"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 40,
  },

  {
    type: "email.banner",
    category: "email",
    name: "Email Banner / Feature Image",
    description: "In-email promotional banners and feature section images.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-banner-600x300", width: 600, height: 300, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "jpg-banner-600x300", width: 600, height: 300, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
      { id: "png-banner-wide-600x400", width: 600, height: 400, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "gif-animated-600x300", width: 600, height: 300, colorSpace: "sRGB", fileType: "gif-animated", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.text.inverse", "color.background.email"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["email-marketing", "email-newsletter"],
    usageContexts: ["promotional-banner", "feature-section", "product-highlight"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 41,
  },

  {
    type: "email.footer",
    category: "email",
    name: "Email Footer",
    description: "Email footer with logo, social icons, and legal text.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-footer-600x150", width: 600, height: 150, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "html-email-footer", width: 600, height: 150, colorSpace: "sRGB", fileType: "png", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "color.text.muted", "color.background.email"],
    defaultStatus: "published",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["email-marketing", "transactional-email"],
    usageContexts: ["email-footer"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 42,
  },

  {
    type: "email.button",
    category: "email",
    name: "Email CTA Button",
    description: "Call-to-action button rendered as image for email client compatibility.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-button-small-200x50", width: 200, height: 50, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-button-medium-300x60", width: 300, height: 60, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-button-large-400x80", width: 400, height: 80, colorSpace: "sRGB", fileType: "png", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.secondary", "typography.cta", "radius.button", "shadow.button"],
    defaultStatus: "published",
    wcagLevel: "AAA",
    minContrastRatio: 4.5,
    channels: ["email-marketing", "transactional-email"],
    usageContexts: ["cta-button", "reply-button", "social-follow-button"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 43,
  },

  {
    type: "email.social-icons",
    category: "email",
    name: "Email Social Icons Set",
    description: "Social media icon set for email footers. Pre-rendered for email client compatibility.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-social-32", width: 32, height: 32, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "png-social-48", width: 48, height: 48, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "svg-social-32", width: 32, height: 32, colorSpace: "sRGB", fileType: "svg", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "color.text.muted"],
    defaultStatus: "published",
    wcagLevel: "AA",
    minContrastRatio: 3,
    channels: ["email-marketing", "email-newsletter", "transactional-email"],
    usageContexts: ["social-follow-bar", "share-buttons"],
    thematic: true,
    animated: false,
    localized: false,
    sortOrder: 44,
  },

  // ══════════════════════════════════════════════════════════════
  // PRODUCT UI — WEB APP
  // ══════════════════════════════════════════════════════════════

  {
    type: "product.og-image",
    category: "product-ui",
    name: "Open Graph Image",
    description: "Link preview image for Facebook, LinkedIn, Discord, Slack. Most important social sharing asset.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-og-1200x630", width: 1200, height: 630, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1] },
      { id: "jpg-og-1200x630", width: 1200, height: 630, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
      { id: "webp-og-1200x630", width: 1200, height: 630, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 90 },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.background.site", "color.text.default"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["web-meta", "facebook", "linkedin", "discord", "slack", "twitter-x"],
    usageContexts: ["link-preview", "social-sharing", "embed-preview"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 50,
  },

  {
    type: "product.twitter-card",
    category: "product-ui",
    name: "X/Twitter Card Image",
    description: "Twitter card image. Required for Twitter Cards to display rich previews.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-twitter-summary-1200x628", width: 1200, height: 628, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "png-twitter-summary-large-1200x628", width: 1200, height: 628, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "jpg-twitter-summary-1200x628", width: 1200, height: 628, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["twitter-x"],
    usageContexts: ["twitter-card", "link-preview"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 51,
  },

  {
    type: "product.app-store-screenshot.ios",
    category: "product-ui",
    name: "iOS App Store Screenshots",
    description: "iPhone and iPad screenshots for App Store listing. Multiple device sizes required.",
    generation: "HYBRID",
    formatProfiles: [
      { id: "png-iphone-6.7-1290x2796", width: 1290, height: 2796, colorSpace: "Display-P3", fileType: "png", alpha: false },
      { id: "png-iphone-6.5-1284x2778", width: 1284, height: 2778, colorSpace: "Display-P3", fileType: "png", alpha: false },
      { id: "png-iphone-5.5-1242x2208", width: 1242, height: 2208, colorSpace: "Display-P3", fileType: "png", alpha: false },
      { id: "png-ipad-pro-12.9-2048x2732", width: 2048, height: 2732, colorSpace: "Display-P3", fileType: "png", alpha: false },
      { id: "png-ipad-mini-6-1488x2266", width: 1488, height: 2266, colorSpace: "Display-P3", fileType: "png", alpha: false },
      { id: "png-iphone-se-750x1334", width: 750, height: 1334, colorSpace: "Display-P3", fileType: "png", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "color.background.site", "typography.heading", "radius.app-screenshot"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["ios-app-store"],
    usageContexts: ["app-store-listing", "search-result-preview"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 52,
  },

  {
    type: "product.app-store-screenshot.android",
    category: "product-ui",
    name: "Google Play Store Screenshots",
    description: "Phone and tablet screenshots for Google Play Store listing.",
    generation: "HYBRID",
    formatProfiles: [
      { id: "png-phone-16x9-1080x1920", width: 1080, height: 1920, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "png-phone-18x9-1080x2160", width: 1080, height: 2160, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "png-phone-19.5x9-1080x2340", width: 1080, height: 2340, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "png-tablet-1200x1920", width: 1200, height: 1920, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "jpg-phone-1080x1920", width: 1080, height: 1920, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
    ],
    tokenRefs: ["color.brand.primary", "color.background.site", "typography.heading"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["android-google-play"],
    usageContexts: ["play-store-listing", "feature-graphic"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 53,
  },

  {
    type: "product.feature-graphic",
    category: "product-ui",
    name: "App Store Feature Graphic",
    description: "Hero graphic shown in app store featured sections. No text allowed on iOS.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-ios-feature-1024x500", width: 1024, height: 500, colorSpace: "Display-P3", fileType: "png", alpha: false },
      { id: "png-android-feature-1024x500", width: 1024, height: 500, colorSpace: "sRGB", fileType: "png", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.secondary"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    channels: ["ios-app-store", "android-google-play"],
    usageContexts: ["app-store-featured", "search-ads-thumbnail"],
    thematic: true,
    animated: false,
    localized: false,
    sortOrder: 54,
  },

  {
    type: "product.placeholder",
    category: "product-ui",
    name: "Placeholder / Loading Image",
    description: "Skeleton/shimmer placeholder images shown while content loads.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-placeholder-1x1", width: 1, height: 1, colorSpace: "sRGB", fileType: "png", alpha: false },
      { id: "svg-placeholder-responsive", width: 800, height: 600, colorSpace: "sRGB", fileType: "svg", alpha: true },
    ],
    tokenRefs: ["color.background.muted", "opacity.skeleton"],
    defaultStatus: "published",
    wcagLevel: "AA",
    channels: ["web", "mobile-app", "email"],
    usageContexts: ["skeleton-loader", "image-placeholder", "lazy-load-placeholder"],
    thematic: true,
    animated: true,
    localized: false,
    sortOrder: 55,
  },

  {
    type: "product.error-state",
    category: "product-ui",
    name: "Error State Illustration",
    description: "Illustrated error messages for 404, 500, network failure, and empty states.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-error-404-400x300", width: 400, height: 300, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "png-error-500-400x300", width: 400, height: 300, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "png-empty-state-400x300", width: 400, height: 300, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "svg-error-state-responsive", width: 400, height: 300, colorSpace: "sRGB", fileType: "svg", alpha: true },
    ],
    tokenRefs: ["color.text.muted", "color.background.site", "color.semantic.error"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    channels: ["web", "mobile-app", "email"],
    usageContexts: ["404-page", "500-page", "network-error", "empty-search-results", "empty-dashboard"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 56,
  },

  // ══════════════════════════════════════════════════════════════
  // ICON LIBRARY
  // ══════════════════════════════════════════════════════════════

  {
    type: "icon.ui",
    category: "icon",
    name: "UI Icon Library",
    description: "Complete UI icon set for interfaces. All sizes from 16px to 48px. Consistent stroke/fill.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "svg-ui-16", width: 16, height: 16, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "svg-ui-20", width: 20, height: 20, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "svg-ui-24", width: 24, height: 24, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "svg-ui-32", width: 32, height: 32, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "svg-ui-48", width: 48, height: 48, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "png-ui-16", width: 16, height: 16, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "png-ui-24", width: 24, height: 24, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "png-ui-32", width: 32, height: 32, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "png-ui-48", width: 48, height: 48, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "png-ui-64", width: 64, height: 64, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "png-ui-128", width: 128, height: 128, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "webp-ui-24", width: 24, height: 24, colorSpace: "sRGB", fileType: "webp", alpha: true },
      { id: "zip-iconset-svg", width: 24, height: 24, colorSpace: "sRGB", fileType: "zip", alpha: true },
    ],
    tokenRefs: ["color.icon.default", "color.icon.muted", "icon.ui.stroke-width"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    minContrastRatio: 3,
    channels: ["web", "mobile-app", "desktop-app", "email"],
    usageContexts: ["navigation", "toolbar", "button-icon", "form-icon", "status-indicator", "feature-icon"],
    thematic: true,
    animated: false,
    localized: false,
    sortOrder: 60,
  },

  {
    type: "icon.featured",
    category: "icon",
    name: "Featured / Onboarding Icons",
    description: "Large illustration-style icons for feature highlights, onboarding, and marketing pages.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "svg-feature-64", width: 64, height: 64, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "svg-feature-96", width: 96, height: 96, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "svg-feature-128", width: 128, height: 128, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "png-feature-256", width: 256, height: 256, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "png-feature-512", width: 512, height: 512, colorSpace: "sRGB", fileType: "png", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.accent", "color.icon.featured"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    channels: ["web", "mobile-app", "presentation"],
    usageContexts: ["feature-highlight", "onboarding-step", "pricing-feature", "landing-page-icon"],
    thematic: true,
    animated: false,
    localized: false,
    sortOrder: 61,
  },

  {
    type: "icon.social",
    category: "icon",
    name: "Social Platform Icons",
    description: "Official social media platform icons. Must use official brand marks.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "svg-social-24", width: 24, height: 24, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "svg-social-32", width: 32, height: 32, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "png-social-24", width: 24, height: 24, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "png-social-48", width: 48, height: 48, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
    ],
    defaultStatus: "published",
    wcagLevel: "AA",
    channels: ["web", "email", "mobile-app"],
    usageContexts: ["social-share-bar", "footer-social-links", "contact-page"],
    thematic: false,
    animated: false,
    localized: false,
    sortOrder: 62,
  },

  {
    type: "icon.payment",
    category: "icon",
    name: "Payment Method Icons",
    description: "Credit card, bank, and payment method icons for checkout flows.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "svg-payment-32", width: 32, height: 20, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "svg-payment-48", width: 48, height: 30, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "png-payment-64", width: 64, height: 40, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
    ],
    defaultStatus: "published",
    wcagLevel: "AA",
    channels: ["web", "mobile-app"],
    usageContexts: ["checkout-payment-form", "invoice-payment-methods"],
    thematic: false,
    animated: false,
    localized: false,
    sortOrder: 63,
  },

  // ══════════════════════════════════════════════════════════════
  // ILLUSTRATION
  // ══════════════════════════════════════════════════════════════

  {
    type: "illustration.spot",
    category: "illustration",
    name: "Spot Illustrations",
    description: "Small to medium illustrations for blogs, empty states, and marketing sections.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "svg-spot-200x200", width: 200, height: 200, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "svg-spot-400x300", width: 400, height: 300, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "png-spot-400x300", width: 400, height: 300, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "png-spot-800x600", width: 800, height: 600, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.secondary", "color.illustration.background"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    channels: ["web", "mobile-app", "presentation", "print"],
    usageContexts: ["blog-illustration", "empty-state", "section-divider", "testimonial-photo"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 70,
  },

  {
    type: "illustration.hero",
    category: "illustration",
    name: "Hero Illustrations",
    description: "Large full-width illustrations for homepage, landing pages, and feature announcements.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "svg-hero-1200x600", width: 1200, height: 600, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "svg-hero-1920x1080", width: 1920, height: 1080, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "png-hero-1200x600", width: 1200, height: 600, colorSpace: "sRGB", fileType: "png", alpha: true, scaleFactors: [1, 2] },
      { id: "jpg-hero-1920x1080", width: 1920, height: 1080, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.secondary", "color.background.site", "typography.heading"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    channels: ["web", "presentation"],
    usageContexts: ["homepage-hero", "landing-page-section", "product-announcement"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 71,
  },

  // ══════════════════════════════════════════════════════════════
  // VIDEO & MOTION
  // ══════════════════════════════════════════════════════════════

  {
    type: "video.thumbnail.youtube",
    category: "video",
    name: "YouTube Video Thumbnail",
    description: "Custom thumbnail for YouTube videos. Most important factor in click-through rate.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-thumb-1280x720", width: 1280, height: 720, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "jpg-thumb-1280x720", width: 1280, height: 720, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
      { id: "webp-thumb-1280x720", width: 1280, height: 720, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.text.inverse", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["youtube"],
    usageContexts: ["video-thumbnail", "shorts-thumbnail"],
    thematic: true,
    animated: false,
    localized: false,
    sortOrder: 80,
  },

  {
    type: "video.thumbnail.podcast",
    category: "video",
    name: "Podcast Cover Art",
    description: "Podcast episode cover art for Apple Podcasts, Spotify, and YouTube.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-podcast-3000x3000", width: 3000, height: 3000, colorSpace: "Display-P3", fileType: "png", alpha: false },
      { id: "jpg-podcast-3000x3000", width: 3000, height: 3000, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 95 },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.text.inverse"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 3,
    channels: ["apple-podcasts", "spotify", "youtube", "google-podcasts"],
    usageContexts: ["podcast-episode-cover", "podcast-series-cover"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 81,
  },

  {
    type: "video.lower-third",
    category: "video",
    name: "Lower Third / Title Card",
    description: "Name/title overlay for video content. Shown during interviews, presentations.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-lower-third-1920x1080", width: 1920, height: 1080, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "svg-lower-third-template", width: 1920, height: 1080, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "webm-lower-third-animated", width: 1920, height: 1080, colorSpace: "sRGB", fileType: "webm", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "typography.video.title", "color.text.inverse", "shadow.lower-third"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["youtube", "linkedin-video", "vimeo", "webinar", "broadcast"],
    usageContexts: ["lower-third-overlay", "speaker-intro", "chapter-title"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 82,
  },

  {
    type: "motion.lottie.empty-state",
    category: "motion",
    name: "Lottie — Empty State",
    description: "Animated empty state for dashboards, inboxes, and search results.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "lottie-json-empty-200", width: 200, height: 200, colorSpace: "sRGB", fileType: "lottie", alpha: true },
      { id: "lottie-json-empty-300", width: 300, height: 300, colorSpace: "sRGB", fileType: "lottie", alpha: true },
      { id: "lottie-json-empty-400", width: 400, height: 400, colorSpace: "sRGB", fileType: "lottie", alpha: true },
      { id: "gif-empty-300x300", width: 300, height: 300, colorSpace: "sRGB", fileType: "gif-animated", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "color.text.muted", "color.background.site"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    channels: ["web", "mobile-app"],
    usageContexts: ["empty-dashboard", "empty-inbox", "no-search-results", "empty-cart"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 90,
  },

  {
    type: "motion.lottie.success",
    category: "motion",
    name: "Lottie — Success / Confirmation",
    description: "Animated success checkmark, confetti, or celebration for completed actions.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "lottie-json-success-100", width: 100, height: 100, colorSpace: "sRGB", fileType: "lottie", alpha: true },
      { id: "lottie-json-success-200", width: 200, height: 200, colorSpace: "sRGB", fileType: "lottie", alpha: true },
      { id: "lottie-json-success-300", width: 300, height: 300, colorSpace: "sRGB", fileType: "lottie", alpha: true },
      { id: "gif-success-200x200", width: 200, height: 200, colorSpace: "sRGB", fileType: "gif-animated", alpha: true },
    ],
    tokenRefs: ["color.semantic.success", "color.background.site"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    channels: ["web", "mobile-app", "email"],
    usageContexts: ["form-submitted", "payment-success", "signup-complete", "onboarding-complete"],
    thematic: true,
    animated: true,
    localized: true,
    sortOrder: 91,
  },

  {
    type: "motion.lottie.loading",
    category: "motion",
    name: "Lottie — Loading / Spinner",
    description: "Branded loading animation. Replaces generic browser spinners.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "lottie-json-spinner-24", width: 24, height: 24, colorSpace: "sRGB", fileType: "lottie", alpha: true },
      { id: "lottie-json-spinner-48", width: 48, height: 48, colorSpace: "sRGB", fileType: "lottie", alpha: true },
      { id: "lottie-json-spinner-64", width: 64, height: 64, colorSpace: "sRGB", fileType: "lottie", alpha: true },
      { id: "gif-spinner-48x48", width: 48, height: 48, colorSpace: "sRGB", fileType: "gif-animated", alpha: true },
      { id: "webp-animated-spinner-48", width: 48, height: 48, colorSpace: "sRGB", fileType: "webp-animated", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "color.spinner.track", "color.spinner.fill"],
    defaultStatus: "published",
    wcagLevel: "AA",
    channels: ["web", "mobile-app", "email"],
    usageContexts: ["button-loading", "page-loading", "inline-spinner"],
    thematic: true,
    animated: true,
    localized: false,
    sortOrder: 92,
  },

  {
    type: "motion.animated-logo",
    category: "motion",
    name: "Animated Logo",
    description: "Logo reveal animation for video intros, loading screens, and splash screens.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "mp4-logo-intro-1920x1080", width: 1920, height: 1080, colorSpace: "sRGB", fileType: "mp4", alpha: false },
      { id: "webm-logo-intro-1920x1080", width: 1920, height: 1080, colorSpace: "sRGB", fileType: "webm", alpha: true },
      { id: "gif-logo-800x600", width: 800, height: 600, colorSpace: "sRGB", fileType: "gif-animated", alpha: false },
      { id: "lottie-logo-800x600", width: 800, height: 600, colorSpace: "sRGB", fileType: "lottie", alpha: true },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.secondary", "font.family.brand"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    channels: ["youtube", "web", "mobile-app", "broadcast", "presentation"],
    usageContexts: ["video-intro", "app-splash", "presentation-intro", "loading-logo"],
    thematic: true,
    animated: true,
    localized: false,
    sortOrder: 93,
  },

  // ══════════════════════════════════════════════════════════════
  // DATA VISUALIZATION
  // ══════════════════════════════════════════════════════════════

  {
    type: "dataviz.chart-bar",
    category: "data-visualization",
    name: "Bar Chart",
    description: "Branded bar chart image for reports, dashboards, and presentations.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-chart-800x500", width: 800, height: 500, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "svg-chart-800x500", width: 800, height: 500, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "jpg-chart-800x500", width: 800, height: 500, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.secondary", "color.chart.gridline", "typography.data"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 3,
    channels: ["web", "presentation", "print", "email"],
    usageContexts: ["report-chart", "dashboard-widget", "slide-chart", "social-data-post"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 100,
  },

  {
    type: "dataviz.qr-code",
    category: "data-visualization",
    name: "QR Code",
    description: "QR codes for payment links, authentication, WiFi sharing, and product info.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-qr-200x200", width: 200, height: 200, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2, 3, 4] },
      { id: "svg-qr-responsive", width: 200, height: 200, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "png-qr-print-600x600", width: 600, height: 600, colorSpace: "sRGB", fileType: "png", alpha: false, dpi: 300 },
      { id: "eps-qr-print", width: 30, height: 30, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "eps", alpha: false },
    ],
    tokenRefs: ["color.qr.foreground", "color.qr.background", "radius.qr"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    channels: ["web", "print", "packaging", "mobile-app"],
    usageContexts: ["payment-qr", "auth-qr", "wifi-qr", "product-info-qr", "menu-qr"],
    thematic: true,
    animated: false,
    localized: false,
    sortOrder: 101,
  },

  {
    type: "dataviz.barcode",
    category: "data-visualization",
    name: "Barcode",
    description: "EAN/UPC barcodes for product packaging and inventory.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-barcode-300x100", width: 300, height: 100, colorSpace: "sRGB", fileType: "png", alpha: false, dpi: 300 },
      { id: "svg-barcode-responsive", width: 300, height: 100, colorSpace: "sRGB", fileType: "svg", alpha: true },
      { id: "eps-barcode-print", width: 50, height: 15, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "eps", alpha: false },
    ],
    tokenRefs: ["color.barcode.foreground", "color.barcode.background"],
    defaultStatus: "published",
    wcagLevel: "A",
    channels: ["print", "packaging", "ecommerce"],
    usageContexts: ["product-barcode", "shipping-label", "inventory-tag"],
    thematic: false,
    animated: false,
    localized: false,
    sortOrder: 102,
  },

  // ══════════════════════════════════════════════════════════════
  // E-COMMERCE
  // ══════════════════════════════════════════════════════════════

  {
    type: "ecommerce.product-photography",
    category: "ecommerce",
    name: "Product Photography",
    description: "Studio and lifestyle product photography for e-commerce listings.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "jpg-product-white-bg-2000x2000", width: 2000, height: 2000, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 95 },
      { id: "jpg-product-lifestyle-1920x1080", width: 1920, height: 1080, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
      { id: "png-product-cutout-2000x2000", width: 2000, height: 2000, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "webp-product-1000x1000", width: 1000, height: 1000, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
    ],
    defaultStatus: "approved",
    wcagLevel: "AA",
    channels: ["ecommerce", "marketplace", "social-commerce"],
    usageContexts: ["product-thumbnail", "product-detail", "lifestyle-shot", "comparison-table"],
    thematic: false,
    animated: false,
    localized: true,
    sortOrder: 110,
  },

  {
    type: "ecommerce.category-banner",
    category: "ecommerce",
    name: "Category Banner",
    description: "Wide banner images for e-commerce category and collection pages.",
    generation: "AI_IMAGE",
    formatProfiles: [
      { id: "png-cat-banner-1920x600", width: 1920, height: 600, colorSpace: "sRGB", fileType: "png", alpha: false, scaleFactors: [1, 2] },
      { id: "jpg-cat-banner-1920x600", width: 1920, height: 600, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 85 },
      { id: "webp-cat-banner-1920x600", width: 1920, height: 600, colorSpace: "sRGB", fileType: "webp", alpha: false, quality: 85 },
    ],
    tokenRefs: ["color.brand.primary", "typography.heading", "color.text.inverse", "color.background.site"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    minContrastRatio: 4.5,
    channels: ["ecommerce"],
    usageContexts: ["category-page-header", "collection-banner"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 111,
  },

  {
    type: "ecommerce.promotional-badge",
    category: "ecommerce",
    name: "Promotional Badge / Sticker",
    description: "Sale, new, hot, limited badge overlays for product images.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "png-badge-sale-100x100", width: 100, height: 100, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-badge-new-80x80", width: 80, height: 80, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-badge-hot-100x100", width: 100, height: 100, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "svg-badge-responsive", width: 100, height: 100, colorSpace: "sRGB", fileType: "svg", alpha: true },
    ],
    tokenRefs: ["color.semantic.error", "color.semantic.warning", "color.semantic.success", "typography.badge"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    channels: ["ecommerce"],
    usageContexts: ["product-overlay-badge", "cart-badge", "notification-badge"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 112,
  },

  // ══════════════════════════════════════════════════════════════
  // PRINT
  // ══════════════════════════════════════════════════════════════

  {
    type: "print.business-card",
    category: "print",
    name: "Business Card",
    description: "Standard business card. Both horizontal and vertical layouts.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "pdf-business-card-horizontal", width: 89, height: 51, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "pdf", alpha: false },
      { id: "pdf-business-card-vertical", width: 51, height: 89, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "pdf", alpha: false },
      { id: "pdfx4-business-card-h", width: 89, height: 51, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "pdf", alpha: false },
      { id: "jpg-proof-300dpi", width: 1054, height: 604, colorSpace: "sRGB", fileType: "jpg", alpha: false, dpi: 300, quality: 95 },
    ],
    tokenRefs: ["color.brand.primary", "font.family.brand", "typography.body", "color.print.background"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    channels: ["print"],
    usageContexts: ["networking", "client-meeting", "event-attendee"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 120,
  },

  {
    type: "print.letterhead",
    category: "print",
    name: "Letterhead",
    description: "Company letterhead for formal correspondence. A4 and US Letter.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "pdf-letterhead-a4", width: 210, height: 297, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "pdf", alpha: false },
      { id: "pdf-letterhead-usletter", width: 8.5, height: 11, units: "in", dpi: 300, colorSpace: "CMYK", fileType: "pdf", alpha: false },
      { id: "pdfx4-letterhead-a4", width: 210, height: 297, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "pdf", alpha: false },
      { id: "jpg-proof-300dpi-a4", width: 2480, height: 3508, colorSpace: "sRGB", fileType: "jpg", alpha: false, dpi: 300, quality: 95 },
    ],
    tokenRefs: ["color.brand.primary", "font.family.brand", "color.print.background"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    channels: ["print"],
    usageContexts: ["formal-letter", "invoice", "contract", "proposal"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 121,
  },

  {
    type: "print.presentation-deck",
    category: "print",
    name: "Presentation Deck",
    description: "Print-ready PDF of slide deck for leave-behinds. 16:9 aspect ratio.",
    generation: "PROGRAMMATIC",
    formatProfiles: [
      { id: "pdf-deck-16x9", width: 297, height: 167, units: "mm", dpi: 150, colorSpace: "CMYK", fileType: "pdf", alpha: false },
      { id: "pdf-deck-a4", width: 297, height: 210, units: "mm", dpi: 150, colorSpace: "CMYK", fileType: "pdf", alpha: false },
      { id: "pdf-deck-usletter", width: 11, height: 8.5, units: "in", dpi: 150, colorSpace: "CMYK", fileType: "pdf", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "typography.slide.heading", "typography.slide.body", "color.background.presentation"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    channels: ["print", "presentation"],
    usageContexts: ["sales-deck-print", "conference-leavebehind", "proposal-pdf"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 122,
  },

  {
    type: "print.packaging",
    category: "print",
    name: "Packaging / Label",
    description: "Product packaging dieline and label artwork for press.",
    generation: "MANUAL",
    formatProfiles: [
      { id: "pdfx4-packaging-dieline", width: 100, height: 150, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "pdf", alpha: false },
      { id: "ai-dieline", width: 100, height: 150, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "ai", alpha: false },
      { id: "eps-dieline", width: 100, height: 150, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "eps", alpha: false },
      { id: "pdfx4-label-round", width: 50, height: 50, units: "mm", dpi: 300, colorSpace: "CMYK", fileType: "pdf", alpha: false },
    ],
    tokenRefs: ["color.brand.primary", "color.brand.secondary", "font.family.brand", "typography.packaging"],
    defaultStatus: "approved",
    wcagLevel: "AA",
    channels: ["print", "packaging"],
    usageContexts: ["product-box", "label", "sticker", " sleeve", "bag"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 123,
  },

  {
    type: "print.merchandise-mockup",
    category: "print",
    name: "Merchandise Mockup",
    description: "Brand artwork applied to merchandise (tshirts, mugs, tote bags) for mockup presentations.",
    generation: "HYBRID",
    formatProfiles: [
      { id: "png-mockup-tshirt-2000x2000", width: 2000, height: 2000, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-mockup-mug-2000x2000", width: 2000, height: 2000, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "png-mockup-tote-2000x2000", width: 2000, height: 2000, colorSpace: "sRGB", fileType: "png", alpha: true },
      { id: "jpg-mockup-2000x2000", width: 2000, height: 2000, colorSpace: "sRGB", fileType: "jpg", alpha: false, quality: 90 },
    ],
    tokenRefs: ["color.brand.primary", "logo.combination"],
    defaultStatus: "draft",
    wcagLevel: "AA",
    channels: ["print", "merchandise"],
    usageContexts: ["merch-mockup", "brand-guide-merch", "partnership-deck"],
    thematic: true,
    animated: false,
    localized: true,
    sortOrder: 124,
  },
];

/**
 * Channel registry — defines every publishing channel and its properties
 */
export interface ChannelSpec {
  id: string;
  name: string;
  type: "social" | "advertising" | "email" | "ecommerce" | "app-store" | "print" | "web" | "video" | "other";
  assetTypes: string[];
  requiresApproval: boolean;
  publishAutomation: "webhook" | "api" | "manual" | "cdn";
}

export const CHANNEL_REGISTRY: ChannelSpec[] = [
  { id: "web", name: "Website / Web App", type: "web", assetTypes: ["logo.*", "icon.*", "product.*", "illustration.*"], requiresApproval: false, publishAutomation: "cdn" },
  { id: "facebook", name: "Facebook", type: "social", assetTypes: ["social.*"], requiresApproval: false, publishAutomation: "api" },
  { id: "twitter-x", name: "X (Twitter)", type: "social", assetTypes: ["social.*", "product.*"], requiresApproval: false, publishAutomation: "api" },
  { id: "linkedin", name: "LinkedIn", type: "social", assetTypes: ["social.*"], requiresApproval: false, publishAutomation: "api" },
  { id: "instagram", name: "Instagram", type: "social", assetTypes: ["social.*"], requiresApproval: false, publishAutomation: "api" },
  { id: "tiktok", name: "TikTok", type: "social", assetTypes: ["social.*"], requiresApproval: false, publishAutomation: "api" },
  { id: "youtube", name: "YouTube", type: "video", assetTypes: ["video.*", "social.banner.youtube"], requiresApproval: false, publishAutomation: "api" },
  { id: "pinterest", name: "Pinterest", type: "social", assetTypes: ["social.*"], requiresApproval: false, publishAutomation: "api" },
  { id: "threads", name: "Threads", type: "social", assetTypes: ["social.*"], requiresApproval: false, publishAutomation: "api" },
  { id: "email-marketing", name: "Email Marketing", type: "email", assetTypes: ["email.*"], requiresApproval: true, publishAutomation: "api" },
  { id: "programmatic-display", name: "Programmatic Display", type: "advertising", assetTypes: ["advertising.*"], requiresApproval: true, publishAutomation: "manual" },
  { id: "google-ads", name: "Google Ads", type: "advertising", assetTypes: ["advertising.*"], requiresApproval: true, publishAutomation: "api" },
  { id: "ios-app-store", name: "iOS App Store", type: "app-store", assetTypes: ["product.*", "logo.*"], requiresApproval: true, publishAutomation: "api" },
  { id: "android-google-play", name: "Google Play", type: "app-store", assetTypes: ["product.*", "logo.*"], requiresApproval: true, publishAutomation: "api" },
  { id: "print", name: "Print / Press", type: "print", assetTypes: ["print.*", "logo.*"], requiresApproval: true, publishAutomation: "manual" },
  { id: "ecommerce", name: "E-Commerce", type: "ecommerce", assetTypes: ["ecommerce.*"], requiresApproval: true, publishAutomation: "api" },
  { id: "cdn", name: "CDN / Static Asset Host", type: "web", assetTypes: ["*"], requiresApproval: false, publishAutomation: "cdn" },
];

/**
 * Look up an asset type spec by type string
 */
export function getAssetTypeSpec(type: string): AssetTypeSpec | undefined {
  return ASSET_TYPE_REGISTRY.find((s) => s.type === type);
}

/**
 * Get all asset types for a given category
 */
export function getAssetTypesByCategory(category: AssetCategory): AssetTypeSpec[] {
  return ASSET_TYPE_REGISTRY.filter((s) => s.category === category).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get all asset types for a given channel
 */
export function getAssetTypesForChannel(channel: string): AssetTypeSpec[] {
  return ASSET_TYPE_REGISTRY.filter((s) => s.channels.includes(channel));
}
