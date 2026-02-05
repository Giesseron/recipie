"use client";

import { useState, useEffect, useRef } from "react";

export default function IngredientFilter({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ingredients: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/ingredients/suggest?q=${encodeURIComponent(input)}`
        );
        const data = await res.json();
        setSuggestions(
          (data.suggestions || []).filter(
            (s: string) => !selected.includes(s)
          )
        );
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [input, selected]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addIngredient(name: string) {
    if (!selected.includes(name)) {
      onChange([...selected, name]);
    }
    setInput("");
    setShowSuggestions(false);
  }

  function removeIngredient(name: string) {
    onChange(selected.filter((s) => s !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      addIngredient(input.trim());
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Retro input container */}
      <div
        className="flex flex-wrap gap-2 p-3 min-h-[50px]"
        style={{
          background: "white",
          border: "3px solid #8B4513",
          borderRadius: "8px",
        }}
      >
        {selected.map((ing) => (
          <span
            key={ing}
            className="flex items-center gap-2 text-sm font-bold px-3 py-1 rounded-full"
            style={{
              background: "linear-gradient(135deg, #F4A460, #D2691E)",
              color: "white",
              border: "2px solid #8B4513",
              boxShadow: "2px 2px 0 rgba(139, 69, 19, 0.3)",
            }}
          >
            {ing}
            <button
              onClick={() => removeIngredient(ing)}
              className="hover:scale-125 transition-transform font-bold text-lg leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            selected.length === 0 ? "מה יש לכם בבית? (ביצים, גבינה...) 🥚" : ""
          }
          className="flex-1 min-w-[150px] bg-transparent outline-none text-base text-[#3D2817] placeholder:text-[#8B7355] font-medium"
        />
      </div>

      {/* Suggestions dropdown - retro style */}
      {showSuggestions && suggestions.length > 0 && (
        <ul
          className="absolute z-10 top-full mt-2 w-full max-h-48 overflow-y-auto"
          style={{
            background: "#FFF9E6",
            border: "3px solid #8B4513",
            borderRadius: "8px",
            boxShadow: "4px 4px 0 rgba(139, 69, 19, 0.3)",
          }}
        >
          {suggestions.map((s) => (
            <li
              key={s}
              onClick={() => addIngredient(s)}
              className="px-4 py-3 hover:bg-[#FFE5CC] cursor-pointer text-base font-medium text-[#3D2817] transition-colors border-b-2 border-[#F4E4C1] last:border-0"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
