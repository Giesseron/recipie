"use client";

import { useEffect, useState } from "react";
import SplashScreen from "./SplashScreen";

const SPLASH_SHOWN_KEY = "mehareshet-splash-shown";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if splash was already shown this session
    const wasShown = sessionStorage.getItem(SPLASH_SHOWN_KEY);
    setShowSplash(!wasShown);
  }, []);

  function handleSplashComplete() {
    sessionStorage.setItem(SPLASH_SHOWN_KEY, "true");
    setShowSplash(false);
  }

  // Still determining if we should show splash
  if (showSplash === null) {
    return null;
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <div style={{ opacity: showSplash ? 0 : 1, transition: "opacity 0.3s" }}>
        {children}
      </div>
    </>
  );
}
