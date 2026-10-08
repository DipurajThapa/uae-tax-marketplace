/** Taxdar mark: a radar sweep (finding the right professional) in the brand teal and gold. Decorative. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="logo-mark">
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <g className="logo-sweep"><path d="M16 16 L16 5 A11 11 0 0 1 26.4 12.6 Z" fill="var(--accent)" opacity="0.9" /></g>
      <circle cx="16" cy="16" r="11" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="2.2" fill="#fff" />
    </svg>
  );
}
