/**
 * Content Security Policy (ENG-15). Scripts run only with the per-request nonce ('strict-dynamic' lets
 * Next's nonce'd loader pull its own chunks); no 'unsafe-inline' for scripts. Styles keep
 * 'unsafe-inline' because React style attributes cannot carry a nonce; that is a far smaller risk.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
}
