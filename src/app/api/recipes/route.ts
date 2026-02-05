import { NextRequest, NextResponse } from "next/server";
import { validateRecipeUrl } from "@/lib/url-validator";
import { fetchContent } from "@/lib/content-fetcher";
import { extractRecipe, normalizeIngredient } from "@/lib/ai-extractor";
import { createServerSupabase } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "נא להזין כתובת URL" },
        { status: 400 }
      );
    }

    // 1. Validate URL
    const validation = validateRecipeUrl(url);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 2. Check for duplicate (scoped to current user via RLS)
    const { data: existing } = await supabase
      .from("recipes")
      .select("id, title")
      .eq("source_url", validation.url)
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

    // 3. Fetch content with retry
    const content = await withRetry(
      () => fetchContent(validation.url, validation.platform),
      3
    );

    // 4. Extract recipe via AI
    const extracted = await withRetry(() => extractRecipe(content.description), 3);

    if (!extracted) {
      return NextResponse.json(
        { error: "לא נמצא מתכון בתוכן הזה" },
        { status: 422 }
      );
    }

    // 5. Store recipe (with user_id)
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .insert({
        title: extracted.title,
        source_url: validation.url,
        source_platform: validation.platform,
        video_embed_url: content.videoUrl,
        categories: extracted.categories,
        extraction_status:
          extracted.ingredients.length > 0 && extracted.steps.length > 0
            ? "complete"
            : "partial",
        steps: extracted.steps,
        image_url: content.imageUrl,
        user_id: user.id,
      })
      .select()
      .single();

    if (recipeError) {
      throw new Error(`שגיאה בשמירת המתכון: ${recipeError.message}`);
    }

    // 6. Store ingredients
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
