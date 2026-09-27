import { currentConclusion, statusOf } from "../domain/rules";
import type { Sample } from "../domain/types";
import StatusBadge from "./StatusBadge";

interface Props {
  samples: Sample[];
  onSelect: (id: string) => void;
}

/** 案件关联页：按案件归组查看样本与结论状态 */
export default function CaseBoard({ samples, onSelect }: Props) {
  const cases = [...new Set(samples.map((s) => s.caseNo))].sort();

  return (
    <section className="case-board">
      {cases.map((caseNo) => {
        const group = samples.filter((s) => s.caseNo === caseNo);
        const pending = group.filter((s) => statusOf(s) === "待复核").length;
        return (
          <article className="panel case-card" key={caseNo}>
            <div className="heading">
              <div>
                <p>案件编号</p>
                <h2>{caseNo}</h2>
              </div>
              <span className={pending > 0 ? "badge danger" : "badge ok"}>
                {pending > 0 ? `${pending} 份待复核` : "全部有效"}
              </span>
            </div>
            <ul className="case-samples">
              {group.map((s) => {
                const conclusion = currentConclusion(s);
                return (
                  <li key={s.id}>
                    <button className="case-sample" onClick={() => onSelect(s.id)}>
                      <b>{s.id}</b>
                      <span>{s.species} · {s.location}</span>
                      <span className="conclusion">{conclusion.text}</span>
                      <StatusBadge status={statusOf(s)} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
