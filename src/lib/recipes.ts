import { SupabaseClient } from "@supabase/supabase-js";
import { Recipe, RecipeWithIngredients } from "@/types/recipe";

export async function getRecipeById(
  supabase: SupabaseClient,
  id: string
): Promise<RecipeWithIngredients | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select("*, ingredients(*)")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as RecipeWithIngredients;
}

export async function deleteRecipe(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  return !error;
}

export async function listRecipes(
  supabase: SupabaseClient,
  params: {
    search?: string;
    categories?: string[];
    page?: number;
    limit?: number;
  }
): Promise<{ recipes: Recipe[]; total: number }> {
  const { search, categories, page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("recipes")
    .select("*, ingredients(*)", { count: "exact" });

  if (search) {
    query = query.textSearch("search_vector", search, {
      type: "plain",
      config: "simple",
    });
  }

  if (categories && categories.length > 0) {
    query = query.overlaps("categories", categories);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    recipes: (data || []) as Recipe[],
    total: count || 0,
  };
}

export async function suggestIngredients(
  supabase: SupabaseClient,
  query: string,
  limit = 10
): Promise<string[]> {
  const { data, error } = await supabase
    .from("ingredients")
    .select("canonical_name")
    .ilike("canonical_name", `%${query}%`)
    .limit(limit);

  if (error || !data) return [];

  // Deduplicate
  const unique = [...new Set(data.map((d) => d.canonical_name))];
  return unique.slice(0, limit);
}
