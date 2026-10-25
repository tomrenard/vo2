/** A progress ring: `value` of `goal`, full at the goal. */
export function Ring({ value, goal, size = 28 }: { value: number; goal: number; size?: number }) {
  const r = 10;
  const c = 2 * Math.PI * r;
  const filled = Math.min(value / Math.max(goal, 1), 1);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="-rotate-90">
      <circle cx="12" cy="12" r={r} fill="none" stroke="var(--line)" strokeWidth="3" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke={filled >= 1 ? "var(--right)" : "var(--brand)"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${filled * c} ${c}`}
      />
    </svg>
  );
}
