import type { ThemeTokens } from "@/content/schema";

export type ThemePreset = { id: string; name: string; light: ThemeTokens; dark: ThemeTokens };

/** Silver / Charcoal — the default preset from the requirements (§3). */
export const silverCharcoal: ThemePreset = {
  id: "silver-charcoal",
  name: "Silver / Charcoal",
  light: {
    background: "#F3F4F6",
    surface: "#FFFFFF",
    text: "#171B20",
    textMuted: "#515B69",
    accent: "#245BE5",
    border: "#CBD0D8",
    band: "#24292F",
  },
  dark: {
    background: "#111317",
    surface: "#1B1F26",
    text: "#F1F3F5",
    textMuted: "#ADB5C2",
    accent: "#83A8FF",
    border: "#343B47",
    band: "#20252D",
  },
};

export const PRESETS: Record<string, ThemePreset> = { [silverCharcoal.id]: silverCharcoal };
