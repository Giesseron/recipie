"use client";

import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"net" | "arrow" | "shelf" | "text" | "tagline" | "fadeout" | "done">("net");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    if (mediaQuery.matches) {
      // Skip animation, show briefly then complete
      setTimeout(() => {
        setPhase("done");
        onComplete();
      }, 500);
      return;
    }

    // Animation sequence
    const timings = [
      { phase: "arrow" as const, delay: 300 },
      { phase: "shelf" as const, delay: 600 },
      { phase: "text" as const, delay: 900 },
      { phase: "tagline" as const, delay: 1200 },
      { phase: "fadeout" as const, delay: 1800 },
      { phase: "done" as const, delay: 2100 },
    ];

    const timeouts = timings.map(({ phase, delay }) =>
      setTimeout(() => {
        setPhase(phase);
        if (phase === "done") {
          onComplete();
        }
      }, delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [onComplete]);

  if (phase === "done") return null;

  const showAll = prefersReducedMotion;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#F4E4C1] to-[#E8CDA3] transition-opacity duration-300 ${
        phase === "fadeout" ? "opacity-0" : "opacity-100"
      }`}
    >
      <svg
        viewBox="0 0 400 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-80 sm:w-96 h-auto"
      >
        {/* Net Symbol */}
        <g
          className={`transition-opacity duration-300 ${
            showAll || phase !== "net" ? "opacity-100" : "opacity-0"
          }`}
          style={{ opacity: showAll || ["net", "arrow", "shelf", "text", "tagline", "fadeout"].includes(phase) ? 1 : 0 }}
        >
          <circle cx="60" cy="50" r="35" fill="var(--brand-net-blue, #2E86AB)" stroke="var(--brand-deep-blue, #1B4D6E)" strokeWidth="2.5"/>
          <path d="M32 40 Q46 34, 60 40 Q74 46, 88 40" stroke="var(--brand-paper-cream, #FFF8E7)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M32 50 Q46 44, 60 50 Q74 56, 88 50" stroke="var(--brand-paper-cream, #FFF8E7)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M32 60 Q46 54, 60 60 Q74 66, 88 60" stroke="var(--brand-paper-cream, #FFF8E7)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M52 50 L68 42 L68 58 Z" fill="var(--brand-paper-cream, #FFF8E7)" opacity="0.9"/>
        </g>

        {/* Arrow */}
        <g
          className="transition-opacity duration-300"
          style={{ opacity: showAll || ["arrow", "shelf", "text", "tagline", "fadeout"].includes(phase) ? 1 : 0 }}
        >
          <path d="M105 50 L155 50" stroke="var(--brand-golden-arrow, #E8941A)" strokeWidth="5" strokeLinecap="round"/>
          <path d="M145 38 L162 50 L145 62" stroke="var(--brand-golden-arrow, #E8941A)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </g>

        {/* Shelf Symbol */}
        <g
          className="transition-opacity duration-300"
          style={{ opacity: showAll || ["shelf", "text", "tagline", "fadeout"].includes(phase) ? 1 : 0 }}
        >
          <rect x="175" y="12" width="65" height="76" rx="8" fill="var(--brand-shelf-brown, #8B5A2B)" stroke="#5D3A1A" strokeWidth="2.5"/>
          <rect x="185" y="22" width="12" height="52" rx="2" fill="var(--brand-light-wood, #D4A574)"/>
          <rect x="200" y="22" width="12" height="52" rx="2" fill="var(--brand-paper-cream, #FFF8E7)"/>
          <rect x="215" y="22" width="12" height="52" rx="2" fill="var(--brand-golden-arrow, #E8941A)"/>
          <path d="M180 78 L232 78" stroke="#5D3A1A" strokeWidth="2.5"/>
        </g>

        {/* Brand Name */}
        <text
          x="255"
          y="60"
          fontFamily="Heebo, Arial Hebrew, sans-serif"
          fontSize="36"
          fontWeight="900"
          fill="#3D2817"
          direction="rtl"
          className="transition-opacity duration-300"
          style={{ opacity: showAll || ["text", "tagline", "fadeout"].includes(phase) ? 1 : 0 }}
        >
          מהרשת למדף
        </text>
      </svg>

      {/* Tagline */}
      <p
        className="mt-6 text-xl font-medium transition-opacity duration-300"
        style={{
          color: "var(--brand-shelf-brown, #8B5A2B)",
          fontFamily: "Heebo, sans-serif",
          opacity: showAll || ["tagline", "fadeout"].includes(phase) ? 1 : 0,
        }}
      >
        צוד. שמור. בשל.
      </p>
    </div>
  );
}
