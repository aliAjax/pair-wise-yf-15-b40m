// 样本登记表单：按案件登记采样信息 + 原始温度记录
import { useState } from "react";
import type { NewSampleInput } from "../domain/types";
import { DEV_STAGES, EXPOSURE_STAGES, PRESERVATIONS, SPECIES_LIST, localISO, parseTempLines } from "../domain/rules";

interface Props {
  onAdd: (input: NewSampleInput) => void;
}

const empty = {
  caseId: "",
  location: "",
  exposureStage: EXPOSURE_STAGES[0],
  species: SPECIES_LIST[0],
  devStage: DEV_STAGES[0],
  sampledAt: localISO(new Date()),
  preservation: PRESERVATIONS[0],
  note: "",
};

export default function SampleForm({ onAdd }: Props) {
  const [form, setForm] = useState(empty);
  const [tempText, setTempText] = useState("");
  const [error, setError] = useState("");

  const set = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.caseId.trim() || !form.location.trim()) {
      setError("请填写案件编号和采样地点。");
      return;
    }
    if (tempText.trim() && parseTempLines(tempText).length === 0) {
      setError("温度记录无法解析，请按「2026-09-20 08:00, 24.5」每行一条填写。");
      return;
    }
    onAdd({ ...form, caseId: form.caseId.trim(), location: form.location.trim(), tempPoints: parseTempLines(tempText) });
    setForm(empty);
    setTempText("");
    setError("");
  }

  return (
    <form className="panel form-panel" onSubmit={submit}>
      <div className="heading">
        <div>
          <p>样本台账</p>
          <h2>登记样本批次</h2>
        </div>
        <button type="submit" className="primary">登记入库</button>
      </div>
      <div className="field-grid">
        <label>
          <span>案件编号</span>
          <input value={form.caseId} onChange={set("caseId")} placeholder="如 CASE-064" />
        </label>
        <label>
          <span>采样地点</span>
          <input value={form.location} onChange={set("location")} placeholder="如 室内床底" />
        </label>
        <label>
          <span>暴露阶段</span>
          <select value={form.exposureStage} onChange={set("exposureStage")}>
            {EXPOSURE_STAGES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          <span>虫种</span>
          <select value={form.species} onChange={set("species")}>
            {SPECIES_LIST.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          <span>发育阶段（现场判定）</span>
          <select value={form.devStage} onChange={set("devStage")}>
            {DEV_STAGES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          <span>采样时刻</span>
          <input type="datetime-local" value={form.sampledAt} onChange={set("sampledAt")} />
        </label>
        <label>
          <span>保存方式</span>
          <select value={form.preservation} onChange={set("preservation")}>
            {PRESERVATIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          <span>鉴定备注</span>
          <input value={form.note} onChange={set("note")} placeholder="可稍后补充" />
        </label>
      </div>
      <label className="block">
        <span>原始温度记录（每行一条：日期时间, 温度℃；可留空，后续在详情卡补录）</span>
        <textarea
          rows={3}
          value={tempText}
          onChange={(e) => setTempText(e.target.value)}
          placeholder={"2026-09-26 08:00, 24.5\n2026-09-26 12:00, 25.1"}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
