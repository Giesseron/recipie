import { Platform } from "@/types/recipe";

interface UrlValidationResult {
  valid: true;
  platform: Platform;
  url: string;
}

interface UrlValidationError {
  valid: false;
  error: string;
}

type ValidationResult = UrlValidationResult | UrlValidationError;

const PLATFORM_PATTERNS: { platform: Platform; patterns: RegExp[] }[] = [
  {
    platform: "instagram",
    patterns: [
      /^https?:\/\/(www\.)?instagram\.com\/(reel|p)\/.+/i,
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
    patterns: [/^https?:\/\/(www\.)?youtube\.com\/shorts\/.+/i],
  },
];

export function validateRecipeUrl(url: string): ValidationResult {
  const trimmed = url.trim();

  try {
    new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: "הכתובת שהוזנה אינה תקינה",
    };
  }

  for (const { platform, patterns } of PLATFORM_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return { valid: true, platform, url: trimmed };
      }
    }
  }

  return {
    valid: false,
    error:
      "הפלטפורמה אינה נתמכת. הפלטפורמות הנתמכות: Instagram, Facebook, TikTok, YouTube Shorts",
  };
}
