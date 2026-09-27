import type { Sample } from "../domain/types";
import { seedSamples } from "./seed";

const KEY = "hxy62003.ledger.v1";

/** 本机存取：所有页面共用同一份台账数据 */
export function loadSamples(): Sample[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Sample[];
  } catch {
    // 数据损坏时退回种子数据
  }
  return seedSamples();
}

export function saveSamples(samples: Sample[]): void {
  localStorage.setItem(KEY, JSON.stringify(samples));
}

export function resetSamples(): Sample[] {
  const seeds = seedSamples();
  saveSamples(seeds);
  return seeds;
}
