import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { BUILT_IN_CATEGORIES } from "@/types/recipe";

/**
 * GET /api/recipes/categories
 * Returns the full set of categories available to the current user:
 * the 5 built-in categories + any distinct custom values from their recipes.
 * Built-in categories are listed first, then custom ones alphabetically.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    // Pull distinct categories from the user's recipes via the categories text[] column
    const { data: rows, error } = await supabase
      .from("recipes")
      .select("categories")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "שגיאה בטעינת הקטגורים" }, { status: 500 });
    }

    // Flatten and deduplicate
    const customSet = new Set<string>();
    for (const row of rows || []) {
      for (const cat of row.categories || []) {
        if (!BUILT_IN_CATEGORIES.includes(cat)) {
          customSet.add(cat);
        }
      }
    }

    // Built-in first, then custom alphabetically
    const categories = [
      ...BUILT_IN_CATEGORIES,
      ...[...customSet].sort((a, b) => a.localeCompare(b, "he")),
    ];

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Categories fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת הקטגורים" }, { status: 500 });
  }
}
