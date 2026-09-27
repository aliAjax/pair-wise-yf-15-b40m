// 示例数据：覆盖「已生效 / 待复核（缺校准、缺温度点、校准时段不覆盖）」等典型状态
import type { Calibration, Sample, TempPoint } from "./types";
import { buildRevision, conclusionOf, localISO } from "./rules";

function series(start: string, count: number, stepHours: number, fn: (i: number) => number): TempPoint[] {
  const t0 = +new Date(start);
  return Array.from({ length: count }, (_, i) => ({
    time: localISO(new Date(t0 + i * stepHours * 36e5)),
    tempC: Math.round(fn(i) * 10) / 10,
  }));
}

function makeSample(partial: Omit<Sample, "calibrations" | "revisions" | "conclusion">): Sample {
  return { ...partial, calibrations: [], revisions: [], conclusion: "" };
}

export function seedSamples(): Sample[] {
  // CASE-042-A：登记后初始测算，送检发现温度计偏高 1.2℃，补录校准并重算 —— 已生效
  const s1 = makeSample({
    id: "SMP-042A",
    caseId: "CASE-042",
    location: "城郊废弃厂房外草地",
    exposureStage: "肿胀期",
    species: "丝光绿蝇",
    devStage: "三龄幼虫",
    sampledAt: "2026-09-24T10:30",
    preservation: "70%乙醇",
    note: "尸表蛆虫密集，取优势种；环境温度记录仪同步回收。",
    tempPoints: series("2026-09-20T08:00", 25, 4, (i) => 26 + 3 * Math.sin(i / 4)),
  });
  const s1rev1 = buildRevision({ ...s1, calibrations: [] }, "登记时初始测算（温度计未校准）");
  const cal1: Calibration = {
    id: "CAL-042A-1",
    basis: "省计量科学研究院温度计比对报告 JL-2026-118（送检后发现偏高 1.2℃）",
    appliesFrom: "2026-09-01T00:00",
    appliesTo: "2026-09-30T23:59",
    offsetC: -1.2,
    recordedAt: "2026-09-25T09:00",
  };
  s1.calibrations = [cal1];
  s1.revisions = [s1rev1];
  const s1rev2 = buildRevision(s1, "按 JL-2026-118 报告整体下修 1.2℃ 后重算");
  s1.revisions = [s1rev1, s1rev2];
  s1.conclusion = conclusionOf(s1rev2);

  // CASE-042-B：温度记录有大段空档且无校准 —— 待复核，沿用现场初步结论
  const s2 = makeSample({
    id: "SMP-042B",
    caseId: "CASE-042",
    location: "厂房背阴墙角",
    exposureStage: "腐败期",
    species: "大头金蝇",
    devStage: "蛹",
    sampledAt: "2026-09-24T11:10",
    preservation: "95%乙醇",
    note: "蛹壳与活蛹并存，需复核种属；记录仪中途断电。",
    tempPoints: [
      { time: "2026-09-21T09:00", tempC: 26.1 },
      { time: "2026-09-21T13:00", tempC: 27.0 },
      { time: "2026-09-23T20:00", tempC: 22.4 },
      { time: "2026-09-24T08:00", tempC: 23.1 },
    ],
  });
  s2.conclusion = "初步估计：蛹（基于现场单次测温 26.1℃，未经积温测算，待复核）";

  // CASE-051-A：资料齐全，一次修正后生效
  const s3 = makeSample({
    id: "SMP-051A",
    caseId: "CASE-051",
    location: "河道排水沟边缘",
    exposureStage: "后腐败期",
    species: "家蝇",
    devStage: "蛹",
    sampledAt: "2026-09-22T09:40",
    preservation: "活体饲养",
    note: "蛹体完整，留样继续饲养观察羽化。",
    tempPoints: series("2026-09-13T06:00", 37, 6, (i) => 25.5 + 2.5 * Math.sin(i / 5)),
  });
  s3.calibrations = [
    {
      id: "CAL-051A-1",
      basis: "所内标准温度计三点比对记录 DB-2026-073（偏低 0.8℃）",
      appliesFrom: "2026-09-01T00:00",
      appliesTo: "2026-09-30T23:59",
      offsetC: 0.8,
      recordedAt: "2026-09-23T10:00",
    },
  ];
  const s3rev1 = buildRevision(s3, "按 DB-2026-073 比对记录上修 0.8℃ 后测算");
  s3.revisions = [s3rev1];
  s3.conclusion = conclusionOf(s3rev1);

  // CASE-063-A：校准适用时段只覆盖前半程 —— 待复核，旧结论保留
  const s4 = makeSample({
    id: "SMP-063A",
    caseId: "CASE-063",
    location: "室内地板缝隙",
    exposureStage: "新鲜期",
    species: "丝光绿蝇",
    devStage: "一龄幼虫",
    sampledAt: "2026-09-26T08:20",
    preservation: "冷藏(4℃)",
    note: "幼虫体积小，已拍照测量；记录仪 9-25 起更换备用机。",
    tempPoints: series("2026-09-24T06:00", 13, 4, (i) => 23 + 2 * Math.sin(i / 3)),
  });
  const s4rev1 = buildRevision({ ...s4, calibrations: [] }, "登记时初始测算（备用记录仪未校准）");
  s4.calibrations = [
    {
      id: "CAL-063A-1",
      basis: "主机送校报告 JL-2026-121（偏高 0.6℃）",
      appliesFrom: "2026-09-22T00:00",
      appliesTo: "2026-09-25T00:00",
      offsetC: -0.6,
      recordedAt: "2026-09-26T14:00",
    },
  ];
  s4.revisions = [s4rev1];
  s4.conclusion = conclusionOf(s4rev1);

  // CASE-063-B：只有一个温度点 —— 待复核
  const s5 = makeSample({
    id: "SMP-063B",
    caseId: "CASE-063",
    location: "地下室角落",
    exposureStage: "白骨化期",
    species: "白腹皮蠹",
    devStage: "卵",
    sampledAt: "2026-09-26T09:05",
    preservation: "干燥保存",
    note: "卵粒附着于残余组织，数量少。",
    tempPoints: [{ time: "2026-09-26T08:00", tempC: 21.3 }],
  });
  s5.conclusion = "暂无有效结论：关键温度点缺失";

  return [s1, s2, s3, s4, s5];
}
