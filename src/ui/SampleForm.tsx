import { useState } from "react";
import type { Sample, TemperaturePoint } from "../domain/types";
import { EXPOSURE_STAGES, OBSERVED_STAGES, PRESERVATIONS, SPECIES } from "../domain/vocab";

export type SampleDraft = Omit<Sample, "id" | "revisions">;

interface Props {
  existingCaseNos: string[];
  onSubmit: (draft: SampleDraft) => void;
  onCancel: () => void;
}

/** 解析温度点文本：每行 “时刻, 温度”，支持逗号或空白分隔 */
function parseSeries(text: string): { points: TemperaturePoint[]; errors: string[] } {
  const points: TemperaturePoint[] = [];
  const errors: string[] = [];
  text.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const [timeRaw, tempRaw] = trimmed.split(/[,，\s]+/);
    const time = new Date((timeRaw ?? "").replace(" ", "T"));
    const temp = Number(tempRaw);
    if (Number.isNaN(+time) || !Number.isFinite(temp)) {
      errors.push(`第 ${i + 1} 行格式无效：${trimmed}`);
      return;
    }
    points.push({ time: time.toISOString(), celsius: temp });
  });
  points.sort((a, b) => +new Date(a.time) - +new Date(b.time));
  return { points, errors };
}

/** 样本登记：台账字段 + 原始温度曲线（登记后曲线不可覆盖） */
export default function SampleForm({ existingCaseNos, onSubmit, onCancel }: Props) {
  const [caseNo, setCaseNo] = useState("");
  const [location, setLocation] = useState("");
  const [exposureStage, setExposureStage] = useState(EXPOSURE_STAGES[0]);
  const [species, setSpecies] = useState(SPECIES[0]);
  const [observedStage, setObservedStage] = useState(OBSERVED_STAGES[0]);
  const [sampledAt, setSampledAt] = useState("");
  const [preservation, setPreservation] = useState(PRESERVATIONS[0]);
  const [baseTemp, setBaseTemp] = useState("10");
  const [note, setNote] = useState("");
  const [seriesText, setSeriesText] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const base = Number(baseTemp);
    if (!caseNo.trim()) return setError("请填写案件编号");
    if (!location.trim()) return setError("请填写采样地点");
    if (!sampledAt) return setError("请选择采样时刻");
    if (!Number.isFinite(base)) return setError("发育起点温度需为数值");
    const { points, errors } = parseSeries(seriesText);
    if (errors.length > 0) return setError(errors.join("；"));
    setError("");
    onSubmit({
      caseNo: caseNo.trim().toUpperCase(),
      location: location.trim(),
      exposureStage,
      species,
      observedStage,
      sampledAt: new Date(sampledAt).toISOString(),
      preservation,
      baseTemp: base,
      note: note.trim(),
      rawSeries: points,
      calibrations: [],
    });
  };

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>样本台账</p>
          <h2>登记新样本</h2>
        </div>
        <button onClick={onCancel}>返回列表</button>
      </div>

      <div className="field-grid">
        <label><span>案件编号</span>
          <input value={caseNo} onChange={(e) => setCaseNo(e.target.value)} placeholder="如 CASE-053" list="case-list" />
          <datalist id="case-list">
            {existingCaseNos.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <label><span>采样地点</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="如 室外草地" />
        </label>
        <label><span>暴露阶段</span>
          <select value={exposureStage} onChange={(e) => setExposureStage(e.target.value)}>
            {EXPOSURE_STAGES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label><span>虫种</span>
          <select value={species} onChange={(e) => setSpecies(e.target.value)}>
            {SPECIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label><span>发育阶段（现场观察）</span>
          <select value={observedStage} onChange={(e) => setObservedStage(e.target.value)}>
            {OBSERVED_STAGES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label><span>采样时刻</span>
          <input type="datetime-local" value={sampledAt} onChange={(e) => setSampledAt(e.target.value)} />
        </label>
        <label><span>保存方式</span>
          <select value={preservation} onChange={(e) => setPreservation(e.target.value)}>
            {PRESERVATIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label><span>发育起点温度 ℃</span>
          <input value={baseTemp} onChange={(e) => setBaseTemp(e.target.value)} inputMode="decimal" />
        </label>
        <label className="wide"><span>鉴定备注</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="选填" />
        </label>
        <label className="wide"><span>原始温度点（每行：时刻, 温度℃，登记后不可覆盖）</span>
          <textarea
            rows={5}
            value={seriesText}
            onChange={(e) => setSeriesText(e.target.value)}
            placeholder={"2026-09-26 00:00, 22.5\n2026-09-26 06:00, 21.8"}
          />
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      <p className="hint">登记后立即进行首次测算；校准信息缺失时样本停在待复核，可稍后在详情卡补录。</p>
      <button className="primary" onClick={submit}>登记并测算</button>
    </section>
  );
}
