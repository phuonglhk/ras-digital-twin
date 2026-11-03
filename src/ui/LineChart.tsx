/* Biểu đồ đường SVG gọn: trục x theo nhãn (dọc tuyến) hoặc theo thời gian (giờ). */
import { useMemo, useState } from "react";

export interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
  unit?: string;
  limit?: number;
}

interface Props {
  x: (string | number)[];
  series: Series[];
  height?: number;
  xFormat?: (v: string | number) => string;
  yDigits?: number;
  ariaLabel: string;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

export default function LineChart({ x, series, height = 200, xFormat = String, yDigits = 2, ariaLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const pad = { l: 46, r: 12, t: 12, b: 34 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const { yMax, yMin } = useMemo(() => {
    const all = series.flatMap((s) => [...s.values, ...(s.limit != null ? [s.limit] : [])]).filter(Number.isFinite);
    const max = Math.max(...all, 0);
    const min = Math.min(...all);
    const lo = min > 0 && min > max * 0.6 ? Math.floor(min * 0.95 * 10) / 10 : 0;
    return { yMax: niceMax(max * 1.05), yMin: lo };
  }, [series]);

  const n = x.length;
  const px = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const py = (v: number) => pad.t + ih - ((v - yMin) / (yMax - yMin || 1)) * ih;
  const ticks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4);
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={py(t)} y2={py(t)} className="chart-grid" />
            <text x={pad.l - 6} y={py(t)} className="chart-tick" textAnchor="end" dominantBaseline="middle">
              {t.toFixed(yMax < 1 ? 2 : yMax < 10 ? 1 : 0)}
            </text>
          </g>
        ))}
        {x.map((v, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={i} x={px(i)} y={H - pad.b + 16} className="chart-tick" textAnchor="middle">
              {xFormat(v)}
            </text>
          ) : null,
        )}
        {series.map((s) =>
          s.limit != null && s.limit <= yMax ? (
            <g key={s.key + "-lim"}>
              <line
                x1={pad.l}
                x2={W - pad.r}
                y1={py(s.limit)}
                y2={py(s.limit)}
                stroke={s.color}
                strokeDasharray="5 4"
                strokeOpacity={0.55}
              />
              <text x={W - pad.r} y={py(s.limit) - 4} className="chart-tick" textAnchor="end" fill={s.color}>
                ngưỡng {s.label}
              </text>
            </g>
          ) : null,
        )}
        {series.map((s) => {
          const d = s.values.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join("");
          return (
            <g key={s.key}>
              <path d={`${d}L${px(n - 1)},${py(yMin)}L${px(0)},${py(yMin)}Z`} fill={s.color} fillOpacity={0.07} />
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
              {n <= 16 && s.values.map((v, i) => <circle key={i} cx={px(i)} cy={py(v)} r={3} fill={s.color} />)}
              {n > 0 && (
                <circle
                  cx={px(n - 1)}
                  cy={py(s.values[n - 1])}
                  r={4}
                  fill={s.color}
                  stroke="var(--panel)"
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}
        {x.map((_, i) => (
          <rect
            key={i}
            x={px(i) - iw / Math.max(n - 1, 1) / 2}
            y={pad.t}
            width={iw / Math.max(n - 1, 1)}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
        {hover != null && <line x1={px(hover)} x2={px(hover)} y1={pad.t} y2={pad.t + ih} className="chart-cursor" />}
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
            {hover != null && (
              <b>
                {s.values[hover]?.toFixed(yDigits)} {s.unit}
              </b>
            )}
          </span>
        ))}
        {hover != null && <span className="chart-x">{xFormat(x[hover])}</span>}
      </div>
    </div>
  );
}
