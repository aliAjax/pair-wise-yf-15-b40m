import type { Calibration, Revision, Sample, SampleStatus, TemperaturePoint } from "./types";

/**
 * 发育阶段测算阈值（有效积温 ADH，单位：度·时）。
 * 演示用参考常数，实际鉴定应替换为对应虫种的实验数据。
 */
const STAGE_THRESHOLDS: Record<string, { stage: string; minAdh: number }[]> = {
  丝光绿蝇: [
    { stage: "卵", minAdh: 0 },
    { stage: "一龄幼虫", minAdh: 150 },
    { stage: "二龄幼虫", minAdh: 400 },
    { stage: "三龄幼虫", minAdh: 700 },
    { stage: "蛹", minAdh: 1200 },
    { stage: "成虫", minAdh: 2000 },
  ],
  大头金蝇: [
    { stage: "卵", minAdh: 0 },
    { stage: "一龄幼虫", minAdh: 160 },
    { stage: "二龄幼虫", minAdh: 430 },
    { stage: "三龄幼虫", minAdh: 760 },
    { stage: "蛹", minAdh: 1300 },
    { stage: "成虫", minAdh: 2100 },
  ],
  家蝇: [
    { stage: "卵", minAdh: 0 },
    { stage: "一龄幼虫", minAdh: 140 },
    { stage: "二龄幼虫", minAdh: 380 },
    { stage: "三龄幼虫", minAdh: 660 },
    { stage: "蛹", minAdh: 1100 },
    { stage: "成虫", minAdh: 1900 },
  ],
};

const DEFAULT_THRESHOLDS = [
  { stage: "卵", minAdh: 0 },
  { stage: "一龄幼虫", minAdh: 150 },
  { stage: "二龄幼虫", minAdh: 400 },
  { stage: "三龄幼虫", minAdh: 720 },
  { stage: "蛹", minAdh: 1250 },
  { stage: "成虫", minAdh: 2050 },
];

function thresholdsFor(species: string) {
  return STAGE_THRESHOLDS[species] ?? DEFAULT_THRESHOLDS;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 找到覆盖某个温度点的校准记录；多条覆盖时以最新补录的为准 */
export function calibrationFor(point: TemperaturePoint, calibrations: Calibration[]): Calibration | undefined {
  const t = +new Date(point.time);
  return calibrations
    .filter((c) => t >= +new Date(c.appliesFrom) && t <= +new Date(c.appliesTo))
    .sort((a, b) => +new Date(b.recordedAt) - +new Date(a.recordedAt))[0];
}

/** 修正曲线 = 原始曲线逐点套用适用时段内的偏差值；原始曲线本身不被改动 */
export function correctedSeries(sample: Sample): TemperaturePoint[] {
  return sample.rawSeries.map((p) => {
    const cal = calibrationFor(p, sample.calibrations);
    return { time: p.time, celsius: round1(p.celsius + (cal ? cal.offset : 0)) };
  });
}

/** 不在任何校准适用时段内的温度点 */
export function uncoveredPoints(sample: Sample): TemperaturePoint[] {
  return sample.rawSeries.filter((p) => !calibrationFor(p, sample.calibrations));
}

export interface ReviewIssue {
  kind: "temperature" | "calibration" | "coverage";
  message: string;
}

/** 待复核判定：关键温度点不足、校准信息缺失、或部分时段无校准覆盖 */
export function reviewIssues(sample: Sample): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  if (sample.rawSeries.length < 2) {
    issues.push({ kind: "temperature", message: "关键温度点不足（至少需要 2 个原始温度点）" });
  }
  if (sample.calibrations.length === 0) {
    issues.push({ kind: "calibration", message: "缺少温度计校准依据与偏差值" });
  } else {
    const missing = uncoveredPoints(sample);
    if (missing.length > 0) {
      issues.push({ kind: "coverage", message: `${missing.length} 个温度点不在校准适用时段内` });
    }
  }
  return issues;
}

export function statusOf(sample: Sample): SampleStatus {
  if (reviewIssues(sample).length > 0) return "待复核";
  return sample.revisions.length > 1 ? "已修正" : "已登记";
}

/** 有效积温（度·时）：相邻点梯形积分，低于发育起点温度的部分不计 */
export function accumulatedDegreeHours(series: TemperaturePoint[], baseTemp: number): number {
  const pts = [...series].sort((a, b) => +new Date(a.time) - +new Date(b.time));
  let adh = 0;
  for (let i = 1; i < pts.length; i++) {
    const hours = (+new Date(pts[i].time) - +new Date(pts[i - 1].time)) / 36e5;
    if (hours <= 0) continue;
    const meanExcess = (pts[i].celsius + pts[i - 1].celsius) / 2 - baseTemp;
    adh += Math.max(0, meanExcess) * hours;
  }
  return round1(adh);
}

export function estimateStage(adh: number, species: string): string {
  let stage = thresholdsFor(species)[0].stage;
  for (const row of thresholdsFor(species)) {
    if (adh >= row.minAdh) stage = row.stage;
  }
  return stage;
}

/** 基于当前全部数据生成一条修正快照（调用方负责追加到 revisions） */
export function buildRevision(sample: Sample, reason: string, now: Date = new Date()): Revision {
  const series = correctedSeries(sample);
  const adh = accumulatedDegreeHours(series, sample.baseTemp);
  const stage = estimateStage(adh, sample.species);
  const seq = sample.revisions.length + 1;
  return {
    id: `rev-${sample.id}-${seq}`,
    seq,
    revisedAt: now.toISOString(),
    reason,
    correctedSeries: series,
    adh,
    estimatedStage: stage,
    conclusion: `${stage}（ADH ${adh} 度·时，起点 ${sample.baseTemp}℃）`,
  };
}

/** 当前有效结论：待复核时最近一次结论仍然有效；无修正记录时退回现场观察 */
export function currentConclusion(sample: Sample): { text: string; source: string; stale: boolean } {
  const last = sample.revisions[sample.revisions.length - 1];
  const stale = reviewIssues(sample).length > 0;
  if (last) {
    return { text: last.conclusion, source: `修正 #${last.seq} · ${last.reason}`, stale };
  }
  return { text: `${sample.observedStage}（现场观察）`, source: "登记时现场观察", stale: true };
}

/** 阶段筛选口径：取最近一次测算阶段，无测算时用现场观察阶段 */
export function effectiveStage(sample: Sample): string {
  const last = sample.revisions[sample.revisions.length - 1];
  return last ? last.estimatedStage : sample.observedStage;
}
