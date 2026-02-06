import { Platform } from "@/types/recipe";

export type ExtractionMethod = "video" | "text";

interface UrlClassification {
  valid: true;
  platform: Platform;
  extractionMethod: ExtractionMethod;
  url: string;
}

interface UrlClassificationError {
  valid: false;
  error: string;
}

export type ClassificationResult = UrlClassification | UrlClassificationError;

const SOCIAL_MEDIA_PATTERNS: { platform: Platform; patterns: RegExp[] }[] = [
  {
    platform: "instagram",
    patterns: [
      /^https?:\/\/(www\.)?instagram\.com\/(reels?|p)\/.+/i,
      /^https?:\/\/(www\.)?instagram\.com\/stories\/.+/i,
    ],
  },
  {
    platform: "tiktok",
    patterns: [
      /^https?:\/\/(www\.)?tiktok\.com\/@[^/]+\/video\/.+/i,
      /^https?:\/\/vm\.tiktok\.com\/.+/i,
    ],
  },
  {
    platform: "facebook",
    patterns: [
      /^https?:\/\/(www\.)?facebook\.com\/.+\/videos\/.+/i,
      /^https?:\/\/fb\.watch\/.+/i,
      /^https?:\/\/(www\.)?facebook\.com\/reel\/.+/i,
      /^https?:\/\/(www\.)?facebook\.com\/share\/(r|v)\/.+/i,
    ],
  },
  {
    platform: "youtube",
    patterns: [
      /^https?:\/\/(www\.)?youtube\.com\/shorts\/.+/i,
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=.+/i,
      /^https?:\/\/youtu\.be\/.+/i,
    ],
  },
];

export function classifyRecipeUrl(url: string): ClassificationResult {
  const trimmed = url.trim();

  try {
    new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: "הכתובת שהוזנה אינה תקינה",
    };
  }

  // Check social media patterns → video extraction
  for (const { platform, patterns } of SOCIAL_MEDIA_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return { valid: true, platform, extractionMethod: "video", url: trimmed };
      }
    }
  }

  // Any other valid URL → website text extraction
  return { valid: true, platform: "website", extractionMethod: "text", url: trimmed };
}

// Backward-compatible alias
export function validateRecipeUrl(url: string): ClassificationResult {
  return classifyRecipeUrl(url);
}
