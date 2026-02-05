"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Category } from "@/types/recipe";
import { CATEGORY_BADGE_STYLES } from "@/lib/gradients";

export default function CategoryEditor({
  recipeId,
  categories,
  availableCategories,
  onSave,
}: {
  recipeId: string;
  categories: Category[];
  availableCategories: Category[];
  onSave: (updated: Category[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Category[]>(categories);
  const [customInput, setCustomInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset selection when editing opens
  useEffect(() => {
    if (editing) {
      setSelected(categories);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [editing, categories]);

  function toggleCategory(cat: Category) {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function addCustomCategory() {
    const trimmed = customInput.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    setSelected((prev) => [...prev, trimmed]);
    setCustomInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomCategory();
    }
  }

  async function handleSave() {
    if (selected.length === 0) {
      setError("יש לבחור לפחות קטגורי אחת");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: selected }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה בעדכון");
        return;
      }

      onSave(selected);
      setEditing(false);
    } catch {
      setError("שגיאה בהתחברות לשרת");
    } finally {
      setSaving(false);
    }
  }

  // Read-only view
  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <span
            key={cat}
            className={`text-sm px-3.5 py-1.5 rounded-full ${
              CATEGORY_BADGE_STYLES[cat]
            }`}
          >
            {cat}
          </span>
        ))}
        <button
          onClick={() => setEditing(true)}
          className="w-8 h-8 rounded-full bg-white border-2 border-[#8B4513] flex items-center justify-center text-[#8B4513] hover:bg-[#FFE5CC] transition-colors"
          title="ערוך קטגורים"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-4">
      {/* Chip picker */}
      <div className="flex flex-wrap gap-2">
        {availableCategories.map((cat) => {
          const isActive = selected.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`retro-chip text-sm transition-all ${
                isActive ? "active" : ""
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Custom category input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="קטגורי חדשה..."
          className="retro-input flex-1 text-sm py-2"
        />
        <button
          type="button"
          onClick={addCustomCategory}
          disabled={!customInput.trim()}
          className="retro-btn text-sm px-4 py-2 disabled:opacity-40"
        >
          הוסף
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 font-bold">{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="retro-btn flex items-center gap-2 text-sm px-5 py-2 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          שמור
        </button>
        <button
          onClick={() => setEditing(false)}
          className="flex items-center gap-1.5 text-sm font-bold text-[#8B7355] hover:text-[#3D2817] transition-colors"
        >
          <X className="w-4 h-4" />
          בטול
        </button>
      </div>
    </div>
  );
}
