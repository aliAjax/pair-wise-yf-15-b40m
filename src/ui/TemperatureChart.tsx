// 温度记录图：原始曲线与各次修正曲线对比（纯 SVG，无外部依赖）
import type { TempPoint } from "../domain/types";
import { fmtHM } from "../domain/rules";

export interface ChartSeries {
  label: string;
  points: TempPoint[];
  color: string;
  dashed?: boolean;
}

interface Props {
  series: ChartSeries[];
  baseTemp?: number; // 发育下限温度参考线
}

const W = 760;
const H = 280;
const PAD = { l: 46, r: 16, t: 16, b: 36 };

export default function TemperatureChart({ series, baseTemp }: Props) {
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) {
    return <p className="empty">暂无温度记录，请先在详情卡中补录温度点。</p>;
  }

  const times = all.map((p) => +new Date(p.time));
  const temps = all.map((p) => p.tempC);
  if (baseTemp !== undefined) temps.push(baseTemp);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const minY = Math.floor(Math.min(...temps) - 1);
  const maxY = Math.ceil(Math.max(...temps) + 1);

  const x = (t: number) =>
    PAD.l + (maxT === minT ? 0.5 : (t - minT) / (maxT - minT)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - minY) / (maxY - minY || 1)) * (H - PAD.t - PAD.b);

  const path = (pts: TempPoint[]) =>
    pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(+new Date(p.time)).toFixed(1)},${y(p.tempC).toFixed(1)}`)
      .join(" ");

  const yTicks = Array.from({ length: 5 }, (_, i) => minY + ((maxY - minY) * i) / 4);
  const xTicks = Array.from({ length: 5 }, (_, i) => minT + ((maxT - minT) * i) / 4);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="温度记录图">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {v.toFixed(0)}℃
            </text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <text
            key={i}
            x={x(t)}
            y={H - 10}
            textAnchor="middle"
            fontSize="11"
            fill="#64748b"
          >
            {fmtHM(new Date(t).toISOString())}
          </text>
        ))}
        {baseTemp !== undefined && baseTemp >= minY && baseTemp <= maxY && (
          <g>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(baseTemp)}
              y2={y(baseTemp)}
              stroke="#dc2626"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
            <text x={W - PAD.r} y={y(baseTemp) - 5} textAnchor="end" fontSize="11" fill="#dc2626">
              发育下限 {baseTemp}℃
            </text>
          </g>
        )}
        {series.map((s) =>
          s.points.length === 1 ? (
            <circle
              key={s.label}
              cx={x(+new Date(s.points[0].time))}
              cy={y(s.points[0].tempC)}
              r="4"
              fill={s.color}
            />
          ) : (
            <path
              key={s.label}
              d={path(s.points)}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeDasharray={s.dashed ? "6 4" : undefined}
            />
          )
        )}
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.label}>
            <i style={{ background: s.color }} />
            {s.label}（{s.points.length} 点）
          </span>
        ))}
      </div>
    </div>
  );
}
