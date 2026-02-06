"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Link as LinkIcon, Upload, ImagePlus, Trash2 } from "lucide-react";
import { modalOverlay, modalContent } from "@/lib/motion";
import { useToast } from "@/components/ToastProvider";

type Tab = "url" | "upload";

const URL_PROCESSING_STAGES = [
  "מאתר תוכן...",
  "מעבד וידאו...",
  "מחלץ מתכון...",
  "שומר...",
];

const UPLOAD_PROCESSING_STAGES = [
  "קורא תמונות...",
  "מחלץ מתכון...",
  "שומר...",
];

const MAX_IMAGES = 5;
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/** Resize an image file to max dimension and return base64 JPEG */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
}

export default function AddRecipeModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const { show: showToast } = useToast();

  // Upload state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processingStages = tab === "url" ? URL_PROCESSING_STAGES : UPLOAD_PROCESSING_STAGES;

  // Cycle through processing stages
  useEffect(() => {
    if (!loading) {
      setStage(0);
      return;
    }
    const interval = setInterval(() => {
      setStage((s) => (s < processingStages.length - 1 ? s + 1 : s));
    }, 3000);
    return () => clearInterval(interval);
  }, [loading, processingStages.length]);

  // Close on Escape (only when not loading)
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, loading, onClose]);

  // Generate previews when files change
  useEffect(() => {
    const urls = imageFiles.map((f) => URL.createObjectURL(f));
    setImagePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [imageFiles]);

  const addImages = useCallback((files: FileList | File[]) => {
    const newFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setImageFiles((prev) => {
      const combined = [...prev, ...newFiles];
      return combined.slice(0, MAX_IMAGES);
    });
    setError(null);
  }, []);

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addImages(e.dataTransfer.files);
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
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

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (imageFiles.length === 0) return;

    setError(null);
    setLoading(true);
    setStage(0);

    try {
      // Resize all images in parallel
      const base64Images = await Promise.all(imageFiles.map(resizeImage));

      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images }),
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
      setImageFiles([]);
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

              <h2 className="text-2xl font-bold mb-4 text-[#3D2817] text-center">
                🍳 הוסיפו מתכון חדש
              </h2>

              {/* Tab bar */}
              {!loading && (
                <div className="relative z-10 flex gap-2 mb-5 p-1 rounded-xl bg-[#F0E0C0] border-2 border-[#D2691E]">
                  <button
                    onClick={() => { setTab("url"); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                      tab === "url"
                        ? "bg-[#8B4513] text-white shadow-md"
                        : "text-[#8B7355] hover:text-[#3D2817]"
                    }`}
                  >
                    <LinkIcon className="w-4 h-4" />
                    קישור
                  </button>
                  <button
                    onClick={() => { setTab("upload"); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                      tab === "upload"
                        ? "bg-[#8B4513] text-white shadow-md"
                        : "text-[#8B7355] hover:text-[#3D2817]"
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    תמונה
                  </button>
                </div>
              )}

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
                    {processingStages[stage]}
                  </p>
                </div>
              ) : tab === "url" ? (
                /* URL Tab */
                <form onSubmit={handleUrlSubmit} className="relative z-10">
                  <div className="relative mb-5">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="הדביקו קישור לסרטון או אתר מתכונים..."
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
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!url.trim()}
                    className="retro-btn w-full disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    הוסף מתכון
                  </button>

                  <p className="text-center text-sm text-[#8B7355] mt-4">
                    תומך בכל אתר מתכונים, אינסטגרם, טיקטוק, פייסבוק ויוטיוב
                  </p>
                </form>
              ) : (
                /* Upload Tab */
                <form onSubmit={handleUploadSubmit} className="relative z-10">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) addImages(e.target.files);
                      e.target.value = "";
                    }}
                  />

                  {/* Drop zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`mb-5 rounded-xl border-3 border-dashed p-6 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-[#E67E22] bg-[#FFF0D0] scale-[1.02]"
                        : "border-[#D2B48C] bg-[#FFF5E0] hover:border-[#E67E22] hover:bg-[#FFF0D0]"
                    }`}
                  >
                    <ImagePlus className="w-10 h-10 mx-auto mb-3 text-[#D2691E]" />
                    <p className="text-[#8B7355] font-bold mb-1">
                      גררו תמונות לכאן או לחצו לבחירה
                    </p>
                    <p className="text-sm text-[#B8A080]">
                      עד {MAX_IMAGES} תמונות · צילום מסך של מתכון, תמונות מנה
                    </p>
                  </div>

                  {/* Image previews */}
                  {imagePreviews.length > 0 && (
                    <div className="flex gap-2 mb-5 flex-wrap">
                      {imagePreviews.map((preview, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-[#D2691E] group">
                          <img
                            src={preview}
                            alt={`תמונה ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <Trash2 className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {error && (
                    <div
                      className="mb-5 p-4 rounded-lg text-sm font-bold"
                      style={{
                        background: "#FFE5E5",
                        border: "2px solid #DC2626",
                        color: "#DC2626",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={imageFiles.length === 0}
                    className="retro-btn w-full disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    חלץ מתכון מתמונות
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
