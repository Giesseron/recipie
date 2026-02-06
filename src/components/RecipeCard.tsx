"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Instagram, Facebook, Youtube, Globe, Camera } from "lucide-react";
import { Recipe, Category } from "@/types/recipe";
import { getRecipeGradient, getCategoryIcon, CATEGORY_BADGE_STYLES } from "@/lib/gradients";
import { staggerItem } from "@/lib/motion";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  tiktok: <span className="text-sm font-bold leading-none">T</span>,
  website: <Globe className="w-4 h-4" />,
  upload: <Camera className="w-4 h-4" />,
};

// Random rotation angles for variety
const ROTATION_CLASSES = [
  "rotate-[-2deg]",
  "rotate-[1deg]",
  "rotate-[-1deg]",
  "rotate-[2deg]",
];

export default function RecipeCard({ recipe, ingredientFilterActive }: { recipe: Recipe; ingredientFilterActive?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const ingredientCount = recipe.ingredients?.length || 0;
  const primaryCategory = recipe.categories[0] || ("פרווה" as Category);
  const gradient = getRecipeGradient(recipe.title, primaryCategory);
  const categoryEmoji = getCategoryIcon(primaryCategory);
  const showImage = recipe.image_url && !imgError;

  // Deterministic rotation based on recipe ID
  const rotationClass = ROTATION_CLASSES[recipe.id.charCodeAt(0) % ROTATION_CLASSES.length];

  return (
    <motion.div variants={staggerItem} className={rotationClass}>
      <Link href={`/recipe/${recipe.id}`}>
        {/* Polaroid-style card */}
        <div className="polaroid cursor-pointer group hover:rotate-0 transition-all duration-300 retro-bounce">
          {/* Image area */}
          <div className="relative aspect-[4/3] overflow-hidden bg-gray-200">
            {showImage ? (
              <div className="relative w-full h-full">
                <Image
                  src={recipe.image_url!}
                  alt={recipe.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-all duration-500"
                  style={{
                    filter: 'saturate(1.35) contrast(1.12) brightness(1.06)',
                  }}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  onError={() => setImgError(true)}
                />
                {/* Retro warm tint overlay + vignette */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-500 group-hover:opacity-40"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(244, 164, 96, 0.12) 0%, rgba(139, 69, 19, 0.25) 100%)',
                    mixBlendMode: 'multiply',
                    opacity: 0.5,
                  }}
                />
              </div>
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: gradient }}
              >
                <span className="text-7xl opacity-30 select-none">
                  {categoryEmoji}
                </span>
              </div>
            )}

            {/* Platform badge - retro sticker style */}
            <div className="absolute top-2 right-2">
              <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center border-2 border-[#8B4513] shadow-lg transform rotate-12">
                <div className="text-[#8B4513]">
                  {PLATFORM_ICONS[recipe.source_platform] || null}
                </div>
              </div>
            </div>
          </div>

          {/* Polaroid caption area */}
          <div className="pt-3 pb-2 px-2 bg-white">
            {/* Title - handwritten style */}
            <h3 className="text-base font-bold line-clamp-2 text-[#3D2817] mb-1.5 leading-snug">
              {recipe.title}
            </h3>

            {/* Info */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-[#8B7355]">
                {ingredientCount} מצרכים · {recipe.steps.length} שלבים
              </p>
            </div>

            {/* Missing ingredients badge */}
            {ingredientFilterActive && (
              <div className="mb-2">
                {recipe.missingIngredients && recipe.missingIngredients.length > 0 ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FFF0E0] text-[#D2691E] border border-[#E67E22]">
                    חסרים {recipe.missingIngredients.length} מצרכים
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E8F5E8] text-[#2F4F2F] border border-[#82A284]">
                    כל המצרכים אצלכם ✓
                  </span>
                )}
              </div>
            )}

            {/* Category badge - retro style */}
            <div className="flex flex-wrap gap-1.5">
              <span
                className={`text-xs px-2.5 py-1 rounded-full ${
                  CATEGORY_BADGE_STYLES[primaryCategory] || "bg-gray-100 text-gray-800"
                }`}
              >
                {primaryCategory}
              </span>
            </div>
          </div>

          {/* Optional "New!" sticker for recent recipes */}
          {recipe.created_at &&
            new Date(recipe.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
            <div className="retro-sticker" style={{ top: '-10px', left: '-10px' }}>
              חדש!
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
