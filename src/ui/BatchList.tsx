// 批次列表：阶段筛选 + 案件筛选 + 状态一览
import type { Sample } from "../domain/types";
import { STAGE_FILTERS, fmtDT, statusOf } from "../domain/rules";

interface Props {
  samples: Sample[];
  cases: string[];
  stageFilter: string;
  caseFilter: string;
  selectedId: string | null;
  onStageFilter: (f: string) => void;
  onCaseFilter: (f: string) => void;
  onSelect: (id: string) => void;
}

export default function BatchList(props: Props) {
  const { samples, cases, stageFilter, caseFilter, selectedId } = props;
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>批次列表</p>
          <h2>样本台账（{samples.length} 批）</h2>
        </div>
        <select value={caseFilter} onChange={(e) => props.onCaseFilter(e.target.value)}>
          <option>全部案件</option>
          {cases.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="chips">
        {STAGE_FILTERS.map((f) => (
          <button
            key={f}
            className={f === stageFilter ? "chip active" : "chip"}
            onClick={() => props.onStageFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="batch-table">
        <div className="batch-row batch-head">
          <span>批次编号</span><span>案件</span><span>采样地点</span><span>虫种</span>
          <span>发育阶段</span><span>采样时刻</span><span>测算阶段</span><span>状态</span>
        </div>
        {samples.map((s) => {
          const status = statusOf(s);
          const latest = s.revisions[s.revisions.length - 1];
          return (
            <button
              key={s.id}
              className={s.id === selectedId ? "batch-row selected" : "batch-row"}
              onClick={() => props.onSelect(s.id)}
            >
              <span><b>{s.id}</b></span>
              <span>{s.caseId}</span>
              <span>{s.location}</span>
              <span>{s.species}</span>
              <span>{s.devStage}</span>
              <span>{fmtDT(s.sampledAt)}</span>
              <span>{latest ? latest.stageEstimate : "—"}</span>
              <span>
                <i className={status === "ready" ? "badge ok" : "badge pending"}>
                  {status === "ready" ? "已生效" : "待复核"}
                </i>
              </span>
            </button>
          );
        })}
        {samples.length === 0 && <p className="empty">当前筛选条件下没有样本批次。</p>}
      </div>
    </section>
  );
}
