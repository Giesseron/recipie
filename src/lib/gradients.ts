import { Category } from "@/types/recipe";

// Retro 70s Israeli Diner color palette — built-in categories only
const BUILT_IN_GRADIENTS: Record<string, { from: string; to: string; icon: string }> = {
  חלבי: { from: "#87CEEB", to: "#4682B4", icon: "🥛" },
  בשרי: { from: "#CD5C5C", to: "#8B4513", icon: "🥩" },
  פרווה: { from: "#F4A460", to: "#D2691E", icon: "🍳" },
  טבעוני: { from: "#82A284", to: "#556B2F", icon: "🌿" },
  בריאותי: { from: "#BDB76B", to: "#808000", icon: "🥗" },
};

const BUILT_IN_BADGE_STYLES: Record<string, string> = {
  חלבי: "bg-[#E0F4FF] text-[#2C5F7F] border-2 border-[#4682B4] font-bold",
  בשרי: "bg-[#FFE4C4] text-[#8B4513] border-2 border-[#CD5C5C] font-bold",
  פרווה: "bg-[#FFF8DC] text-[#8B4513] border-2 border-[#D2691E] font-bold",
  טבעוני: "bg-[#E8F5E8] text-[#2F4F2F] border-2 border-[#82A284] font-bold",
  בריאותי: "bg-[#F5F5DC] text-[#556B2F] border-2 border-[#BDB76B] font-bold",
};

// Neutral fallback for custom / unknown categories
const FALLBACK_GRADIENT = { from: "#D1D5DB", to: "#9CA3AF", icon: "🍽️" };
const FALLBACK_BADGE = "bg-[#F3F4F6] text-[#4B5563] border-2 border-[#9CA3AF] font-bold";

/**
 * Badge style for any category — built-in or custom.
 */
export function getCategoryBadgeStyle(category: Category): string {
  return BUILT_IN_BADGE_STYLES[category] || FALLBACK_BADGE;
}

// Keep the old exported object shape so existing imports that do a direct
// lookup don't break — but route all accesses through the helper above where
// possible.  The Proxy returns the fallback for any unknown key.
export const CATEGORY_BADGE_STYLES: Record<string, string> = new Proxy(
  BUILT_IN_BADGE_STYLES,
  { get: (_target, prop) => (typeof prop === "string" ? (_target[prop] || FALLBACK_BADGE) : undefined) }
);

export const CATEGORY_GRADIENTS: Record<string, { from: string; to: string; icon: string }> = new Proxy(
  BUILT_IN_GRADIENTS,
  { get: (_target, prop) => (typeof prop === "string" ? (_target[prop] || FALLBACK_GRADIENT) : undefined) }
);

/**
 * Generate a deterministic hash from a string.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get a gradient CSS string for a recipe card cover.
 * The angle is based on the title hash for visual variety.
 */
export function getRecipeGradient(title: string, category: Category): string {
  const { from, to } = CATEGORY_GRADIENTS[category];
  const angle = hashString(title) % 360;
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}

/**
 * Get the emoji icon for a category.
 */
export function getCategoryIcon(category: Category): string {
  return CATEGORY_GRADIENTS[category]?.icon || "🍽️";
}
