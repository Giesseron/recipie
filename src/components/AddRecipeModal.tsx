"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Link as LinkIcon } from "lucide-react";
import { modalOverlay, modalContent } from "@/lib/motion";
import { useToast } from "@/components/ToastProvider";

const PROCESSING_STAGES = [
  "מאתר תוכן...",
  "מחלץ מתכון...",
  "שומר...",
];

export default function AddRecipeModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const { show: showToast } = useToast();

  // Cycle through processing stages
  useEffect(() => {
    if (!loading) {
      setStage(0);
      return;
    }
    const interval = setInterval(() => {
      setStage((s) => (s < PROCESSING_STAGES.length - 1 ? s + 1 : s));
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  // Close on Escape (only when not loading)
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, loading, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setStage(0);

    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "שגיאה בהוספת המתכון");
        return;
      }

      showToast({
        type: "success",
        message: `המתכון "${data.recipe?.title || "חדש"}" נוסף בהצלחה!`,
      });
      setUrl("");
      onClose();
      onSuccess();
    } catch {
      setError("שגיאה בהתחברות לשרת. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center px-0 sm:px-4"
          variants={modalOverlay}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#3D2817]/60 backdrop-blur-sm"
            onClick={loading ? undefined : onClose}
          />

          {/* Modal - retro card style */}
          <motion.div
            className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl z-10 overflow-hidden"
            variants={modalContent}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Retro layered border effect */}
            <div
              className="p-8"
              style={{
                background: "#FFF9E6",
                border: "4px solid #8B4513",
                boxShadow:
                  "8px 8px 0 #D2691E, 16px 16px 0 #CD853F, 0 20px 40px rgba(0,0,0,0.3)",
              }}
            >
              {/* Dashed inner border */}
              <div className="absolute top-6 left-6 right-6 bottom-6 border-2 border-dashed border-[#D2691E] pointer-events-none rounded-lg" />

              {!loading && (
                <button
                  onClick={onClose}
                  className="absolute top-6 left-6 z-10 w-10 h-10 rounded-full bg-[#E67E22] text-white hover:bg-[#D2691E] transition-colors flex items-center justify-center border-2 border-[#8B4513]"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <h2 className="text-2xl font-bold mb-6 text-[#3D2817] text-center">
                🍳 הוסיפו מתכון חדש
              </h2>

              {loading ? (
                <div className="flex flex-col items-center py-8 gap-6">
                  {/* Retro spinning record loader */}
                  <motion.div
                    className="relative"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          "radial-gradient(circle, #8B4513 0%, #8B4513 30%, #D2691E 30%, #D2691E 35%, #8B4513 35%, #8B4513 100%)",
                        border: "3px solid #3D2817",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-[#FFF9E6]" />
                    </div>
                  </motion.div>

                  <p className="text-[#8B7355] font-bold text-lg">
                    {PROCESSING_STAGES[stage]}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="relative z-10">
                  <div className="relative mb-5">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="הדביקו קישור מאינסטגרם, טיקטוק, פייסבוק..."
                      className="retro-input w-full pr-12"
                      dir="ltr"
                      autoFocus
                    />
                    <LinkIcon className="absolute top-1/2 right-4 -translate-y-1/2 w-5 h-5 text-[#8B7355]" />
                  </div>

                  {error && (
                    <div
                      className="mb-5 p-4 rounded-lg text-sm font-bold"
                      style={{
                        background: "#FFE5E5",
                        border: "2px solid #DC2626",
                        color: "#DC2626",
                      }}
                    >
                      ⚠️ {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!url.trim()}
                    className="retro-btn w-full disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    ✨ הוסף מתכון
                  </button>

                  <p className="text-center text-sm text-[#8B7355] mt-4">
                    תומך באינסטגרם, טיקטוק, פייסבוק ויוטיוב
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
