"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useActive, useMedia } from "./use-in-view";

export type OrbitNode = {
  /** Starting point on the ellipse, 0–1. */
  at: number;
};

/** A fixed point on the ellipse with a short text label next to it. */
export type OrbitAnchor = { at: number; label: string };

type OrbitProps = {
  /** Ellipse radii and rotation, in the 400×400 viewBox. */
  rx?: number;
  ry?: number;
  tilt?: number;
  nodes?: OrbitNode[];
  anchors?: OrbitAnchor[];
  /** Seconds per revolution (M-3: 20–35s). */
  period?: number;
  className?: string;
  children?: ReactNode;
};

/**
 * Hero orbit (M-2, M-3). A thin ellipse with slowly travelling nodes.
 * - The path draws itself on first paint (CSS).
 * - Nodes move with SVG animateMotion; paused when off-screen, in a hidden tab,
 *   or with prefers-reduced-motion (then they rest at their starting points).
 * - Children render in the centre (the portrait or the portrait-free graph).
 */
export function Orbit({ rx = 180, ry = 120, tilt = -18, nodes = [], anchors = [], period = 28, className, children }: OrbitProps) {
  const ref = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const active = useActive(ref);
  const reduce = useMedia("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const s = svg.current;
    if (!s) return;
    if (active && !reduce) s.unpauseAnimations();
    else s.pauseAnimations();
  }, [active, reduce]);

  // Ellipse as a path so animateMotion can follow it. Starts at the right-most point.
  const d = `M ${200 + rx} 200 A ${rx} ${ry} 0 1 1 ${200 - rx} 200 A ${rx} ${ry} 0 1 1 ${200 + rx} 200`;

  // Position of a fraction along the ellipse, after tilt, in viewBox units.
  const point = (at: number) => {
    const a = 2 * Math.PI * at;
    const x = rx * Math.cos(a);
    const y = ry * Math.sin(a);
    const t = (tilt * Math.PI) / 180;
    // Rounded: server and browser trig can differ in the last digit, which breaks hydration.
    const r = (v: number) => Math.round(v * 100) / 100;
    return { x: r(200 + x * Math.cos(t) - y * Math.sin(t)), y: r(200 + x * Math.sin(t) + y * Math.cos(t)) };
  };

  return (
    <div ref={ref} className={`relative aspect-square ${className ?? ""}`}>
      <svg ref={svg} viewBox="0 0 400 400" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <g transform={`rotate(${tilt} 200 200)`}>
          <path d={d} fill="none" stroke="var(--fg-muted)" strokeOpacity="0.45" strokeWidth="1" pathLength={1} className="orbit-path" />
          {nodes.map((n, i) => (
            <circle key={i} r="3.5" fill="var(--accent)">
              <animateMotion
                dur={`${period}s`}
                repeatCount="indefinite"
                path={d}
                begin={`${-(n.at * period).toFixed(2)}s`}
              />
            </circle>
          ))}
        </g>
        {anchors.map((a) => {
          const p = point(a.at);
          return <circle key={a.label} cx={p.x} cy={p.y} r="3" fill="var(--accent)" />;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
      {anchors.map((a) => {
        const p = point(a.at);
        const left = p.x < 200;
        return (
          <p
            key={a.label}
            className="absolute hidden w-max max-w-[13ch] font-mono text-[11.5px] leading-snug text-fg-muted lg:block"
            style={{
              top: `${(p.y / 4).toFixed(2)}%`,
              ...(left ? { right: `${(100 - p.x / 4).toFixed(2)}%` } : { left: `${(p.x / 4).toFixed(2)}%` }),
              transform: `translate(${left ? "-10px" : "10px"}, ${p.y < 200 ? "-115%" : "15%"})`,
              textAlign: left ? "right" : "left",
            }}
          >
            {a.label}
          </p>
        );
      })}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .orbit-path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: orbit-draw 900ms var(--ease-out) 120ms forwards; }
        }
        @keyframes orbit-draw { to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
}
