"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, Plus } from "lucide-react";
import { Recipe, Category } from "@/types/recipe";
import { useAuth } from "@/components/AuthProvider";
import PageTransition from "@/components/PageTransition";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import IngredientFilter from "@/components/IngredientFilter";
import CategoryChips from "@/components/CategoryChips";
import RecipeCard from "@/components/RecipeCard";
import EmptyState from "@/components/EmptyState";
import AddRecipeModal from "@/components/AddRecipeModal";
import { staggerContainer } from "@/lib/motion";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signOut } = useAuth();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const search = searchParams.get("search") || "";
  const ingredients = searchParams.get("ingredients")
    ? searchParams.get("ingredients")!.split(",")
    : [];
  const categories = (
    searchParams.get("categories")
      ? searchParams.get("categories")!.split(",")
      : []
  ) as Category[];

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const ingredientsKey = ingredients.join(",");
  const categoriesKey = categories.join(",");

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (ingredientsKey) params.set("ingredients", ingredientsKey);
      if (categoriesKey) params.set("categories", categoriesKey);
      params.set("page", String(page));

      const res = await fetch(`/api/recipes?${params.toString()}`);
      const data = await res.json();
      if (page === 1) {
        setRecipes(data.recipes || []);
      } else {
        setRecipes((prev) => [...prev, ...(data.recipes || [])]);
      }
      setTotal(data.total || 0);
    } catch {
      // Error state handled by empty recipes
    } finally {
      setLoading(false);
    }
  }, [search, ingredientsKey, categoriesKey, page]);

  useEffect(() => {
    setPage(1);
  }, [search, ingredientsKey, categoriesKey]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const hasFilters = search || ingredients.length > 0 || categories.length > 0;

  function handleRecipeAdded() {
    setPage(1);
    fetchRecipes();
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 relative z-10">
        {/* Retro Header */}
        <header className="mb-10">
          <div className="card card-dashed p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex-1"
              >
                {/* Brand Logo - responsive */}
                <Logo variant="full" className="h-12 sm:h-14 w-auto hidden sm:block" />
                <Logo variant="icon" className="h-10 w-10 sm:hidden" />
                <p
                  className="text-[#8B7355] text-base sm:text-lg font-medium mt-2"
                  style={{ textShadow: "1px 1px 0 rgba(255, 249, 230, 0.5)" }}
                >
                  צוד. שמור. בשל.
                </p>
              </motion.div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setModalOpen(true)}
                  className="retro-btn flex items-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2.5 sm:py-3 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">הוסיפו מתכון</span>
                  <span className="sm:hidden">הוסף</span>
                </button>

                <button
                  onClick={signOut}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#8B4513] bg-white hover:bg-[#FFE5CC] transition-all flex items-center justify-center text-[#8B4513]"
                  title="התנתקות"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Filters */}
        <section className="space-y-4 mb-8">
          <SearchBar
            value={search}
            onChange={(v) => updateParams({ search: v })}
          />

          <IngredientFilter
            selected={ingredients}
            onChange={(v) =>
              updateParams({ ingredients: v.length ? v.join(",") : "" })
            }
          />

          <CategoryChips
            selected={categories}
            onChange={(v) =>
              updateParams({ categories: v.length ? v.join(",") : "" })
            }
          />

          {hasFilters && (
            <div className="text-center">
              <button
                onClick={() => router.push("/", { scroll: false })}
                className="text-sm font-bold text-[#8B7355] hover:text-[#3D2817] transition-colors underline decoration-2 decoration-[#D2691E]"
              >
                ✖ נקה את כל הסינונים
              </button>
            </div>
          )}
        </section>

        {/* Recipe Grid */}
        {loading && recipes.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="polaroid">
                <div className="aspect-[4/3] skeleton-shimmer" />
                <div className="pt-3 pb-2 px-2 space-y-3">
                  <div className="h-5 skeleton-shimmer rounded w-3/4" />
                  <div className="h-4 skeleton-shimmer rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <EmptyState onAddRecipe={() => setModalOpen(true)} />
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} ingredientFilterActive={ingredients.length > 0} />
              ))}
            </motion.div>

            {recipes.length < total && (
              <div className="text-center mt-12">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                  className="retro-btn px-10 py-3 text-base disabled:opacity-50"
                >
                  {loading ? "טוען..." : "טען עוד מתכונים 📚"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <AddRecipeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleRecipeAdded}
      />
    </PageTransition>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
