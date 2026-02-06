export type Platform = "instagram" | "facebook" | "tiktok" | "youtube" | "website" | "upload";

export type Category = string;

export const BUILT_IN_CATEGORIES: Category[] = ["חלבי", "בשרי", "פרווה", "טבעוני", "בריאותי"];

export type ExtractionStatus = "complete" | "partial" | "failed";

export interface Ingredient {
  id: string;
  recipe_id: string;
  name: string;
  canonical_name: string;
  quantity: string | null;
  unit: string | null;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  source_url: string | null;
  source_platform: Platform;
  video_embed_url: string | null;
  categories: Category[];
  extraction_status: ExtractionStatus;
  steps: string[];
  image_url: string | null;
  created_at: string;
  ingredients?: Ingredient[];
  missingIngredients?: string[];
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: Ingredient[];
}

export interface ExtractedRecipe {
  title: string;
  ingredients: {
    name: string;
    quantity: string | null;
    unit: string | null;
  }[];
  steps: string[];
  videoUrl: string | null;
  categories: Category[];
}
