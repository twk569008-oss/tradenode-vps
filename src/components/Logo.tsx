export function Logo({ size = 28, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 align-middle">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
        <path d="M32 4 L58 18 V46 L32 60 L6 46 V18 Z" fill="none" stroke="var(--accent)" strokeWidth="3.5" />
        <circle cx="32" cy="24" r="4.5" fill="var(--accent)" />
        <circle cx="23" cy="41" r="4.5" fill="var(--accent-2)" />
        <circle cx="41" cy="41" r="4.5" fill="var(--accent-2)" />
        <path d="M32 28.5 L23 37" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
        <path d="M32 28.5 L41 37" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {withWordmark && (
        <span className="brand text-lg">
          TradeNode <span className="text-[var(--accent-2)]">VPS</span>
        </span>
      )}
    </span>
  );
}
