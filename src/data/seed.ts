import { buildRevision } from "../domain/rules";
import type { Calibration, Sample, TemperaturePoint } from "../domain/types";

/** 从起始时刻按固定间隔生成温度点 */
function series(start: string, stepHours: number, temps: number[]): TemperaturePoint[] {
  const t0 = +new Date(start);
  return temps.map((c, i) => ({ time: new Date(t0 + i * stepHours * 36e5).toISOString(), celsius: c }));
}

function calibration(partial: Omit<Calibration, "id" | "recordedAt"> & { recordedAt: string }): Calibration {
  return { id: `cal-${partial.basis}`, ...partial };
}

/**
 * 种子台账：覆盖三种典型状态——
 * 已修正（校准补齐并重算）、待复核（缺校准 / 校准时段未全覆盖 / 温度点不足）、已登记。
 */
export function seedSamples(): Sample[] {
  // CASE-042-A：登记后补录校准，结论从三龄幼虫修正为二龄幼虫
  const aBase: Sample = {
    id: "CASE-042-A",
    caseNo: "CASE-042",
    location: "城郊草地",
    exposureStage: "肿胀期",
    species: "丝光绿蝇",
    observedStage: "三龄幼虫",
    sampledAt: new Date("2026-09-24T10:00:00").toISOString(),
    preservation: "80%乙醇",
    baseTemp: 10,
    note: "送检后发现温度计超期未校，补录计量院证书。",
    rawSeries: series("2026-09-22T00:00:00", 6, [21.5, 20.8, 26.4, 25.1, 22.3, 21.0, 27.8, 26.2, 22.9, 21.6]),
    calibrations: [],
    revisions: [],
  };
  aBase.revisions = [buildRevision(aBase, "登记测算", new Date("2026-09-24T10:20:00"))];
  const aCal = calibration({
    basis: "JL-2026-0918 计量院校准证书",
    appliesFrom: new Date("2026-09-20T00:00:00").toISOString(),
    appliesTo: new Date("2026-09-26T00:00:00").toISOString(),
    offset: -1.2,
    recordedAt: new Date("2026-09-25T09:00:00").toISOString(),
  });
  const a: Sample = { ...aBase, calibrations: [aCal] };
  a.revisions = [...aBase.revisions, buildRevision(a, "补录校准：JL-2026-0918 计量院校准证书", new Date("2026-09-25T09:10:00"))];

  // CASE-042-B：无校准记录，停在待复核，登记测算结论仍有效
  const b: Sample = {
    id: "CASE-042-B",
    caseNo: "CASE-042",
    location: "尸体阴影区域",
    exposureStage: "肿胀期",
    species: "大头金蝇",
    observedStage: "蛹",
    sampledAt: new Date("2026-09-24T10:30:00").toISOString(),
    preservation: "75%乙醇",
    baseTemp: 11,
    note: "需复核种属；温度计读数与测算阶段不符，等待校准证书。",
    rawSeries: series("2026-09-22T06:00:00", 6, [25.2, 24.0, 29.1, 28.3, 24.8, 23.6, 29.8, 27.4]),
    calibrations: [],
    revisions: [],
  };
  b.revisions = [buildRevision(b, "登记测算", new Date("2026-09-24T10:40:00"))];

  // CASE-051-A：校准时段只覆盖前段温度点，仍待复核
  const cBase: Sample = {
    id: "CASE-051-A",
    caseNo: "CASE-051",
    location: "水沟边缘",
    exposureStage: "腐败期",
    species: "家蝇",
    observedStage: "二龄幼虫",
    sampledAt: new Date("2026-09-22T15:00:00").toISOString(),
    preservation: "冷冻保存",
    baseTemp: 10,
    note: "校准证书只覆盖到 09-21，后段温度点等待补充时段证明。",
    rawSeries: series("2026-09-20T00:00:00", 6, [19.8, 18.6, 24.2, 23.5, 20.1, 18.9, 25.0, 23.8]),
    calibrations: [],
    revisions: [],
  };
  cBase.revisions = [buildRevision(cBase, "登记测算", new Date("2026-09-22T15:20:00"))];
  const cCal = calibration({
    basis: "JL-2026-0902 比对记录",
    appliesFrom: new Date("2026-09-20T00:00:00").toISOString(),
    appliesTo: new Date("2026-09-21T00:00:00").toISOString(),
    offset: 0.6,
    recordedAt: new Date("2026-09-23T11:00:00").toISOString(),
  });
  const c: Sample = { ...cBase, calibrations: [cCal] };
  c.revisions = [...cBase.revisions, buildRevision(c, "补录校准：JL-2026-0902 比对记录", new Date("2026-09-23T11:05:00"))];

  // CASE-051-B：登记时校准齐全，一次测算即有效
  const dCal = calibration({
    basis: "JL-2026-0907 计量院校准证书",
    appliesFrom: new Date("2026-09-19T00:00:00").toISOString(),
    appliesTo: new Date("2026-09-25T00:00:00").toISOString(),
    offset: -0.5,
    recordedAt: new Date("2026-09-21T08:30:00").toISOString(),
  });
  const dBase: Sample = {
    id: "CASE-051-B",
    caseNo: "CASE-051",
    location: "水沟下游草丛",
    exposureStage: "腐败期",
    species: "棕尾别麻蝇",
    observedStage: "一龄幼虫",
    sampledAt: new Date("2026-09-21T09:00:00").toISOString(),
    preservation: "活体饲养",
    baseTemp: 10,
    note: "已完成拍照与饲养观察。",
    rawSeries: series("2026-09-19T12:00:00", 6, [21.0, 20.2, 25.6, 24.8, 21.4, 20.6]),
    calibrations: [dCal],
    revisions: [],
  };
  const d: Sample = { ...dBase, revisions: [buildRevision(dBase, "登记测算", new Date("2026-09-21T09:15:00"))] };

  // CASE-053-A：只有一个温度点且无校准，结论退回现场观察
  const e: Sample = {
    id: "CASE-053-A",
    caseNo: "CASE-053",
    location: "废弃仓库",
    exposureStage: "新鲜期",
    species: "丝光绿蝇",
    observedStage: "卵",
    sampledAt: new Date("2026-09-26T08:00:00").toISOString(),
    preservation: "干燥保存",
    baseTemp: 10,
    note: "记录仪故障仅留存一个读数，待补录温度曲线与校准。",
    rawSeries: series("2026-09-26T00:00:00", 6, [22.4]),
    calibrations: [],
    revisions: [],
  };

  return [a, b, c, d, e];
}
