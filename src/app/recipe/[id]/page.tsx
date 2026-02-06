"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Trash2, Pencil, Check, X } from "lucide-react";
import { RecipeWithIngredients, Category } from "@/types/recipe";
import { getRecipeGradient, getCategoryIcon } from "@/lib/gradients";
import PageTransition from "@/components/PageTransition";
import RecipeDetail from "@/components/RecipeDetail";

export default function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/recipes/${id}`);
        if (!res.ok) {
          setError("המתכון לא נמצא");
          return;
        }
        const data = await res.json();
        setRecipe(data.recipe);
      } catch {
        setError("שגיאה בטעינת המתכון");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleDelete() {
    if (!confirm("בטוח שרוצים למחוק את המתכון?")) return;
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    router.push("/");
  }

  async function handleTitleSave() {
    if (!titleDraft.trim() || titleDraft.trim() === recipe?.title) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleDraft.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecipe(data.recipe);
      }
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="aspect-[16/9] skeleton-shimmer rounded-2xl mb-6" />
        <div className="h-8 skeleton-shimmer rounded-xl w-3/4 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-5 skeleton-shimmer rounded-xl w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-lg text-muted mb-4">{error || "המתכון לא נמצא"}</p>
        <Link href="/" className="text-primary hover:underline">
          חזרה לעמוד הראשי
        </Link>
      </div>
    );
  }

  const primaryCategory = recipe.categories[0] || ("פרווה" as Category);
  const gradient = getRecipeGradient(recipe.title, primaryCategory);
  const emoji = getCategoryIcon(primaryCategory);
  const showImage = recipe.image_url && !imgError;

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero Image */}
        <motion.div
          className="relative -mx-4 sm:mx-0 sm:rounded-2xl overflow-hidden mb-8 aspect-[16/9] flex items-end"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {showImage ? (
            <Image
              src={recipe.image_url!}
              alt={recipe.title}
              fill
              className="object-cover"
              sizes="(max-width: 672px) 100vw, 672px"
              priority
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: gradient }}
            >
              <span className="text-8xl opacity-15 select-none">
                {emoji}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="relative p-6 text-white w-full">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  className="flex-1 text-2xl font-bold bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1 text-white border border-white/30 outline-none focus:border-white/60"
                  autoFocus
                  disabled={savingTitle}
                />
                <button
                  onClick={handleTitleSave}
                  disabled={savingTitle}
                  className="w-9 h-9 rounded-full bg-green-500/80 hover:bg-green-500 flex items-center justify-center transition-colors"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setEditingTitle(false)}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h1 className="text-2xl font-bold drop-shadow-md">{recipe.title}</h1>
                <button
                  onClick={() => { setTitleDraft(recipe.title); setEditingTitle(true); }}
                  className="opacity-0 group-hover/title:opacity-100 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Nav */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-muted hover:text-foreground text-sm transition-colors group"
          >
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            חזרה למתכונים
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            מחק
          </button>
        </div>

        <RecipeDetail recipe={recipe} />
      </div>
    </PageTransition>
  );
}
