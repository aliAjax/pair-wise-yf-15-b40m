import { useState } from "react";
import {
  correctedSeries,
  currentConclusion,
  reviewIssues,
  statusOf,
  uncoveredPoints,
} from "../domain/rules";
import type { Calibration, Sample, TemperaturePoint } from "../domain/types";
import { fmtTime } from "./format";
import StatusBadge from "./StatusBadge";
import TempChart from "./TempChart";

interface Props {
  sample: Sample;
  onBack: () => void;
  onAddCalibration: (id: string, cal: Calibration) => void;
  onAddTempPoints: (id: string, points: TemperaturePoint[]) => void;
}

/** 样本详情卡：台账字段、温度曲线、校准补录、温度点补录与修正历史 */
export default function DetailCard({ sample, onBack, onAddCalibration, onAddTempPoints }: Props) {
  const issues = reviewIssues(sample);
  const status = statusOf(sample);
  const conclusion = currentConclusion(sample);
  const uncovered = uncoveredPoints(sample);
  const corrected = sample.calibrations.length > 0 ? correctedSeries(sample) : null;

  // 校准补录表单
  const [basis, setBasis] = useState("");
  const [appliesFrom, setAppliesFrom] = useState("");
  const [appliesTo, setAppliesTo] = useState("");
  const [offset, setOffset] = useState("");
  const [calError, setCalError] = useState("");

  // 温度点补录表单（只追加，不覆盖原始曲线）
  const [pointTime, setPointTime] = useState("");
  const [pointTemp, setPointTemp] = useState("");
  const [staged, setStaged] = useState<TemperaturePoint[]>([]);
  const [pointError, setPointError] = useState("");

  const submitCalibration = () => {
    const offsetNum = Number(offset);
    if (!basis.trim()) return setCalError("请填写校准依据（证书编号或比对记录）");
    if (!appliesFrom || !appliesTo) return setCalError("请填写校准适用时段");
    if (+new Date(appliesFrom) >= +new Date(appliesTo)) return setCalError("适用时段起必须早于止");
    if (!Number.isFinite(offsetNum)) return setCalError("请填写数值型偏差值（℃）");
    onAddCalibration(sample.id, {
      id: `cal-${Date.now().toString(36)}`,
      basis: basis.trim(),
      appliesFrom: new Date(appliesFrom).toISOString(),
      appliesTo: new Date(appliesTo).toISOString(),
      offset: offsetNum,
      recordedAt: new Date().toISOString(),
    });
    setBasis(""); setAppliesFrom(""); setAppliesTo(""); setOffset(""); setCalError("");
  };

  const stagePoint = () => {
    const temp = Number(pointTemp);
    if (!pointTime) return setPointError("请选择温度点时刻");
    if (!Number.isFinite(temp)) return setPointError("请填写数值型温度");
    setStaged((prev) => [...prev, { time: new Date(pointTime).toISOString(), celsius: temp }]);
    setPointTime(""); setPointTemp(""); setPointError("");
  };

  const submitPoints = () => {
    if (staged.length === 0) return;
    onAddTempPoints(sample.id, staged);
    setStaged([]);
  };

  return (
    <section className="panel detail">
      <div className="heading">
        <div>
          <p>样本详情卡</p>
          <h2>{sample.id} <StatusBadge status={status} /></h2>
        </div>
        <button onClick={onBack}>返回列表</button>
      </div>

      {issues.length > 0 ? (
        <div className="banner danger">
          <b>待复核：</b>{issues.map((i) => i.message).join("；")}。补齐前以下结论保持有效但不更新。
        </div>
      ) : (
        <div className="banner ok">校准与温度数据齐全，当前结论为最新测算结果。</div>
      )}

      <div className={conclusion.stale ? "conclusion-card stale" : "conclusion-card"}>
        <small>当前有效结论{conclusion.stale ? "（旧结论仍有效）" : ""}</small>
        <strong>{conclusion.text}</strong>
        <span>依据：{conclusion.source}</span>
      </div>

      <div className="info-grid">
        <div><small>案件编号</small><span>{sample.caseNo}</span></div>
        <div><small>采样地点</small><span>{sample.location}</span></div>
        <div><small>暴露阶段</small><span>{sample.exposureStage}</span></div>
        <div><small>虫种</small><span>{sample.species}</span></div>
        <div><small>现场观察阶段</small><span>{sample.observedStage}</span></div>
        <div><small>采样时刻</small><span>{fmtTime(sample.sampledAt)}</span></div>
        <div><small>保存方式</small><span>{sample.preservation}</span></div>
        <div><small>发育起点温度</small><span>{sample.baseTemp}℃</span></div>
        <div className="wide"><small>鉴定备注</small><span>{sample.note || "—"}</span></div>
      </div>

      <h3>温度记录图</h3>
      <TempChart raw={sample.rawSeries} corrected={corrected} uncovered={uncovered} />

      <div className="two-col">
        <div>
          <h3>校准记录（{sample.calibrations.length}）</h3>
          {sample.calibrations.length === 0 && <p className="empty">尚无校准记录，样本保持待复核。</p>}
          <ul className="cal-list">
            {sample.calibrations.map((c) => (
              <li key={c.id}>
                <b>{c.basis}</b>
                <span>适用 {fmtTime(c.appliesFrom)} ~ {fmtTime(c.appliesTo)}</span>
                <span>偏差值 {c.offset > 0 ? "+" : ""}{c.offset}℃ · 补录于 {fmtTime(c.recordedAt)}</span>
              </li>
            ))}
          </ul>

          <div className="sub-form">
            <h4>补录校准</h4>
            <label><span>校准依据</span>
              <input value={basis} onChange={(e) => setBasis(e.target.value)} placeholder="证书编号 / 比对记录" />
            </label>
            <div className="row">
              <label><span>适用时段起</span>
                <input type="datetime-local" value={appliesFrom} onChange={(e) => setAppliesFrom(e.target.value)} />
              </label>
              <label><span>适用时段止</span>
                <input type="datetime-local" value={appliesTo} onChange={(e) => setAppliesTo(e.target.value)} />
              </label>
              <label><span>偏差值 ℃</span>
                <input value={offset} onChange={(e) => setOffset(e.target.value)} placeholder="-1.2" inputMode="decimal" />
              </label>
            </div>
            {calError && <p className="error">{calError}</p>}
            <button className="primary" onClick={submitCalibration}>补录并重算</button>
          </div>
        </div>

        <div>
          <h3>原始温度点（{sample.rawSeries.length}，只增不改）</h3>
          <ul className="point-list">
            {sample.rawSeries.map((p) => (
              <li key={p.time} className={uncovered.some((u) => u.time === p.time) ? "uncovered" : ""}>
                {fmtTime(p.time)} · {p.celsius}℃{uncovered.some((u) => u.time === p.time) ? "（无校准覆盖）" : ""}
              </li>
            ))}
          </ul>

          <div className="sub-form">
            <h4>补录温度点</h4>
            <div className="row">
              <label><span>时刻</span>
                <input type="datetime-local" value={pointTime} onChange={(e) => setPointTime(e.target.value)} />
              </label>
              <label><span>温度 ℃</span>
                <input value={pointTemp} onChange={(e) => setPointTemp(e.target.value)} placeholder="23.5" inputMode="decimal" />
              </label>
              <button onClick={stagePoint}>加入待补录</button>
            </div>
            {pointError && <p className="error">{pointError}</p>}
            {staged.length > 0 && (
              <p className="staged">
                待补录 {staged.length} 个：{staged.map((p) => `${fmtTime(p.time)} ${p.celsius}℃`).join("、")}
              </p>
            )}
            <button className="primary" onClick={submitPoints} disabled={staged.length === 0}>
              补录 {staged.length} 个温度点并重算
            </button>
          </div>
        </div>
      </div>

      <h3>修正历史（{sample.revisions.length}，全部保留）</h3>
      {sample.revisions.length === 0 && <p className="empty">尚无修正记录，当前结论来自现场观察。</p>}
      <ol className="timeline">
        {[...sample.revisions].reverse().map((r) => (
          <li key={r.id} className={r.seq === sample.revisions.length ? "latest" : ""}>
            <b>修正 #{r.seq}</b>
            <span className="reason">{r.reason}</span>
            <span>{fmtTime(r.revisedAt)}</span>
            <span className="conclusion">{r.conclusion}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
