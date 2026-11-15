import { getContent } from "@/content/load";
import { resolveTheme } from "@/theme/theme";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Site preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social preview card generated at build time from profile + theme. */
export default function OpenGraphImage() {
  const c = getContent();
  const t = resolveTheme(c.theme).dark;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: t.background, color: t.text }}>
        <div style={{ fontSize: 22, letterSpacing: 4, color: t.accent, textTransform: "uppercase" }}>{c.profile.location ?? ""}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>{c.profile.name}</div>
          <div style={{ marginTop: 28, fontSize: 32, lineHeight: 1.35, color: t.textMuted, maxWidth: 900 }}>{c.profile.intro}</div>
        </div>
        <div style={{ height: 2, width: 160, background: t.accent }} />
      </div>
    ),
    size,
  );
}
