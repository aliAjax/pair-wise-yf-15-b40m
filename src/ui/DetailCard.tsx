// 样本详情卡：台账字段、温度点、校准补录、修正历史与重算
import { useState } from "react";
import type { Sample, TempPoint } from "../domain/types";
import {
  SPECIES_PROFILES,
  correctPoints,
  fmtDT,
  missingReasons,
  parseTempLines,
  sortedPoints,
  statusOf,
} from "../domain/rules";

interface Props {
  sample: Sample;
  onAddCalibration: (sampleId: string, input: { basis: string; appliesFrom: string; appliesTo: string; offsetC: number }) => void;
  onAddTempPoints: (sampleId: string, pts: TempPoint[]) => void;
  onRecalc: (sampleId: string, note: string) => void;
}

export default function DetailCard({ sample, onAddCalibration, onAddTempPoints, onRecalc }: Props) {
  const status = statusOf(sample);
  const reasons = missingReasons(sample);
  const profile = SPECIES_PROFILES[sample.species];
  const original = sortedPoints(sample.tempPoints);
  const corrected = correctPoints(sample.tempPoints, sample.calibrations);

  const [cal, setCal] = useState({ basis: "", appliesFrom: "", appliesTo: "", offsetC: "" });
  const [calError, setCalError] = useState("");
  const [tempText, setTempText] = useState("");
  const [tempError, setTempError] = useState("");
  const [note, setNote] = useState("");

  function submitCalibration(e: React.FormEvent) {
    e.preventDefault();
    const offset = Number(cal.offsetC);
    if (!cal.basis.trim() || !cal.appliesFrom || !cal.appliesTo || cal.offsetC.trim() === "" || Number.isNaN(offset)) {
      setCalError("请完整填写校准依据、适用时段和偏差值。");
      return;
    }
    if (cal.appliesFrom >= cal.appliesTo) {
      setCalError("适用时段的起点必须早于终点。");
      return;
    }
    onAddCalibration(sample.id, { basis: cal.basis.trim(), appliesFrom: cal.appliesFrom, appliesTo: cal.appliesTo, offsetC: offset });
    setCal({ basis: "", appliesFrom: "", appliesTo: "", offsetC: "" });
    setCalError("");
  }

  function submitTempPoints(e: React.FormEvent) {
    e.preventDefault();
    const pts = parseTempLines(tempText);
    if (pts.length === 0) {
      setTempError("未解析到有效温度点，格式：2026-09-20 08:00, 24.5");
      return;
    }
    onAddTempPoints(sample.id, pts);
    setTempText("");
    setTempError("");
  }

  return (
    <section className="panel detail">
      <div className="heading">
        <div>
          <p>样本详情卡 · {sample.caseId}</p>
          <h2>
            {sample.id}{" "}
            <i className={status === "ready" ? "badge ok" : "badge pending"}>
              {status === "ready" ? "已生效" : "待复核"}
            </i>
          </h2>
        </div>
      </div>

      <div className="detail-grid">
        <div><span>采样地点</span><b>{sample.location}</b></div>
        <div><span>暴露阶段</span><b>{sample.exposureStage}</b></div>
        <div><span>虫种</span><b>{sample.species}{profile ? `（下限 ${profile.baseTemp}℃）` : ""}</b></div>
        <div><span>发育阶段（现场）</span><b>{sample.devStage}</b></div>
        <div><span>采样时刻</span><b>{fmtDT(sample.sampledAt)}</b></div>
        <div><span>保存方式</span><b>{sample.preservation}</b></div>
        <div className="wide"><span>鉴定备注</span><b>{sample.note || "—"}</b></div>
      </div>

      <div className={status === "ready" ? "conclusion" : "conclusion stale"}>
        <span>当前有效结论{status === "pending_review" ? "（待复核期间沿用旧结论）" : ""}</span>
        <p>{sample.conclusion}</p>
      </div>

      {reasons.length > 0 && (
        <div className="notice">
          <b>待复核原因</b>
          <ul>
            {reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <p>补齐校准信息或关键温度点后，在下方「重算」生成新结论；重算前旧结论保持有效。</p>
        </div>
      )}

      <div className="detail-cols">
        <div>
          <h3>温度记录（原始 {sample.tempPoints.length} 点）</h3>
          <div className="temp-table">
            <div className="temp-row temp-head"><span>时刻</span><span>原始℃</span><span>按当前校准℃</span></div>
            {corrected.map((p, i) => (
              <div className="temp-row" key={p.time}>
                <span>{fmtDT(p.time)}</span>
                <span>{original[i] ? original[i].tempC.toFixed(1) : "—"}</span>
                <span>{p.tempC.toFixed(1)}</span>
              </div>
            ))}
            {corrected.length === 0 && <p className="empty">暂无温度记录。</p>}
          </div>
          <form onSubmit={submitTempPoints} className="inline-form">
            <textarea
              rows={2}
              value={tempText}
              onChange={(e) => setTempText(e.target.value)}
              placeholder={"补录温度点，每行一条：\n2026-09-26 12:00, 24.8"}
            />
            <button type="submit">补录温度点</button>
          </form>
          {tempError && <p className="form-error">{tempError}</p>}
        </div>

        <div>
          <h3>校准记录（{sample.calibrations.length}）</h3>
          {sample.calibrations.length === 0 && <p className="empty">尚未补录校准信息。</p>}
          {sample.calibrations.map((c) => (
            <div className="cal-item" key={c.id}>
              <b>{c.basis}</b>
              <span>
                适用 {fmtDT(c.appliesFrom)} ~ {fmtDT(c.appliesTo)} · 偏差 {c.offsetC > 0 ? "+" : ""}{c.offsetC}℃ · 补录于 {fmtDT(c.recordedAt)}
              </span>
            </div>
          ))}
          <form onSubmit={submitCalibration} className="cal-form">
            <label>
              <span>校准依据</span>
              <input value={cal.basis} onChange={(e) => setCal({ ...cal, basis: e.target.value })} placeholder="报告编号 / 比对说明" />
            </label>
            <div className="cal-row">
              <label>
                <span>适用时段起</span>
                <input type="datetime-local" value={cal.appliesFrom} onChange={(e) => setCal({ ...cal, appliesFrom: e.target.value })} />
              </label>
              <label>
                <span>适用时段止</span>
                <input type="datetime-local" value={cal.appliesTo} onChange={(e) => setCal({ ...cal, appliesTo: e.target.value })} />
              </label>
              <label>
                <span>偏差值 ℃</span>
                <input type="number" step="0.1" value={cal.offsetC} onChange={(e) => setCal({ ...cal, offsetC: e.target.value })} placeholder="-1.2" />
              </label>
            </div>
            <button type="submit">补录校准</button>
            {calError && <p className="form-error">{calError}</p>}
            <p className="hint">修正温度 = 原始记录 + 偏差值；补录校准不会改动历史结论，需手动重算。</p>
          </form>
        </div>
      </div>

      <h3>修正历史（{sample.revisions.length} 次，全部保留）</h3>
      <div className="timeline">
        {[...sample.revisions].reverse().map((r) => (
          <div className="timeline-item" key={r.id}>
            <b>{r.label}</b>
            <span>{fmtDT(r.createdAt)} · 有效积温 {r.adh} ℃·h · 测算：{r.stageEstimate}</span>
            <p>{r.note}</p>
          </div>
        ))}
        {sample.revisions.length === 0 && <p className="empty">尚无修正记录。</p>}
      </div>

      <div className="recalc">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="修正说明（如：按 JL-2026-121 报告重算）"
        />
        <button
          className="primary"
          disabled={status !== "ready"}
          title={status !== "ready" ? "校准信息或关键温度点缺失，无法重算" : "按当前校准生成新的修正"}
          onClick={() => { onRecalc(sample.id, note.trim() || "按当前校准重算"); setNote(""); }}
        >
          重算并生成修正
        </button>
      </div>
      {status !== "ready" && (
        <p className="hint">校准信息或关键温度点缺失，样本停在待复核；补齐后才可重算。</p>
      )}
    </section>
  );
}
