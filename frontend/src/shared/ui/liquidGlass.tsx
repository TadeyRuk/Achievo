/* eslint-disable react-refresh/only-export-components -- shared glass tokens + pill */
import type { CSSProperties, ReactNode } from "react";

/** Shared Liquid Glass material (iOS 26 Regular variant — CSS approximation). */
export const liquidGlassSurface: CSSProperties = {
  background:
    "linear-gradient(155deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.48) 45%, rgba(255,255,255,0.58) 100%)",
  backdropFilter: "blur(48px) saturate(180%)",
  WebkitBackdropFilter: "blur(48px) saturate(180%)",
  boxShadow:
    "0 4px 24px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(255,255,255,0.55), inset 0 0.5px 0 rgba(255,255,255,0.85), inset 0 -0.5px 0 rgba(0,0,0,0.04)",
};

/**
 * Large sheet surfaces need a lighter fill so backdrop-filter can read the app
 * underneath. Pill controls keep `liquidGlassSurface` (refresh-button match).
 */
export const liquidGlassSheet: CSSProperties = {
  background:
    "linear-gradient(165deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.32) 100%)",
  backdropFilter: "blur(48px) saturate(190%)",
  WebkitBackdropFilter: "blur(48px) saturate(190%)",
  boxShadow:
    "0 -8px 40px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(255,255,255,0.5), inset 0 0.5px 0 rgba(255,255,255,0.75)",
};

export const liquidGlassAlert: CSSProperties = {
  ...liquidGlassSurface,
  background:
    "linear-gradient(160deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.72) 100%)",
  boxShadow:
    "0 16px 48px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(255,255,255,0.6), inset 0 0.5px 0 rgba(255,255,255,0.9)",
};

export function LiquidGlassPill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center rounded-full ${className}`}
      style={liquidGlassSurface}
    >
      {children}
    </div>
  );
}
