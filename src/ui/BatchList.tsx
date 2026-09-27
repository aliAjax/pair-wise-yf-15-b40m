import { useMemo, useState } from "react";
import { currentConclusion, effectiveStage, statusOf } from "../domain/rules";
import type { Sample } from "../domain/types";
import { STAGE_FILTERS } from "../domain/vocab";
import { fmtTime } from "./format";
import StatusBadge from "./StatusBadge";

interface Props {
  samples: Sample[];
  onSelect: (id: string) => void;
}

/** 批次台账列表：发育阶段筛选 + 案件筛选，共用本机台账数据 */
export default function BatchList({ samples, onSelect }: Props) {
  const [stage, setStage] = useState<string>("全部");
  const [caseNo, setCaseNo] = useState<string>("全部");

  const cases = useMemo(() => [...new Set(samples.map((s) => s.caseNo))].sort(), [samples]);

  const filtered = samples.filter((s) => {
    if (caseNo !== "全部" && s.caseNo !== caseNo) return false;
    if (stage === "全部") return true;
    if (stage === "待复核") return statusOf(s) === "待复核";
    return effectiveStage(s).includes(stage);
  });

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>样本台账</p>
          <h2>批次列表（{filtered.length}/{samples.length}）</h2>
        </div>
        <select value={caseNo} onChange={(e) => setCaseNo(e.target.value)} aria-label="按案件筛选">
          <option value="全部">全部案件</option>
          {cases.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="chips">
        {["全部", ...STAGE_FILTERS, "待复核"].map((f) => (
          <button key={f} className={stage === f ? "chip active" : "chip"} onClick={() => setStage(f)}>
            {f}
          </button>
        ))}
      </div>

      <table className="ledger">
        <thead>
          <tr>
            <th>样本编号</th>
            <th>案件</th>
            <th>采样地点</th>
            <th>虫种</th>
            <th>当前有效阶段</th>
            <th>状态</th>
            <th>修正次数</th>
            <th>采样时刻</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => {
            const conclusion = currentConclusion(s);
            return (
              <tr key={s.id} onClick={() => onSelect(s.id)}>
                <td><b>{s.id}</b></td>
                <td>{s.caseNo}</td>
                <td>{s.location}</td>
                <td>{s.species}</td>
                <td>
                  {effectiveStage(s)}
                  {conclusion.stale && <em className="stale">（待复核，旧结论有效）</em>}
                </td>
                <td><StatusBadge status={statusOf(s)} /></td>
                <td>{s.revisions.length}</td>
                <td>{fmtTime(s.sampledAt)}</td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={8} className="empty">没有符合筛选条件的样本</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
