/**
 * Original, decorative illustrations (inline SVG: no image requests, no third-party art).
 * Colours come from the theme variables, so they follow light and dark mode.
 * Motion lives in globals.css and is switched off for prefers-reduced-motion.
 */
const brand = { fill: "var(--brand)" };
const accent = { fill: "var(--accent)" };
const ink = { fill: "var(--ink)" };
const paper = { fill: "var(--surface)" };

/** Hero art: a radar scope sweeping a skyline, with blips for matched providers. */
export function RadarScene() {
  return (
    <svg className="radar-scene" viewBox="0 0 480 480" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="radar-clip"><circle cx="240" cy="240" r="208" /></clipPath>
        <linearGradient id="radar-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <circle cx="240" cy="240" r="224" style={ink} />
      <circle cx="240" cy="240" r="208" style={brand} />
      <g clipPath="url(#radar-clip)">
        <g fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="1.5">
          <circle cx="240" cy="240" r="160" /><circle cx="240" cy="240" r="110" /><circle cx="240" cy="240" r="60" />
          <line x1="30" y1="240" x2="450" y2="240" /><line x1="240" y1="30" x2="240" y2="450" />
        </g>
        <g className="radar-sweep"><path d="M240 240 L240 30 A210 210 0 0 1 421.9 135 Z" fill="url(#radar-beam)" /></g>
        <g style={ink}>
          <rect x="40" y="350" width="34" height="110" /><rect x="78" y="322" width="26" height="140" /><rect x="108" y="366" width="40" height="100" />
          <rect x="152" y="300" width="30" height="170" /><rect x="186" y="340" width="24" height="130" />
          <path d="M222 470 L222 300 L230 300 L232 200 L236 120 L240 70 L244 120 L248 200 L250 300 L258 300 L258 470 Z" />
          <rect x="266" y="330" width="34" height="140" /><rect x="304" y="292" width="22" height="180" />
          <path d="M330 470 L330 330 Q352 300 374 330 L374 470 Z" />
          <rect x="380" y="356" width="30" height="110" /><rect x="414" y="380" width="40" height="90" />
        </g>
        {[
          [150, 170, "a"],
          [330, 150, "b"],
          [300, 250, "c"],
          [120, 265, "d"],
        ].map(([x, y, k]) => (
          <g key={k as string}>
            <circle className={`radar-ping radar-ping-${k}`} cx={x} cy={y} r="12" fill="none" stroke="#fff" strokeWidth="3" />
            <circle className="radar-dot" cx={x} cy={y} r="5" style={accent} />
          </g>
        ))}
      </g>
      <circle cx="240" cy="240" r="208" fill="none" stroke="var(--ink)" strokeWidth="6" />
    </svg>
  );
}

/** One icon per registration type, so the three roles are told apart at a glance. */
export function RoleIcon({ kind }: { kind: "agent" | "agency" | "einvoicing" }) {
  return (
    <svg className="role-icon" width="64" height="64" viewBox="0 0 104 104" aria-hidden="true" focusable="false">
      <rect x="6" y="6" width="92" height="92" rx="14" style={{ fill: "var(--accent-soft)" }} stroke="var(--ink)" strokeWidth="3" />
      {kind === "agent" && (
        <>
          <circle cx="46" cy="38" r="13" style={paper} stroke="var(--ink)" strokeWidth="3" />
          <path d="M20 86 C20 64 32 56 46 56 C60 56 72 64 72 86 Z" style={brand} stroke="var(--ink)" strokeWidth="3" />
          <rect x="58" y="58" width="32" height="24" rx="2" style={paper} stroke="var(--ink)" strokeWidth="3" />
          <path d="M65 70 L71 76 L83 63" fill="none" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === "agency" && (
        <>
          <path d="M22 40 L52 22 L82 40 Z" style={brand} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
          <rect x="24" y="40" width="56" height="44" style={paper} stroke="var(--ink)" strokeWidth="3" />
          <rect x="31" y="48" width="8" height="28" style={ink} /><rect x="48" y="48" width="8" height="28" style={ink} /><rect x="65" y="48" width="8" height="28" style={ink} />
          <rect x="18" y="84" width="68" height="8" style={ink} />
        </>
      )}
      {kind === "einvoicing" && (
        <>
          <path d="M18 22 H46 L54 30 V70 H18 Z" style={paper} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
          <path d="M25 40 H46 M25 50 H46 M25 60 H40" stroke="var(--ink)" strokeWidth="3" />
          <path d="M50 34 H78 L86 42 V82 H50 Z" style={brand} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
          <path d="M60 58 L56 62 L60 66 M76 58 L80 62 L76 66 M70 54 L66 70" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

/** Icons for the three "how it works" steps. */
export function StepIcon({ step }: { step: 1 | 2 | 3 }) {
  return (
    <svg className="step-icon" width="56" height="56" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      {step === 1 && (
        <>
          <rect x="12" y="6" width="48" height="60" rx="4" style={paper} stroke="var(--ink)" strokeWidth="3" />
          <path d="M20 22 L24 26 L32 18 M20 38 L24 42 L32 34" fill="none" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M38 22 H52 M38 38 H52" stroke="var(--ink)" strokeWidth="3" />
          <path d="M20 54 H52" stroke="var(--ink)" strokeWidth="3" strokeDasharray="4 4" />
        </>
      )}
      {step === 2 && (
        <>
          <circle cx="36" cy="36" r="30" style={brand} stroke="var(--ink)" strokeWidth="3" />
          <circle cx="36" cy="36" r="18" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" />
          <g className="radar-sweep radar-sweep-small"><path d="M36 36 L36 6 A30 30 0 0 1 62 21 Z" fill="#fff" opacity="0.75" /></g>
          <circle cx="48" cy="26" r="4" style={accent} /><circle cx="26" cy="46" r="4" style={accent} />
        </>
      )}
      {step === 3 && (
        <>
          <rect x="6" y="18" width="60" height="40" rx="4" style={paper} stroke="var(--ink)" strokeWidth="3" />
          <path d="M6 20 L36 42 L66 20" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="58" cy="18" r="10" style={brand} stroke="var(--ink)" strokeWidth="3" />
          <path d="M53 18 L57 22 L63 14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}
