export function WaterRing({
  totalMl,
  targetMl,
  size = 180,
  stroke = 14,
}: {
  totalMl: number;
  targetMl: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = targetMl > 0 ? Math.min(1, totalMl / targetMl) : 0;
  const dash = c * pct;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="fill-none stroke-zinc-200 dark:stroke-zinc-800"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="fill-none stroke-sky-500"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="46%"
        textAnchor="middle"
        className="fill-zinc-900 dark:fill-zinc-100"
        fontSize={size * 0.18}
        fontWeight={600}
      >
        {(totalMl / 1000).toFixed(totalMl >= 1000 ? 2 : 1)}L
      </text>
      <text
        x="50%"
        y="62%"
        textAnchor="middle"
        className="fill-zinc-500"
        fontSize={size * 0.09}
      >
von {(targetMl / 1000).toFixed(1)}L
      </text>
    </svg>
  );
}
