import { useMemo, useState } from "react";
import "./styles.css";
import type { Calibration, NewSampleInput, Sample, TempPoint } from "./domain/types";
import {
  SPECIES_PROFILES,
  buildRevision,
  conclusionOf,
  correctPoints,
  stageCategory,
  statusOf,
} from "./domain/rules";
import { loadSamples, resetSamples, saveSamples } from "./data/storage";
import TemperatureChart, { type ChartSeries } from "./ui/TemperatureChart";
import SampleForm from "./ui/SampleForm";
import BatchList from "./ui/BatchList";
import CaseBoard from "./ui/CaseBoard";
import DetailCard from "./ui/DetailCard";

type Tab = "batches" | "cases" | "chart" | "detail";

const TABS: { key: Tab; label: string }[] = [
  { key: "batches", label: "批次列表" },
  { key: "cases", label: "案件关联" },
  { key: "chart", label: "温度记录图" },
  { key: "detail", label: "样本详情卡" },
];

function App() {
  const [samples, setSamples] = useState<Sample[]>(loadSamples);
  const [tab, setTab] = useState<Tab>("batches");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState("全部");
  const [caseFilter, setCaseFilter] = useState("全部案件");

  // 统一的数据变更入口：变更即持久化到本机
  function mutate(fn: (draft: Sample[]) => void) {
    setSamples((prev) => {
      const draft = prev.map((s) => ({
        ...s,
        tempPoints: [...s.tempPoints],
        calibrations: [...s.calibrations],
        revisions: [...s.revisions],
      }));
      fn(draft);
      saveSamples(draft);
      return draft;
    });
  }

  const selected = samples.find((s) => s.id === selectedId) ?? samples[0] ?? null;
  const cases = useMemo(() => [...new Set(samples.map((s) => s.caseId))].sort(), [samples]);

  const filtered = useMemo(
    () =>
      samples.filter((s) => {
        if (caseFilter !== "全部案件" && s.caseId !== caseFilter) return false;
        if (stageFilter === "全部") return true;
        if (stageFilter === "待复核") return statusOf(s) === "pending_review";
        return stageCategory(s.devStage) === stageFilter;
      }),
    [samples, stageFilter, caseFilter]
  );

  const metrics = useMemo(() => {
    const pending = samples.filter((s) => statusOf(s) === "pending_review").length;
    const temps = samples.flatMap((s) => correctPoints(s.tempPoints, s.calibrations).map((p) => p.tempC));
    const avg = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : "—";
    const stages = new Set(samples.map((s) => s.devStage)).size;
    return { total: samples.length, avg, stages, pending };
  }, [samples]);

  function addSample(input: NewSampleInput) {
    const sample: Sample = {
      ...input,
      id: `SMP-${Date.now().toString(36).toUpperCase()}`,
      calibrations: [],
      revisions: [],
      conclusion: "",
    };
    if (statusOf(sample) === "ready") {
      const rev = buildRevision(sample, "登记时初始测算");
      sample.revisions = [rev];
      sample.conclusion = conclusionOf(rev);
    } else {
      sample.conclusion = "待复核：校准或温度资料补齐前不出具阶段结论";
    }
    mutate((d) => {
      d.push(sample);
    });
    setSelectedId(sample.id);
    setTab("detail");
  }

  function addCalibration(sampleId: string, input: Omit<Calibration, "id" | "recordedAt">) {
    mutate((d) => {
      const s = d.find((x) => x.id === sampleId);
      if (!s) return;
      s.calibrations.push({
        ...input,
        id: `CAL-${Date.now().toString(36).toUpperCase()}`,
        recordedAt: new Date().toISOString(),
      });
    });
  }

  function addTempPoints(sampleId: string, pts: TempPoint[]) {
    mutate((d) => {
      const s = d.find((x) => x.id === sampleId);
      if (!s) return;
      const known = new Set(s.tempPoints.map((p) => p.time));
      s.tempPoints.push(...pts.filter((p) => !known.has(p.time)));
    });
  }

  // 重算：仅在资料齐全（非待复核）时生成新修正，历史修正全部保留
  function recalc(sampleId: string, note: string) {
    mutate((d) => {
      const s = d.find((x) => x.id === sampleId);
      if (!s || statusOf(s) !== "ready") return;
      const rev = buildRevision(s, note);
      s.revisions.push(rev);
      s.conclusion = conclusionOf(rev);
    });
  }

  function select(id: string, goDetail = true) {
    setSelectedId(id);
    if (goDetail) setTab("detail");
  }

  const chartSeries: ChartSeries[] = selected
    ? [
        { label: "原始记录", points: selected.tempPoints, color: "#94a3b8", dashed: true },
        ...(selected.revisions.length > 0
          ? [{
              label: `最近保存修正（${selected.revisions[selected.revisions.length - 1].label}）`,
              points: selected.revisions[selected.revisions.length - 1].points,
              color: "#a16207",
            }]
          : []),
        ...(selected.calibrations.length > 0
          ? [{
              label: "当前校准预览",
              points: correctPoints(selected.tempPoints, selected.calibrations),
              color: "#365314",
            }]
          : []),
      ]
    : [];

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62003 · 法医昆虫学 · 样本台账</p>
        <h1>法医昆虫学样本记录</h1>
        <span>
          按案件登记采样地点、原始温度、暴露阶段、虫种、发育阶段、采样时刻与保存方式；
          补录校准依据、适用时段和偏差值后生成修正曲线与阶段测算。
          校准信息或关键温度点缺失时样本停在待复核、旧结论保持有效，补齐后重算且每次修正均留痕。
        </span>
      </section>

      <section className="metrics">
        <article><small>样本批次</small><strong>{metrics.total}</strong></article>
        <article><small>平均温度</small><strong>{metrics.avg}{metrics.avg === "—" ? "" : "℃"}</strong></article>
        <article><small>发育阶段</small><strong>{metrics.stages} 类</strong></article>
        <article><small>待复核</small><strong>{metrics.pending}</strong></article>
      </section>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "tab active" : "tab"} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
        <button className="tab reset" onClick={() => { setSamples(resetSamples()); setSelectedId(null); }}>
          重置示例数据
        </button>
      </nav>

      {tab === "batches" && (
        <>
          <BatchList
            samples={filtered}
            cases={cases}
            stageFilter={stageFilter}
            caseFilter={caseFilter}
            selectedId={selected ? selected.id : null}
            onStageFilter={setStageFilter}
            onCaseFilter={setCaseFilter}
            onSelect={(id) => select(id)}
          />
          <SampleForm onAdd={addSample} />
        </>
      )}

      {tab === "cases" && <CaseBoard samples={samples} onSelect={(id) => select(id)} />}

      {tab === "chart" && selected && (
        <section className="panel">
          <div className="heading">
            <div>
              <p>温度记录图</p>
              <h2>{selected.id} · {selected.species}</h2>
            </div>
            <select value={selected.id} onChange={(e) => select(e.target.value, false)}>
              {samples.map((s) => (
                <option key={s.id} value={s.id}>{s.id}（{s.caseId}）</option>
              ))}
            </select>
          </div>
          <TemperatureChart
            series={chartSeries}
            baseTemp={SPECIES_PROFILES[selected.species]?.baseTemp}
          />
          <p className="hint">
            原始记录永不覆盖；修正曲线来自各次修正快照与当前校准预览，便于核对鉴定员修改前后的差异。
          </p>
        </section>
      )}

      {tab === "detail" && selected && (
        <DetailCard
          sample={selected}
          onAddCalibration={addCalibration}
          onAddTempPoints={addTempPoints}
          onRecalc={recalc}
        />
      )}
    </main>
  );
}

export default App;
