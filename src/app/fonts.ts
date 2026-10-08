import localFont from "next/font/local";

/**
 * Display face for headlines, the logo and big numbers: Archivo (SIL OFL, see fonts/ARCHIVO-OFL.txt),
 * cut to one static instance (weight 900, width 75%) and Latin-1 plus a few symbols, about 10 KB.
 * Self-hosted (CSP font-src 'self'). Body text uses the system sans, serif and mono stacks, so the
 * page needs no other font download (LCP budget). The fallback is size-matched, so nothing jumps.
 */
export const archivoDisplay = localFont({
  src: "./fonts/archivo-display.woff2",
  variable: "--font-display-face",
  weight: "900",
  display: "optional",
  adjustFontFallback: "Arial",
});
