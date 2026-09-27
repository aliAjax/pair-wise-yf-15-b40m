// 业务规则：温度修正、积温测算、发育阶段估计、待复核判定
import type { Calibration, Revision, Sample, SampleStatus, TempPoint } from "./types";

export const STAGE_FILTERS = ["全部", "卵", "幼虫", "蛹", "成虫", "待复核"];
export const DEV_STAGES = ["卵", "一龄幼虫", "二龄幼虫", "三龄幼虫", "蛹", "成虫"];
export const EXPOSURE_STAGES = ["新鲜期", "肿胀期", "腐败期", "后腐败期", "白骨化期"];
export const PRESERVATIONS = ["70%乙醇", "95%乙醇", "冷藏(4℃)", "冷冻(-20℃)", "干燥保存", "活体饲养"];

// 温度记录允许的最大空档（小时），超过视为关键温度点缺失
export const MAX_GAP_HOURS = 6;

export interface SpeciesProfile {
  baseTemp: number; // 发育下限温度 ℃
  thresholds: { stage: string; adh: number }[]; // 进入各阶段所需有效积温 ℃·h
}

export const SPECIES_PROFILES: Record<string, SpeciesProfile> = {
  丝光绿蝇: {
    baseTemp: 9,
    thresholds: [
      { stage: "卵", adh: 0 },
      { stage: "一龄幼虫", adh: 350 },
      { stage: "二龄幼虫", adh: 750 },
      { stage: "三龄幼虫", adh: 1300 },
      { stage: "蛹", adh: 2800 },
      { stage: "成虫", adh: 5600 },
    ],
  },
  大头金蝇: {
    baseTemp: 10,
    thresholds: [
      { stage: "卵", adh: 0 },
      { stage: "一龄幼虫", adh: 300 },
      { stage: "二龄幼虫", adh: 680 },
      { stage: "三龄幼虫", adh: 1200 },
      { stage: "蛹", adh: 2600 },
      { stage: "成虫", adh: 5200 },
    ],
  },
  家蝇: {
    baseTemp: 10,
    thresholds: [
      { stage: "卵", adh: 0 },
      { stage: "一龄幼虫", adh: 280 },
      { stage: "二龄幼虫", adh: 620 },
      { stage: "三龄幼虫", adh: 1150 },
      { stage: "蛹", adh: 2400 },
      { stage: "成虫", adh: 5000 },
    ],
  },
  白腹皮蠹: {
    baseTemp: 14,
    thresholds: [
      { stage: "卵", adh: 0 },
      { stage: "一龄幼虫", adh: 700 },
      { stage: "二龄幼虫", adh: 1800 },
      { stage: "三龄幼虫", adh: 3600 },
      { stage: "蛹", adh: 7200 },
      { stage: "成虫", adh: 14000 },
    ],
  },
};

export const SPECIES_LIST = Object.keys(SPECIES_PROFILES);

const pad = (n: number) => String(n).padStart(2, "0");

export function localISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDT(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtHM(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function stageCategory(stage: string): string {
  return stage.includes("幼虫") ? "幼虫" : stage;
}

export function sortedPoints(points: TempPoint[]): TempPoint[] {
  return [...points].sort((a, b) => +new Date(a.time) - +new Date(b.time));
}

// 找出超过 MAX_GAP_HOURS 的记录空档
export function findGaps(points: TempPoint[]): { from: string; to: string; hours: number }[] {
  const sorted = sortedPoints(points);
  const gaps: { from: string; to: string; hours: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const hours = (+new Date(sorted[i].time) - +new Date(sorted[i - 1].time)) / 36e5;
    if (hours > MAX_GAP_HOURS) {
      gaps.push({ from: sorted[i - 1].time, to: sorted[i].time, hours: Math.round(hours * 10) / 10 });
    }
  }
  return gaps;
}

// 待复核原因：校准信息缺失 / 关键温度点缺失
export function missingReasons(sample: Sample): string[] {
  const reasons: string[] = [];
  const sorted = sortedPoints(sample.tempPoints);
  if (sorted.length < 2) {
    reasons.push("关键温度点缺失（有效记录不足 2 个）");
  } else {
    const gaps = findGaps(sorted);
    if (gaps.length > 0) {
      reasons.push(`温度记录存在 ${gaps.length} 处超过 ${MAX_GAP_HOURS} 小时的空档`);
    }
  }
  if (sample.calibrations.length === 0) {
    reasons.push("缺少温度计校准记录（校准依据 / 适用时段 / 偏差值）");
  } else if (sorted.length > 0) {
    const uncovered = sorted.filter(
      (p) => !sample.calibrations.some((c) => p.time >= c.appliesFrom && p.time <= c.appliesTo)
    );
    if (uncovered.length > 0) {
      reasons.push(`${uncovered.length} 个温度点不在任何校准适用时段内`);
    }
  }
  return reasons;
}

export function statusOf(sample: Sample): SampleStatus {
  return missingReasons(sample).length > 0 ? "pending_review" : "ready";
}

// 按校准适用时段逐点修正，原始记录保持不变
export function correctPoints(points: TempPoint[], calibrations: Calibration[]): TempPoint[] {
  return sortedPoints(points).map((p) => {
    const cal = calibrations.find((c) => p.time >= c.appliesFrom && p.time <= c.appliesTo);
    const offset = cal ? cal.offsetC : 0;
    return { time: p.time, tempC: Math.round((p.tempC + offset) * 100) / 100 };
  });
}

// 有效积温（℃·h）：相邻点梯形积分，仅累计高于发育下限的部分
export function computeADH(points: TempPoint[], baseTemp: number): number {
  const sorted = sortedPoints(points);
  let adh = 0;
  for (let i = 1; i < sorted.length; i++) {
    const hours = (+new Date(sorted[i].time) - +new Date(sorted[i - 1].time)) / 36e5;
    const avg = (sorted[i].tempC + sorted[i - 1].tempC) / 2;
    adh += Math.max(0, avg - baseTemp) * hours;
  }
  return Math.round(adh * 10) / 10;
}

export function estimateStage(adh: number, species: string): string {
  const profile = SPECIES_PROFILES[species];
  if (!profile) return "未知虫种，无法测算";
  let stage = profile.thresholds[0].stage;
  for (const t of profile.thresholds) {
    if (adh >= t.adh) stage = t.stage;
  }
  return stage;
}

// 生成一次修正快照：修正曲线 + 积温 + 阶段测算
export function buildRevision(sample: Sample, note: string): Revision {
  const points = correctPoints(sample.tempPoints, sample.calibrations);
  const profile = SPECIES_PROFILES[sample.species];
  const adh = computeADH(points, profile ? profile.baseTemp : 10);
  return {
    id: `REV-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    calibrationId: sample.calibrations.length > 0 ? sample.calibrations[sample.calibrations.length - 1].id : null,
    label: `第 ${sample.revisions.length + 1} 次修正`,
    points,
    adh,
    stageEstimate: estimateStage(adh, sample.species),
    note,
  };
}

export function conclusionOf(rev: Revision): string {
  return `测算发育阶段：${rev.stageEstimate}（有效积温 ${rev.adh} ℃·h，${rev.label}）`;
}

// 解析补录的温度记录，每行一条："2026-09-20 08:00, 24.5"
export function parseTempLines(text: string): TempPoint[] {
  const points: TempPoint[] = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})(?::\d{2})?[\s,，]+(-?\d+(?:\.\d+)?)/);
    if (!m) continue;
    points.push({ time: `${m[1]}T${m[2]}`, tempC: Number(m[3]) });
  }
  return sortedPoints(points);
}
