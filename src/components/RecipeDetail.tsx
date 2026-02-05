"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Square, CheckSquare, ExternalLink, Instagram, Facebook, Youtube } from "lucide-react";
import { RecipeWithIngredients, Category } from "@/types/recipe";
import { staggerContainer, staggerItem } from "@/lib/motion";
import CategoryEditor from "@/components/CategoryEditor";

const PLATFORM_INFO: Record<string, { name: string; icon: React.ReactNode }> = {
  instagram: { name: "אינסטגרם", icon: <Instagram className="w-5 h-5" /> },
  facebook: { name: "פייסבוק", icon: <Facebook className="w-5 h-5" /> },
  tiktok: { name: "טיקטוק", icon: <span className="text-base font-bold">T</span> },
  youtube: { name: "יוטיוב", icon: <Youtube className="w-5 h-5" /> },
};

export default function RecipeDetail({
  recipe,
}: {
  recipe: RecipeWithIngredients;
}) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Category[]>(recipe.categories);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/recipes/categories")
      .then((res) => res.json())
      .then((data) => setAvailableCategories(data.categories || []))
      .catch(() => {});
  }, []);

  function toggleIngredient(id: string) {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const platform = PLATFORM_INFO[recipe.source_platform];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Retro header card with dashed border */}
      <div className="card card-dashed p-6 mb-6">
        {/* Category editor */}
        <div className="mb-4">
          <CategoryEditor
            recipeId={recipe.id}
            categories={categories}
            availableCategories={availableCategories}
            onSave={setCategories}
          />
        </div>

        {/* Video link - retro button style */}
        {recipe.video_embed_url && platform && (
          <a
            href={recipe.video_embed_url}
            target="_blank"
            rel="noopener noreferrer"
            className="retro-btn inline-flex items-center gap-2.5 mb-2"
          >
            {platform.icon}
            <span>צפה בסרטון ב{platform.name}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Ingredients - retro menu board style */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">🧂</span>
          <h2 className="text-2xl font-bold text-[#3D2817]">
            מצרכים
          </h2>
        </div>

        <div className="card p-5">
          <ul className="space-y-2">
            {recipe.ingredients.map((ing) => {
              const isChecked = checkedIngredients.has(ing.id);
              return (
                <li
                  key={ing.id}
                  onClick={() => toggleIngredient(ing.id)}
                  className={`flex items-center gap-3 py-3 px-3 rounded-lg cursor-pointer transition-all hover:bg-[#FFE5CC] border-l-4 ${
                    isChecked
                      ? "border-l-[#82A284] bg-[#F5F5DC] opacity-60"
                      : "border-l-[#E67E22] bg-white"
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-6 h-6 text-[#82A284] flex-shrink-0" />
                  ) : (
                    <Square className="w-6 h-6 text-[#8B7355] flex-shrink-0" />
                  )}
                  <span
                    className={`font-bold text-base transition-all ${
                      isChecked
                        ? "line-through text-[#8B7355]"
                        : "text-[#3D2817]"
                    }`}
                  >
                    {ing.name}
                  </span>
                  {(ing.quantity || ing.unit) && (
                    <span className="text-[#8B7355] text-sm mr-auto font-medium">
                      {[ing.quantity, ing.unit].filter(Boolean).join(" ")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Steps - retro numbered badges */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">👨‍🍳</span>
          <h2 className="text-2xl font-bold text-[#3D2817]">
            הוראות הכנה
          </h2>
        </div>

        <motion.ol
          className="space-y-5"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {recipe.steps.map((step, index) => (
            <motion.li
              key={index}
              variants={staggerItem}
              className="flex gap-4"
            >
              {/* Retro circular number badge */}
              <div className="flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-3"
                  style={{
                    background: "linear-gradient(135deg, #F4A460, #D2691E)",
                    border: "3px solid #8B4513",
                    color: "white",
                    boxShadow: "3px 3px 0 rgba(139, 69, 19, 0.4)",
                  }}
                >
                  {index + 1}
                </div>
              </div>

              {/* Step text in card */}
              <div className="card flex-1 p-4">
                <p className="leading-relaxed text-[#3D2817] font-medium">
                  {step}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </section>

      {/* Retro "Enjoy!" sticker at bottom */}
      <div className="text-center py-6">
        <div className="retro-badge inline-block text-lg px-8 py-3">
          בתאבון! 🍽️
        </div>
      </div>
    </div>
  );
}
