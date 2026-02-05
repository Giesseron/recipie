"use client";

interface LogoProps {
  variant?: "full" | "icon";
  className?: string;
}

export default function Logo({ variant = "full", className = "" }: LogoProps) {
  if (variant === "icon") {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="מהרשת למדף"
      >
        {/* Net waves */}
        <path d="M8 24 Q16 20, 24 24" stroke="var(--brand-net-blue, #2E86AB)" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M8 32 Q16 28, 24 32" stroke="var(--brand-net-blue, #2E86AB)" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M8 40 Q16 36, 24 40" stroke="var(--brand-net-blue, #2E86AB)" strokeWidth="3" fill="none" strokeLinecap="round"/>

        {/* Arrow */}
        <path d="M26 32 L34 32 L30 28 M34 32 L30 36" stroke="var(--brand-golden-arrow, #E8941A)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>

        {/* Shelf */}
        <rect x="38" y="20" width="20" height="24" rx="3" fill="var(--brand-shelf-brown, #8B5A2B)" stroke="#5D3A1A" strokeWidth="2"/>
        <rect x="42" y="24" width="4" height="16" rx="1" fill="var(--brand-light-wood, #D4A574)"/>
        <rect x="48" y="24" width="4" height="16" rx="1" fill="var(--brand-paper-cream, #FFF8E7)"/>
        <path d="M40 44 L56 44" stroke="#5D3A1A" strokeWidth="1.5"/>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 400 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="מהרשת למדף"
    >
      {/* Net Symbol */}
      <g>
        <circle cx="35" cy="40" r="28" fill="var(--brand-net-blue, #2E86AB)" stroke="var(--brand-deep-blue, #1B4D6E)" strokeWidth="2"/>
        <path d="M15 32 Q25 28, 35 32 Q45 36, 55 32" stroke="var(--brand-paper-cream, #FFF8E7)" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M15 40 Q25 36, 35 40 Q45 44, 55 40" stroke="var(--brand-paper-cream, #FFF8E7)" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M15 48 Q25 44, 35 48 Q45 52, 55 48" stroke="var(--brand-paper-cream, #FFF8E7)" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M30 40 L40 35 L40 45 Z" fill="var(--brand-paper-cream, #FFF8E7)" opacity="0.8"/>
      </g>

      {/* Arrow */}
      <g>
        <path d="M70 40 L110 40" stroke="var(--brand-golden-arrow, #E8941A)" strokeWidth="4" strokeLinecap="round"/>
        <path d="M102 32 L114 40 L102 48" stroke="var(--brand-golden-arrow, #E8941A)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </g>

      {/* Shelf Symbol */}
      <g>
        <rect x="125" y="15" width="50" height="50" rx="6" fill="var(--brand-shelf-brown, #8B5A2B)" stroke="#5D3A1A" strokeWidth="2"/>
        <rect x="132" y="22" width="8" height="36" rx="1" fill="var(--brand-light-wood, #D4A574)"/>
        <rect x="143" y="22" width="8" height="36" rx="1" fill="var(--brand-paper-cream, #FFF8E7)"/>
        <rect x="154" y="22" width="8" height="36" rx="1" fill="var(--brand-golden-arrow, #E8941A)"/>
        <path d="M128 58 L167 58" stroke="#5D3A1A" strokeWidth="2"/>
      </g>

      {/* Hebrew Text */}
      <text x="190" y="50" fontFamily="Heebo, Arial Hebrew, sans-serif" fontSize="28" fontWeight="900" fill="#3D2817" direction="rtl">
        מהרשת למדף
      </text>
    </svg>
  );
}
