"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(local);
    }, 300);
    return () => clearTimeout(timer);
  }, [local, onChange]);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className="relative group">
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="חיפוש מתכונים... 🔍"
        className="retro-input w-full pr-12 text-base"
      />
      <Search className="absolute top-1/2 right-4 -translate-y-1/2 w-5 h-5 text-[#8B7355] group-focus-within:text-[#E67E22] transition-colors" />
    </div>
  );
}
