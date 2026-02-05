"use client";

import { useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      execute: (id: string) => Promise<string>;
      remove: (id: string) => void;
    };
  }
}

/**
 * Invisible Cloudflare Turnstile widget.
 *
 * Usage:
 *   const { containerRef, execute } = useTurnstile();
 *   <div ref={containerRef} />          // can be anywhere in the tree
 *   const token = await execute();      // call right before the protected action
 *
 * When NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set (local dev) execute() returns
 * null and the server-side check is skipped automatically.
 */
export function useTurnstile() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    function render() {
      if (!window.turnstile || !containerRef.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        appearance: "invisible",
      });
    }

    if (window.turnstile) {
      render();
      return;
    }

    const s = document.createElement("script");
    s.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);

    return () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  const execute = useCallback(async (): Promise<string | null> => {
    if (!siteKey || !widgetId.current || !window.turnstile) return null;
    try {
      return await window.turnstile.execute(widgetId.current);
    } catch {
      return null;
    }
  }, [siteKey]);

  return { containerRef, execute };
}
