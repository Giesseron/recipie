"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddRecipeForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.existingId) {
          router.push(`/recipe/${data.existingId}`);
          return;
        }
        setError(data.error || "שגיאה בהוספת המתכון");
        return;
      }

      setUrl("");
      router.refresh();
    } catch {
      setError("שגיאה בהתחברות לשרת. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="הדביקו קישור למתכון מאינסטגרם, טיקטוק, פייסבוק או יוטיוב..."
          className="flex-1 px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={loading}
          dir="ltr"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
        >
          {loading ? "מעבד..." : "הוסף מתכון"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}
    </form>
  );
}
