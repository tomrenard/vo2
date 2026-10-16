"use client";

import { useId, useState } from "react";

/**
 * Aerobic share of the energy of an all-out effort of a given length (cumulative, from the start).
 * Gastin PB, Suppiah HT (2026) Sports Med, doi 10.1007/s40279-026-02414-7, table 5 (model fitted to
 * 311 data points from 102 studies; CC BY 4.0). Gastin 2001's older table differs by 0–3 points.
 * ponytail: two bands (aerobic / anaerobic); PCr vs glycolysis split needs its own sourced data.
 */
const AEROBIC: [seconds: number, percent: number][] = [
  [10, 9],
  [15, 14],
  [20, 18],
  [30, 25],
  [45, 34],
  [60, 42],
  [75, 49],
  [90, 54],
  [120, 62],
  [180, 72],
  [240, 78],
];

const MIN = Math.log(10);
const MAX = Math.log(240);
const W = 320;
const H = 180;
const x = (s: number) => ((Math.log(s) - MIN) / (MAX - MIN)) * W;
const y = (p: number) => H - (p / 100) * H;

export function aerobicShare(seconds: number) {
  const s = Math.min(Math.max(seconds, 10), 240);
  const i = AEROBIC.findIndex(([t]) => t >= s);
  const [t1, p1] = AEROBIC[Math.max(i - 1, 0)] as [number, number];
  const [t2, p2] = AEROBIC[i] as [number, number];
  if (t1 === t2) return p2;
  // Straight lines on the log-time axis, as drawn.
  return p1 + ((Math.log(s) - Math.log(t1)) / (Math.log(t2) - Math.log(t1))) * (p2 - p1);
}

const label = (s: number) =>
  s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s / 60} min`;

/** Slide the length of an all-out effort: how much of its energy comes from aerobic metabolism. */
export function EnergySystems({
  caption,
  params,
}: {
  caption: string;
  params?: Record<string, number>;
}) {
  const [seconds, setSeconds] = useState(params?.duration ?? 10);
  const sliderId = useId();
  const aerobic = Math.round(aerobicShare(seconds));
  const line = AEROBIC.map(([s, p]) => `${x(s)},${y(p)}`).join(" ");

  return (
    <figure className="card flex flex-col gap-3">
      <div className="flex items-baseline justify-between font-mono text-sm tabular-nums">
        <span>
          all-out <strong>{label(seconds)}</strong>
        </span>
        <span>
          <span style={{ color: "var(--moderate)" }}>aerobic {aerobic}%</span> ·{" "}
          <span style={{ color: "var(--brand)" }}>anaerobic {100 - aerobic}%</span>
        </span>
      </div>
      <svg
        viewBox={`-28 -8 ${W + 52} ${H + 30}`}
        className="w-full"
        role="img"
        aria-label={`Aerobic share ${aerobic}% for an all-out effort of ${label(seconds)}`}
      >
        <polygon points={`0,0 ${W},0 ${W},${H} 0,${H}`} fill="var(--brand)" opacity="0.18" />
        <polygon points={`0,${H} ${line} ${W},${H}`} fill="var(--moderate)" opacity="0.35" />
        <polyline points={line} fill="none" stroke="var(--moderate)" strokeWidth="2" />
        <line x1="0" x2={W} y1={y(50)} y2={y(50)} stroke="var(--muted)" strokeDasharray="3 4" />
        <line x1={x(seconds)} x2={x(seconds)} y1="0" y2={H} stroke="var(--ink)" strokeWidth="1.5" />
        <circle cx={x(seconds)} cy={y(aerobic)} r="4.5" fill="var(--ink)" />
        {[10, 30, 60, 120, 240].map((s) => (
          <text
            key={s}
            x={x(s)}
            y={H + 16}
            textAnchor="middle"
            fontSize="10"
            fill="var(--muted)"
            className="font-mono"
          >
            {label(s)}
          </text>
        ))}
        {[0, 50, 100].map((p) => (
          <text
            key={p}
            x="-6"
            y={y(p) + 3}
            textAnchor="end"
            fontSize="10"
            fill="var(--muted)"
            className="font-mono"
          >
            {p}%
          </text>
        ))}
      </svg>
      <label htmlFor={sliderId} className="sr-only">
        Effort length
      </label>
      <input
        id={sliderId}
        type="range"
        min={MIN}
        max={MAX}
        step="0.01"
        value={Math.log(seconds)}
        onChange={(event) => setSeconds(Math.round(Math.exp(Number(event.target.value))))}
        className="w-full accent-[var(--brand)]"
      />
      <figcaption className="muted text-sm">
        {caption}
        {caption.includes("Gastin") ? "" : " Data: Gastin & Suppiah 2026."}
      </figcaption>
    </figure>
  );
}
