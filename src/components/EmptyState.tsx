"use client";

import { motion } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";
import { slideUp } from "@/lib/motion";

export default function EmptyState({
  onAddRecipe,
}: {
  onAddRecipe?: () => void;
}) {
  return (
    <motion.div
      className="text-center py-20 px-4"
      variants={slideUp}
      initial="hidden"
      animate="visible"
    >
      {/* Retro icon container */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{
          background: "linear-gradient(135deg, #F4A460, #D2691E)",
          border: "4px solid #8B4513",
          boxShadow: "6px 6px 0 rgba(139, 69, 19, 0.3)",
        }}
      >
        <UtensilsCrossed className="w-12 h-12 text-white" />
      </div>

      <h2 className="text-2xl font-bold mb-3 text-[#3D2817]">
        אין מתכונים עדיין... 🍽️
      </h2>
      <p className="text-[#8B7355] max-w-sm mx-auto mb-8 font-medium text-lg leading-relaxed">
        זה הזמן להתחיל! הוסיפו את המתכון הראשון שלכם מאינסטגרם, טיקטוק, פייסבוק או יוטיוב
      </p>

      {onAddRecipe && (
        <button
          onClick={onAddRecipe}
          className="retro-btn inline-flex items-center gap-2 text-lg px-8 py-4"
        >
          <span className="text-2xl">✨</span>
          הוסיפו מתכון ראשון
        </button>
      )}

      {/* Decorative retro elements */}
      <div className="mt-12 flex justify-center gap-4 text-4xl opacity-40">
        <span>🍳</span>
        <span>🥘</span>
        <span>🍲</span>
      </div>
    </motion.div>
  );
}
