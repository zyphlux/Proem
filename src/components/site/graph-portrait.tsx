/**
 * Portrait-free hero composition (§2.0). A small graph: the owner in the centre,
 * projects on the inner ring, publications on the outer ring, with edges for real
 * relations. Purely decorative — it never pretends to be a photo.
 */
type Props = {
  projects: { id: string; publications: string[] }[];
  publications: { id: string }[];
};

const W = 200;
const H = 250;
const CX = W / 2;
const CY = H / 2;

function ring(n: number, r: number, offset: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = offset + (i / Math.max(n, 1)) * Math.PI * 2;
    return { x: Math.round((CX + r * Math.cos(a)) * 100) / 100, y: Math.round((CY + r * 1.15 * Math.sin(a)) * 100) / 100 };
  });
}

export function GraphPortrait({ projects, publications }: Props) {
  const p = ring(projects.length, 46, -Math.PI / 2 + 0.35);
  const q = ring(publications.length, 82, -Math.PI / 2 - 0.4);
  const pubIndex = new Map(publications.map((x, i) => [x.id, i]));
  const linked = new Set(projects.flatMap((x) => x.publications));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="gp-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" fill="var(--fg-muted)" opacity="0.25" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#gp-dots)" />

      <g stroke="var(--fg-muted)" strokeWidth="0.7" opacity="0.55">
        {p.map((pt, i) => (
          <line key={`c-p${i}`} x1={CX} y1={CY} x2={pt.x} y2={pt.y} />
        ))}
        {projects.flatMap((proj, i) =>
          proj.publications
            .filter((id) => pubIndex.has(id))
            .map((id) => {
              const t = q[pubIndex.get(id)!];
              return <line key={`p${i}-${id}`} x1={p[i].x} y1={p[i].y} x2={t.x} y2={t.y} />;
            }),
        )}
        {publications.map((pub, i) =>
          linked.has(pub.id) ? null : (
            <line key={`c-q${i}`} x1={CX} y1={CY} x2={q[i].x} y2={q[i].y} strokeDasharray="2 3" />
          ),
        )}
      </g>

      {q.map((pt, i) => (
        <circle key={`q${i}`} cx={pt.x} cy={pt.y} r="4" fill="var(--surface)" stroke="var(--fg-muted)" strokeWidth="1" />
      ))}
      {p.map((pt, i) => (
        <circle key={`p${i}`} cx={pt.x} cy={pt.y} r="5" fill="var(--fg)" />
      ))}
      <circle cx={CX} cy={CY} r="13" fill="var(--accent)" opacity="0.14" />
      <circle cx={CX} cy={CY} r="7" fill="var(--accent)" />
    </svg>
  );
}
