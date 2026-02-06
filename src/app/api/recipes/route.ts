import { NextRequest, NextResponse } from "next/server";
import { classifyRecipeUrl } from "@/lib/url-validator";
import { fetchContent } from "@/lib/content-fetcher";
import { extractRecipe, extractRecipeFromMedia, normalizeIngredient } from "@/lib/ai-extractor";
import { extractVideoFrames } from "@/lib/vps-client";
import { createServerSupabase } from "@/lib/supabase-server";
import { uploadRecipeImage } from "@/lib/image-storage";
import { ExtractedRecipe, Platform } from "@/types/recipe";

const MAX_UPLOAD_IMAGES = 5;
const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB per image (base64)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    const body = await request.json();
    const { url, images } = body as { url?: string; images?: string[] };

    // Determine pipeline: upload (images) or URL-based (video/text)
    const isUpload = Array.isArray(images) && images.length > 0;

    if (!isUpload && (!url || typeof url !== "string")) {
      return NextResponse.json(
        { error: "נא להזין כתובת URL או להעלות תמונות" },
        { status: 400 }
      );
    }

    let extracted: ExtractedRecipe | null = null;
    let platform: Platform;
    let sourceUrl: string | null = null;
    let imageUrl: string | null = null;
    let videoUrl: string | null = null;
    let thumbnailBase64: string | null = null;

    if (isUpload) {
      // === UPLOAD PIPELINE ===
      platform = "upload";

      if (images!.length > MAX_UPLOAD_IMAGES) {
        return NextResponse.json(
          { error: `ניתן להעלות עד ${MAX_UPLOAD_IMAGES} תמונות` },
          { status: 400 }
        );
      }

      for (const img of images!) {
        if (img.length > MAX_IMAGE_SIZE) {
          return NextResponse.json(
            { error: "אחת התמונות גדולה מדי (מקסימום 4MB)" },
            { status: 400 }
          );
        }
      }

      // Extract recipe from images directly
      extracted = await withRetry(() => extractRecipeFromMedia(images!), 2);

      // Store first image as thumbnail (will be uploaded to Supabase Storage later)
      thumbnailBase64 = images![0];

    } else {
      // === URL-BASED PIPELINES ===
      const classification = classifyRecipeUrl(url!);
      if (!classification.valid) {
        return NextResponse.json(
          { error: classification.error },
          { status: 400 }
        );
      }

      platform = classification.platform;
      sourceUrl = classification.url;

      // Check for duplicate (only for URL-based recipes)
      const { data: existing } = await supabase
        .from("recipes")
        .select("id, title")
        .eq("source_url", sourceUrl)
        .single();

      if (existing) {
        return NextResponse.json(
          {
            error: "המתכון הזה כבר נשמר",
            existingId: existing.id,
            existingTitle: existing.title,
          },
          { status: 409 }
        );
      }

      if (classification.extractionMethod === "video") {
        // === VIDEO PIPELINE (social media) ===
        // Fetch oEmbed metadata for title hint and thumbnail fallback
        const content = await withRetry(
          () => fetchContent(classification.url, classification.platform),
          3
        );
        videoUrl = content.videoUrl;
        imageUrl = content.imageUrl;
        const textHint = [content.title, content.description].filter(Boolean).join("\n");

        // Try VPS frame extraction, fall back to text for YouTube
        try {
          const frameResult = await extractVideoFrames(classification.url);

          if (frameResult.thumbnail) {
            thumbnailBase64 = frameResult.thumbnail;
          }

          extracted = await withRetry(
            () => extractRecipeFromMedia(frameResult.frames, textHint || undefined),
            2
          );
        } catch (vpsError) {
          console.log("VPS extraction failed, falling back to text:", (vpsError as Error).message);
          // Fall back: scrape the page as a website for richer text (video description often has full recipe)
          try {
            const websiteContent = await withRetry(
              () => fetchContent(classification.url, "website"),
              3
            );
            const richText = websiteContent.fullText || websiteContent.description;
            if (!imageUrl && websiteContent.imageUrl) {
              imageUrl = websiteContent.imageUrl;
            }
            if (richText) {
              extracted = await withRetry(() => extractRecipe(richText), 3);
            }
          } catch (scrapeError) {
            console.log("Website scrape fallback also failed:", (scrapeError as Error).message);
            // Last resort: try with whatever oEmbed text we have
            if (textHint) {
              extracted = await withRetry(() => extractRecipe(textHint), 3);
            }
          }
        }
      } else {
        // === TEXT PIPELINE (website) ===
        const content = await withRetry(
          () => fetchContent(classification.url, classification.platform),
          3
        );
        imageUrl = content.imageUrl;

        // Use fullText (JSON-LD) if available, fall back to description
        const textContent = content.fullText || content.description;
        extracted = await withRetry(() => extractRecipe(textContent), 3);
      }
    }

    if (!extracted) {
      return NextResponse.json(
        { error: "לא נמצא מתכון בתוכן הזה" },
        { status: 422 }
      );
    }

    // Store recipe
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .insert({
        title: extracted.title,
        source_url: sourceUrl,
        source_platform: platform,
        video_embed_url: videoUrl,
        categories: extracted.categories,
        extraction_status:
          extracted.ingredients.length > 0 && extracted.steps.length > 0
            ? "complete"
            : "partial",
        steps: extracted.steps,
        image_url: imageUrl,
        user_id: user.id,
      })
      .select()
      .single();

    if (recipeError) {
      throw new Error(`שגיאה בשמירת המתכון: ${recipeError.message}`);
    }

    // Upload thumbnail to permanent storage
    if (thumbnailBase64) {
      // Upload base64 image directly to Supabase Storage
      const buffer = Uint8Array.from(atob(thumbnailBase64), (c) => c.charCodeAt(0));
      const filePath = `${recipe.id}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("recipe-thumbnails")
        .upload(filePath, buffer, { contentType: "image/jpeg", upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("recipe-thumbnails")
          .getPublicUrl(filePath);
        await supabase
          .from("recipes")
          .update({ image_url: publicUrlData.publicUrl })
          .eq("id", recipe.id);
        recipe.image_url = publicUrlData.publicUrl;
      }
    } else if (imageUrl) {
      // Download remote image URL and re-upload to permanent storage
      const permanentUrl = await uploadRecipeImage(imageUrl, recipe.id, supabase);
      if (permanentUrl) {
        await supabase
          .from("recipes")
          .update({ image_url: permanentUrl })
          .eq("id", recipe.id);
        recipe.image_url = permanentUrl;
      }
    }

    // Store ingredients
    if (extracted.ingredients.length > 0) {
      const ingredients = extracted.ingredients.map((ing) => ({
        recipe_id: recipe.id,
        name: ing.name,
        canonical_name: normalizeIngredient(ing.name),
        quantity: ing.quantity,
        unit: ing.unit,
      }));

      const { error: ingredientError } = await supabase
        .from("ingredients")
        .insert(ingredients);

      if (ingredientError) {
        console.error("Failed to store ingredients:", ingredientError);
      }
    }

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    console.error("Recipe ingestion error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "שגיאה בעיבוד המתכון. נסו שוב מאוחר יותר.",
      },
      { status: 500 }
    );
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt))
        );
      }
    }
  }
  throw lastError;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") || "";
  const ingredientFilter = searchParams.get("ingredients") || "";
  const categoryFilter = searchParams.get("categories") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  try {
    const supabase = await createServerSupabase();

    let query = supabase
      .from("recipes")
      .select("*, ingredients(*)", { count: "exact" });

    // Full-text search
    if (search) {
      query = query.textSearch("search_vector", search, {
        type: "plain",
        config: "simple",
      });
    }

    // Category filter
    if (categoryFilter) {
      const categories = categoryFilter.split(",");
      query = query.overlaps("categories", categories);
    }

    // Pagination and ordering
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: recipes, error, count } = await query;

    if (error) throw error;

    // Ingredient-based filtering (post-query for subset matching)
    let filtered = recipes || [];
    if (ingredientFilter) {
      const available = ingredientFilter
        .split(",")
        .map((i) => i.trim().toLowerCase());

      filtered = filtered
        .map((recipe) => {
          const recipeIngredients = (recipe.ingredients || []).map(
            (i: { canonical_name: string }) => i.canonical_name.toLowerCase()
          );
          const missing = recipeIngredients.filter(
            (ing: string) =>
              !available.some(
                (a) => ing.includes(a) || a.includes(ing)
              )
          );
          const matchCount = recipeIngredients.length - missing.length;
          return { ...recipe, missingIngredients: missing, _matchCount: matchCount };
        })
        // Exclude recipes that share zero ingredients with what the user has
        .filter((recipe) => recipe._matchCount > 0)
        .sort(
          (a, b) => a.missingIngredients.length - b.missingIngredients.length
        )
        .map(({ _matchCount, ...rest }) => rest);
    }

    return NextResponse.json({
      recipes: filtered,
      total: count,
      page,
      limit,
    });
  } catch (error) {
    console.error("Recipe list error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת המתכונים" },
      { status: 500 }
    );
  }
}
