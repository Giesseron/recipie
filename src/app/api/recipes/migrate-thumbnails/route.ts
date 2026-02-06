import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { fetchContent } from "@/lib/content-fetcher";
import { uploadRecipeImage, isStorageUrl } from "@/lib/image-storage";
import { Platform } from "@/types/recipe";

/**
 * Migration endpoint to update all existing recipes with better thumbnails
 * GET /api/recipes/migrate-thumbnails
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    // Fetch all recipes for this user
    const { data: recipes, error: fetchError } = await supabase
      .from("recipes")
      .select("id, title, source_url, source_platform, image_url")
      .order("created_at", { ascending: false });

    if (fetchError) {
      throw new Error(`שגיאה בטעינת מתכונים: ${fetchError.message}`);
    }

    if (!recipes || recipes.length === 0) {
      return NextResponse.json({
        message: "אין מתכונים לעדכן",
        updated: 0,
        failed: 0,
        skipped: 0,
      });
    }

    const results = {
      total: recipes.length,
      updated: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{ id: string; title: string; status: string; platform?: string; sourceUrl?: string; currentImage?: string | null; fetchedImage?: string | null }>,
    };

    // Process each recipe
    for (const recipe of recipes) {
      try {
        // Skip if already stored in Supabase Storage
        if (isStorageUrl(recipe.image_url)) {
          results.skipped++;
          results.details.push({
            id: recipe.id,
            title: recipe.title,
            status: "skipped - already in Storage",
            currentImage: recipe.image_url,
          });
          continue;
        }

        // Skip if no source URL and no existing image
        if (!recipe.source_url && !recipe.image_url) {
          results.skipped++;
          results.details.push({
            id: recipe.id,
            title: recipe.title,
            status: "skipped - no source URL or image",
          });
          continue;
        }

        let permanentUrl: string | null = null;

        // Strategy 1: Try uploading the existing image_url (may still be valid)
        if (recipe.image_url) {
          permanentUrl = await uploadRecipeImage(
            recipe.image_url,
            recipe.id,
            supabase
          );
        }

        // Strategy 2: If that failed, re-fetch from the source platform
        if (!permanentUrl && recipe.source_url) {
          try {
            const content = await fetchContent(
              recipe.source_url,
              recipe.source_platform as Platform
            );
            if (content.imageUrl) {
              permanentUrl = await uploadRecipeImage(
                content.imageUrl,
                recipe.id,
                supabase
              );
            }
          } catch (error) {
            console.log(`Re-fetch failed for ${recipe.id}:`, error);
          }
        }

        const debugInfo = {
          platform: recipe.source_platform,
          sourceUrl: recipe.source_url,
          currentImage: recipe.image_url,
        };

        if (permanentUrl) {
          const { error: updateError } = await supabase
            .from("recipes")
            .update({ image_url: permanentUrl })
            .eq("id", recipe.id);

          if (updateError) {
            throw new Error(`שגיאה בעדכון: ${updateError.message}`);
          }

          results.updated++;
          results.details.push({
            id: recipe.id,
            title: recipe.title,
            status: "updated - stored in Storage",
            ...debugInfo,
            fetchedImage: permanentUrl,
          });
        } else {
          results.skipped++;
          results.details.push({
            id: recipe.id,
            title: recipe.title,
            status: "skipped - could not download image",
            ...debugInfo,
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          id: recipe.id,
          title: recipe.title,
          status: `failed: ${error instanceof Error ? error.message : "שגיאה לא ידועה"}`,
        });
        console.error(`Failed to update recipe ${recipe.id}:`, error);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      message: "המיגרציה הושלמה",
      ...results,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "שגיאה בביצוע המיגרציה",
      },
      { status: 500 }
    );
  }
}
