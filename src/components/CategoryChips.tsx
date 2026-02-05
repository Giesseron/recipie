"use client";

import { Category } from "@/types/recipe";
import { CATEGORY_BADGE_STYLES } from "@/lib/gradients";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "חלבי", label: "🥛 חלבי" },
  { value: "בשרי", label: "🥩 בשרי" },
  { value: "פרווה", label: "🍳 פרווה" },
  { value: "טבעוני", label: "🌿 טבעוני" },
  { value: "בריאותי", label: "🥗 בריאותי" },
];

export default function CategoryChips({
  selected,
  onChange,
}: {
  selected: Category[];
  onChange: (categories: Category[]) => void;
}) {
  function toggle(category: Category) {
    if (selected.includes(category)) {
      onChange(selected.filter((c) => c !== category));
    } else {
      onChange([...selected, category]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {CATEGORIES.map((cat) => {
        const isActive = selected.includes(cat.value);
        return (
          <button
            key={cat.value}
            onClick={() => toggle(cat.value)}
            className={`retro-chip text-sm ${
              isActive ? "active" : ""
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
