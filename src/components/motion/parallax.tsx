"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useMedia } from "./use-in-view";

/**
 * Pointer parallax (M-4). Only on fine pointers without reduced motion.
 * Moves its content up to `strength` px opposite the cursor, smoothed with rAF.
 */
export function Parallax({ strength = 6, className, children }: { strength?: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useMedia("(pointer: fine)");
  const reduce = useMedia("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const el = ref.current;
    if (!el || !fine || reduce) return;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.05 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = -((e.clientX / window.innerWidth) * 2 - 1) * strength;
      ty = -((e.clientY / window.innerHeight) * 2 - 1) * strength;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [fine, reduce, strength]);

  return (
    <div ref={ref} className={className} style={{ willChange: fine && !reduce ? "transform" : undefined }}>
      {children}
    </div>
  );
}
