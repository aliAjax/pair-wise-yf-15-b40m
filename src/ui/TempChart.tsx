import type { TemperaturePoint } from "../domain/types";
import { fmtTime } from "./format";

interface Props {
  raw: TemperaturePoint[];
  /** 有校准记录时的修正曲线 */
  corrected: TemperaturePoint[] | null;
  /** 未被校准覆盖的点（红色标出） */
  uncovered?: TemperaturePoint[];
}

const W = 680;
const H = 280;
const PAD = 44;

/** 温度记录图：原始曲线（琥珀）与修正曲线（绿）对比，未覆盖点红色标记 */
export default function TempChart({ raw, corrected, uncovered = [] }: Props) {
  if (raw.length === 0) {
    return <p className="empty">暂无温度记录，补录温度点后生成曲线。</p>;
  }

  const all = corrected ? [...raw, ...corrected] : raw;
  const times = all.map((p) => +new Date(p.time));
  const temps = all.map((p) => p.celsius);
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const lo = Math.floor(Math.min(...temps) - 1);
  const hi = Math.ceil(Math.max(...temps) + 1);

  const x = (t: number) => PAD + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (W - 2 * PAD);
  const y = (c: number) => H - PAD - ((c - lo) / (hi - lo || 1)) * (H - 2 * PAD);
  const line = (pts: TemperaturePoint[]) =>
    [...pts]
      .sort((a, b) => +new Date(a.time) - +new Date(b.time))
      .map((p) => `${x(+new Date(p.time))},${y(p.celsius)}`)
      .join(" ");

  const uncoveredKeys = new Set(uncovered.map((p) => p.time));
  const gridRows = 4;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="温度记录图">
        {Array.from({ length: gridRows + 1 }, (_, i) => {
          const c = lo + ((hi - lo) * i) / gridRows;
          return (
            <g key={i}>
              <line x1={PAD} x2={W - PAD} y1={y(c)} y2={y(c)} className="grid" />
              <text x={PAD - 8} y={y(c) + 4} textAnchor="end" className="tick">
                {c.toFixed(0)}℃
              </text>
            </g>
          );
        })}
        <text x={PAD} y={H - 12} className="tick">
          {fmtTime(new Date(t0).toISOString())}
        </text>
        <text x={W - PAD} y={H - 12} textAnchor="end" className="tick">
          {fmtTime(new Date(t1).toISOString())}
        </text>

        <polyline points={line(raw)} className="line raw" />
        {corrected && <polyline points={line(corrected)} className="line corrected" />}

        {raw.map((p) => (
          <circle
            key={p.time}
            cx={x(+new Date(p.time))}
            cy={y(p.celsius)}
            r={uncoveredKeys.has(p.time) ? 5 : 3.5}
            className={uncoveredKeys.has(p.time) ? "dot uncovered" : "dot raw"}
          >
            <title>{`${fmtTime(p.time)} 原始 ${p.celsius}℃${uncoveredKeys.has(p.time) ? "（无校准覆盖）" : ""}`}</title>
          </circle>
        ))}
        {corrected?.map((p) => (
          <circle key={`c-${p.time}`} cx={x(+new Date(p.time))} cy={y(p.celsius)} r={3.5} className="dot corrected">
            <title>{`${fmtTime(p.time)} 修正 ${p.celsius}℃`}</title>
          </circle>
        ))}
      </svg>
      <div className="legend">
        <span><i className="swatch raw" />原始曲线</span>
        {corrected && <span><i className="swatch corrected" />修正曲线</span>}
        {uncovered.length > 0 && <span><i className="swatch uncovered" />未覆盖点（{uncovered.length}）</span>}
      </div>
    </div>
  );
}
