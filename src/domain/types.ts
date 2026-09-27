// 法医昆虫学样本台账 —— 数据模型
export interface TempPoint {
  time: string; // 本地时间 "YYYY-MM-DDTHH:mm"
  tempC: number; // 原始记录温度（℃）
}

export interface Calibration {
  id: string;
  basis: string; // 校准依据（报告编号 / 比对说明）
  appliesFrom: string; // 适用时段起
  appliesTo: string; // 适用时段止
  offsetC: number; // 偏差值：修正温度 = 原始记录 + 偏差值
  recordedAt: string; // 补录时刻
}

export interface Revision {
  id: string;
  createdAt: string;
  calibrationId: string | null; // 本次修正依据的校准记录
  label: string; // 第 N 次修正
  points: TempPoint[]; // 修正后曲线快照（不覆盖原始曲线）
  adh: number; // 有效积温 ℃·h
  stageEstimate: string; // 阶段测算结果
  note: string; // 修正说明
}

export type SampleStatus = "pending_review" | "ready";

export interface Sample {
  id: string;
  caseId: string; // 案件编号
  location: string; // 采样地点
  exposureStage: string; // 尸体暴露阶段
  species: string; // 虫种
  devStage: string; // 现场判定的发育阶段
  sampledAt: string; // 采样时刻
  preservation: string; // 保存方式
  note: string; // 鉴定备注
  tempPoints: TempPoint[]; // 原始温度记录（永不覆盖）
  calibrations: Calibration[]; // 校准补录
  revisions: Revision[]; // 每次修正都保留
  conclusion: string; // 当前有效结论（待复核期间沿用旧结论）
}

export type NewSampleInput = Omit<Sample, "id" | "calibrations" | "revisions" | "conclusion">;
