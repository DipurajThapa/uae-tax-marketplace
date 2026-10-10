/**
 * Taxdar mark: a radar sweep (finding the right professional) in the brand teal and gold. Decorative.
 * Three stacked layers so the sweep turns as an HTML element on the compositor, not as an SVG shape
 * the main thread has to repaint every frame (the mark is in the header of every page).
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false"><rect width="32" height="32" rx="8" fill="var(--brand)" /></svg>
      <span className="logo-spin">
        <svg viewBox="0 0 32 32" focusable="false"><path d="M16 16 L16 5 A11 11 0 0 1 26.4 12.6 Z" fill="var(--accent)" opacity="0.9" /></svg>
      </span>
      <svg viewBox="0 0 32 32" focusable="false">
        <circle cx="16" cy="16" r="11" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="6.5" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="2.2" fill="#fff" />
      </svg>
    </span>
  );
}
