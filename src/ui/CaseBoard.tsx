// 案件关联页：按案件归集样本批次
import type { Sample } from "../domain/types";
import { fmtDT, statusOf } from "../domain/rules";

interface Props {
  samples: Sample[];
  onSelect: (id: string) => void;
}

export default function CaseBoard({ samples, onSelect }: Props) {
  const cases = [...new Set(samples.map((s) => s.caseId))].sort();
  return (
    <section className="case-grid">
      {cases.map((c) => {
        const list = samples.filter((s) => s.caseId === c);
        const pending = list.filter((s) => statusOf(s) === "pending_review").length;
        const species = [...new Set(list.map((s) => s.species))];
        return (
          <article key={c} className="panel case-card">
            <div className="heading">
              <div>
                <p>案件关联</p>
                <h2>{c}</h2>
              </div>
              <i className={pending > 0 ? "badge pending" : "badge ok"}>
                {pending > 0 ? `${pending} 批待复核` : "全部生效"}
              </i>
            </div>
            <p className="case-meta">
              {list.length} 批样本 · 虫种：{species.join("、")}
            </p>
            <div className="case-samples">
              {list.map((s) => (
                <button key={s.id} className="case-sample" onClick={() => onSelect(s.id)}>
                  <b>{s.id}</b>
                  <span>{s.location} · {s.devStage} · {fmtDT(s.sampledAt)}</span>
                  <i className={statusOf(s) === "ready" ? "badge ok" : "badge pending"}>
                    {statusOf(s) === "ready" ? "已生效" : "待复核"}
                  </i>
                </button>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}
