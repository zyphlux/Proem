/**
 * Abstract preview for projects without a screenshot (§2.3). Always labelled "Concept";
 * it contains no numbers or data, so it cannot be mistaken for real results.
 * The variant is picked deterministically from the slug.
 */
function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function rand(seed: number) {
  let x = seed || 1;
  return () => ((x = Math.imul(x ^ (x >>> 15), 2246822507) ^ Math.imul(x ^ (x >>> 13), 3266489909)), (x >>> 0) / 4294967296);
}

export function ProjectPreview({ slug, kind }: { slug: string; kind?: "graph" | "dashboard" }) {
  const h = hash(slug);
  const r = rand(h);
  const variant = kind ?? (h % 2 === 0 ? "graph" : "dashboard");
  return variant === "graph" ? <GraphPreview r={r} /> : <PanelPreview r={r} />;
}

function GraphPreview({ r }: { r: () => number }) {
  const q = (v: number) => Math.round(v * 10) / 10;
  const pts = Array.from({ length: 11 }, () => ({ x: q(20 + r() * 280), y: q(18 + r() * 154) }));
  const hub = { x: 160, y: 95 };
  const edges: [number, number][] = [];
  pts.forEach((_, i) => {
    const j = (i + 1 + Math.floor(r() * 3)) % pts.length;
    edges.push([i, j]);
  });
  return (
    <svg viewBox="0 0 320 190" className="h-full w-full" aria-hidden="true">
      <g stroke="var(--fg-muted)" strokeWidth="0.8" opacity="0.6">
        {edges.map(([a, b], i) => (
          <line key={i} x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y} />
        ))}
        {pts.slice(0, 4).map((p, i) => (
          <line key={`h${i}`} x1={hub.x} y1={hub.y} x2={p.x} y2={p.y} />
        ))}
      </g>
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i % 3 === 0 ? 4 : 3} fill={i % 3 === 0 ? "var(--accent)" : "var(--fg-muted)"} />
      ))}
      <circle cx={hub.x} cy={hub.y} r="9" fill="var(--accent)" />
    </svg>
  );
}

function PanelPreview({ r }: { r: () => number }) {
  const n = 9;
  const ys = Array.from({ length: n }, () => Math.round(30 + r() * 40));
  const d = ys.map((y, i) => `${i ? "L" : "M"} ${96 + (i * 200) / (n - 1)} ${y + 24}`).join(" ");
  return (
    <svg viewBox="0 0 320 190" className="h-full w-full" aria-hidden="true">
      <rect x="14" y="16" width="56" height="5" rx="2.5" fill="var(--fg-muted)" opacity="0.6" />
      {[34, 48, 62, 76].map((y) => (
        <rect key={y} x="14" y={y} width={30 + (y % 20)} height="4" rx="2" fill="var(--fg-muted)" opacity="0.35" />
      ))}
      <rect x="86" y="16" width="70" height="5" rx="2.5" fill="var(--fg-muted)" opacity="0.6" />
      <rect x="86" y="30" width="220" height="90" rx="6" fill="var(--fg-muted)" opacity="0.08" />
      <path d={`${d} L 296 114 L 96 114 Z`} fill="var(--accent)" opacity="0.12" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="86" y="132" width="104" height="40" rx="6" fill="var(--fg-muted)" opacity="0.1" />
      <rect x="202" y="132" width="104" height="40" rx="6" fill="var(--fg-muted)" opacity="0.1" />
      <rect x="96" y="144" width="50" height="4" rx="2" fill="var(--fg-muted)" opacity="0.4" />
      <rect x="212" y="144" width="50" height="4" rx="2" fill="var(--fg-muted)" opacity="0.4" />
    </svg>
  );
}
