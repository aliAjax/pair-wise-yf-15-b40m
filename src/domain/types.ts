/** 温度记录点（原始读数，登记后不可覆盖，只允许补录新点） */
export interface TemperaturePoint {
  /** ISO 时间 */
  time: string;
  celsius: number;
}

/** 温度计校准记录：适用时段内的原始读数 + 偏差值 = 修正温度 */
export interface Calibration {
  id: string;
  /** 校准依据（证书编号 / 比对记录等） */
  basis: string;
  /** 适用时段起（ISO） */
  appliesFrom: string;
  /** 适用时段止（ISO） */
  appliesTo: string;
  /** 偏差值 ℃：修正温度 = 原始温度 + 偏差值（正数表示温度计读数偏低） */
  offset: number;
  recordedAt: string;
}

/** 一次修正的完整快照：修正曲线 + 阶段测算结论，旧记录永不删除 */
export interface Revision {
  id: string;
  seq: number;
  revisedAt: string;
  /** 修正原因：登记测算 / 补录校准 / 补录温度点 */
  reason: string;
  correctedSeries: TemperaturePoint[];
  /** 有效积温（度·时） */
  adh: number;
  estimatedStage: string;
  conclusion: string;
}

export type SampleStatus = "已登记" | "待复核" | "已修正";

export interface Sample {
  id: string;
  caseNo: string;
  location: string;
  /** 尸体暴露阶段 */
  exposureStage: string;
  species: string;
  /** 现场观察到的发育阶段 */
  observedStage: string;
  sampledAt: string;
  preservation: string;
  /** 发育起点温度 ℃ */
  baseTemp: number;
  /** 鉴定备注 */
  note: string;
  rawSeries: TemperaturePoint[];
  calibrations: Calibration[];
  revisions: Revision[];
}
