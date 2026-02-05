import { Platform } from "@/types/recipe";

export interface FetchedContent {
  description: string;
  title: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  platform: Platform;
}

/**
 * oEmbed endpoints by platform.
 * - TikTok & YouTube have free, public oEmbed APIs
 * - Instagram & Facebook use noembed.com (free proxy that handles Meta auth)
 */
const OEMBED_ENDPOINTS: Partial<Record<Platform, string>> = {
  tiktok: "https://www.tiktok.com/oembed",
  youtube: "https://www.youtube.com/oembed",
  instagram: "https://noembed.com/embed",
  facebook: "https://noembed.com/embed",
};

/**
 * Extract YouTube video ID and return the best available thumbnail.
 * Tries maxresdefault (1080p+) first with a HEAD check, falls back to hqdefault.
 */
async function extractYouTubeThumbnail(url: string): Promise<string | null> {
  try {
    const urlObj = new URL(url);
    let videoId: string | null = null;

    if (urlObj.hostname.includes("youtube.com")) {
      videoId = urlObj.searchParams.get("v");
      // Handle /shorts/ID format
      if (!videoId) {
        const shortsMatch = urlObj.pathname.match(/\/shorts\/([^/?]+)/);
        if (shortsMatch) videoId = shortsMatch[1];
      }
    } else if (urlObj.hostname.includes("youtu.be")) {
      videoId = urlObj.pathname.slice(1).split("?")[0];
    }

    if (!videoId) return null;

    // Check if maxresdefault exists (only available for HD videos)
    const maxresUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    try {
      const headRes = await fetch(maxresUrl, { method: "HEAD" });
      if (headRes.ok) return maxresUrl;
    } catch {
      // maxresdefault not available, fall through
    }

    // hqdefault always exists for valid videos
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  } catch {
    return null;
  }
}

export async function fetchContent(
  url: string,
  platform: Platform
): Promise<FetchedContent> {
  // For YouTube, try direct thumbnail extraction first (fastest, no API call)
  if (platform === "youtube") {
    const ytThumb = await extractYouTubeThumbnail(url);
    if (ytThumb) {
      // Still try to get title/description from oEmbed
      try {
        const oembedUrl = `${OEMBED_ENDPOINTS.youtube}?url=${encodeURIComponent(url)}&format=json`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
          const data = await res.json();
          return {
            description: data.title || data.author_name || "",
            title: data.title || null,
            videoUrl: url,
            imageUrl: ytThumb,
            platform,
          };
        }
      } catch {
        // oEmbed failed, still return the thumbnail
      }
      return {
        description: "",
        title: null,
        videoUrl: url,
        imageUrl: ytThumb,
        platform,
      };
    }
  }

  // Try oEmbed for all platforms (TikTok, Instagram, Facebook, YouTube fallback)
  const oembedEndpoint = OEMBED_ENDPOINTS[platform];
  if (oembedEndpoint) {
    try {
      const oembedUrl = `${oembedEndpoint}?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const data = await response.json();
        return {
          description: data.title || data.author_name || "",
          title: data.title || null,
          videoUrl: url,
          imageUrl: data.thumbnail_url || null,
          platform,
        };
      }
    } catch (error) {
      console.log(`oEmbed failed for ${platform}:`, error);
      // Fall through to HTML scraping
    }
  }

  // Final fallback: fetch the page HTML and extract metadata
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });

    const html = await response.text();

    const title = extractMeta(html, "og:title") || extractMeta(html, "title");
    const description =
      extractMeta(html, "og:description") ||
      extractMeta(html, "description") ||
      "";
    const videoUrl =
      extractMeta(html, "og:video:url") ||
      extractMeta(html, "og:video") ||
      url;

    const imageUrl =
      extractMeta(html, "og:image:secure_url") ||
      extractMeta(html, "og:image:url") ||
      extractMeta(html, "og:image") ||
      extractMeta(html, "twitter:image") ||
      extractMeta(html, "twitter:image:src") ||
      null;

    return {
      description: [title, description].filter(Boolean).join("\n\n"),
      title: title || null,
      videoUrl,
      imageUrl,
      platform,
    };
  } catch (error) {
    throw new Error(
      `לא הצלחנו לגשת לתוכן בכתובת הזו: ${error instanceof Error ? error.message : "שגיאה לא ידועה"}`
    );
  }
}

function extractMeta(html: string, property: string): string | null {
  // Match og: and standard meta tags
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escapeRegex(property)}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escapeRegex(property)}["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${escapeRegex(property)}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
