// 本机存取：localStorage 持久化，与规则、界面解耦
import type { Sample } from "../domain/types";
import { seedSamples } from "../domain/seed";

const KEY = "fei-ledger-v1";

export function loadSamples(): Sample[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Sample[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // 数据损坏时回退到示例数据
  }
  const seeded = seedSamples();
  saveSamples(seeded);
  return seeded;
}

export function saveSamples(samples: Sample[]): void {
  localStorage.setItem(KEY, JSON.stringify(samples));
}

export function resetSamples(): Sample[] {
  const seeded = seedSamples();
  saveSamples(seeded);
  return seeded;
}
