import localFont from "next/font/local";

// Self-hosted from @fontsource-variable (SIL OFL 1.1). No request to Google at build or run time.
export const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const jetbrainsMono = localFont({
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-jbmono",
  weight: "100 800",
  display: "swap",
});

/** Used by resume documents that choose the serif style. Only downloaded when used. */
export const sourceSerif = localFont({
  src: "../../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2",
  variable: "--font-serif",
  weight: "200 900",
  display: "swap",
});
