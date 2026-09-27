import { useEffect, useMemo, useState } from "react";
import { loadSamples, resetSamples, saveSamples } from "./data/storage";
import { buildRevision, correctedSeries, statusOf } from "./domain/rules";
import type { Calibration, Sample, TemperaturePoint } from "./domain/types";
import BatchList from "./ui/BatchList";
import CaseBoard from "./ui/CaseBoard";
import DetailCard from "./ui/DetailCard";
import SampleForm, { type SampleDraft } from "./ui/SampleForm";
import "./styles.css";

type View = { page: "ledger" } | { page: "cases" } | { page: "register" } | { page: "detail"; id: string };

function App() {
  const [samples, setSamples] = useState<Sample[]>(loadSamples);
  const [view, setView] = useState<View>({ page: "ledger" });

  useEffect(() => {
    saveSamples(samples);
  }, [samples]);

  /**
   * 统一重算入口：任何数据补齐（校准 / 温度点）后追加一条修正快照，
   * 原始曲线与历史结论一律保留；数据仍不齐全时状态自动停在待复核。
   */
  const recalculate = (id: string, reason: string, mutate: (s: Sample) => Sample) => {
    setSamples((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = mutate({ ...s });
        if (next.rawSeries.length >= 2) {
          next.revisions = [...next.revisions, buildRevision(next, reason)];
        }
        return next;
      })
    );
  };

  const addSample = (draft: SampleDraft) => {
    const sameCase = samples.filter((s) => s.caseNo === draft.caseNo).length;
    const id = `${draft.caseNo}-${String.fromCharCode(65 + sameCase)}`;
    const sample: Sample = { ...draft, id, revisions: [] };
    if (sample.rawSeries.length >= 2) {
      sample.revisions = [buildRevision(sample, "登记测算")];
    }
    setSamples((prev) => [sample, ...prev]);
    setView({ page: "detail", id });
  };

  const addCalibration = (id: string, cal: Calibration) =>
    recalculate(id, `补录校准：${cal.basis}`, (s) => ({ ...s, calibrations: [...s.calibrations, cal] }));

  const addTempPoints = (id: string, points: TemperaturePoint[]) =>
    recalculate(id, `补录温度点 ${points.length} 个`, (s) => ({
      ...s,
      rawSeries: [...s.rawSeries, ...points].sort((a, b) => +new Date(a.time) - +new Date(b.time)),
    }));

  const metrics = useMemo(() => {
    const pending = samples.filter((s) => statusOf(s) === "待复核").length;
    const cases = new Set(samples.map((s) => s.caseNo)).size;
    const means = samples
      .filter((s) => s.rawSeries.length > 0)
      .map((s) => {
        const series = s.calibrations.length > 0 ? correctedSeries(s) : s.rawSeries;
        return series.reduce((sum, p) => sum + p.celsius, 0) / series.length;
      });
    const avgTemp = means.length > 0 ? (means.reduce((a, b) => a + b, 0) / means.length).toFixed(1) : "—";
    return { total: samples.length, pending, cases, avgTemp };
  }, [samples]);

  const openDetail = (id: string) => setView({ page: "detail", id });
  const selected = view.page === "detail" ? samples.find((s) => s.id === view.id) ?? null : null;

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62003 · 法医昆虫学 · 本机台账</p>
        <h1>法医昆虫学样本记录</h1>
        <span>
          按案件登记采样地点、原始温度、暴露阶段、虫种、发育阶段、采样时刻与保存方式；
          补录校准依据、适用时段与偏差值后自动生成修正曲线与阶段测算。
          校准信息或关键温度点缺失时样本停在待复核、旧结论仍有效，补齐后重算并保留每次修正。
        </span>
      </section>

      <section className="metrics">
        <article><small>样本批次</small><strong>{metrics.total}</strong></article>
        <article><small>平均温度</small><strong>{metrics.avgTemp}{metrics.avgTemp === "—" ? "" : "℃"}</strong></article>
        <article><small>待复核</small><strong>{metrics.pending}</strong></article>
        <article><small>关联案件</small><strong>{metrics.cases}</strong></article>
      </section>

      <nav className="tabs">
        <button className={view.page === "ledger" ? "active" : ""} onClick={() => setView({ page: "ledger" })}>批次台账</button>
        <button className={view.page === "cases" ? "active" : ""} onClick={() => setView({ page: "cases" })}>案件关联</button>
        <button className={view.page === "register" ? "active" : ""} onClick={() => setView({ page: "register" })}>登记样本</button>
        <button className="ghost" onClick={() => setSamples(resetSamples())}>恢复示例数据</button>
      </nav>

      {view.page === "ledger" && <BatchList samples={samples} onSelect={openDetail} />}
      {view.page === "cases" && <CaseBoard samples={samples} onSelect={openDetail} />}
      {view.page === "register" && (
        <SampleForm
          existingCaseNos={[...new Set(samples.map((s) => s.caseNo))].sort()}
          onSubmit={addSample}
          onCancel={() => setView({ page: "ledger" })}
        />
      )}
      {view.page === "detail" && selected && (
        <DetailCard
          sample={selected}
          onBack={() => setView({ page: "ledger" })}
          onAddCalibration={addCalibration}
          onAddTempPoints={addTempPoints}
        />
      )}
      {view.page === "detail" && !selected && (
        <section className="panel"><p className="empty">样本不存在或已删除。</p></section>
      )}
    </main>
  );
}

export default App;
