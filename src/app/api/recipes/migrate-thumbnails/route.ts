import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { fetchContent } from "@/lib/content-fetcher";
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
        // Skip if no source URL
        if (!recipe.source_url) {
          results.skipped++;
          results.details.push({
            id: recipe.id,
            title: recipe.title,
            status: "skipped - no source URL",
          });
          continue;
        }

        // Fetch new thumbnail using improved extraction
        const content = await fetchContent(
          recipe.source_url,
          recipe.source_platform as Platform
        );

        const debugInfo = {
          platform: recipe.source_platform,
          sourceUrl: recipe.source_url,
          currentImage: recipe.image_url,
          fetchedImage: content.imageUrl,
        };

        // If we got a new image URL and it's different from the old one
        if (content.imageUrl && content.imageUrl !== recipe.image_url) {
          // Update the recipe with new thumbnail
          const { error: updateError } = await supabase
            .from("recipes")
            .update({ image_url: content.imageUrl })
            .eq("id", recipe.id);

          if (updateError) {
            throw new Error(`שגיאה בעדכון: ${updateError.message}`);
          }

          results.updated++;
          results.details.push({
            id: recipe.id,
            title: recipe.title,
            status: "updated",
            ...debugInfo,
          });
        } else {
          results.skipped++;
          results.details.push({
            id: recipe.id,
            title: recipe.title,
            status: content.imageUrl ? "skipped - same image" : "skipped - no image fetched",
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
