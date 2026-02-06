import { SupabaseClient } from "@supabase/supabase-js";

const BUCKET_NAME = "recipe-thumbnails";

/**
 * Maps common MIME types to file extensions.
 */
function getExtension(contentType: string | null): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  return (contentType && map[contentType.split(";")[0].trim()]) || "jpg";
}

/**
 * Check if a URL already points to our Supabase Storage bucket.
 */
export function isStorageUrl(url: string | null): boolean {
  if (!url) return false;
  return url.includes("/storage/v1/object/public/" + BUCKET_NAME);
}

/**
 * Download a remote image and upload it to Supabase Storage.
 *
 * @returns The permanent public URL, or null on failure (recipe still saves without image).
 */
export async function uploadRecipeImage(
  imageUrl: string,
  recipeId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  try {
    // Don't re-upload images already in our bucket
    if (isStorageUrl(imageUrl)) {
      return imageUrl;
    }

    // Download the remote image
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(`Image download failed (${response.status}): ${imageUrl}`);
      return null;
    }

    const contentType = response.headers.get("content-type");
    const ext = getExtension(contentType);
    const filePath = `${recipeId}.${ext}`;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage (upsert to allow re-migration)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: contentType || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase Storage upload failed:", uploadError.message);
      return null;
    }

    // Get the permanent public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(
      "Image storage error:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
