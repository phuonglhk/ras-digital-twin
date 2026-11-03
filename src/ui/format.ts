import type { Level, Point } from "../model/process";

export const METRICS: { key: keyof Point; label: string; unit: string; digits: number }[] = [
  { key: "tan", label: "TAN", unit: "mg/L", digits: 3 },
  { key: "nh3", label: "NH₃ tự do", unit: "µg/L", digits: 1 },
  { key: "nh4", label: "NH₄⁺", unit: "mg/L", digits: 3 },
  { key: "no2", label: "NO₂⁻", unit: "mg/L", digits: 3 },
  { key: "no3", label: "NO₃⁻", unit: "mg/L", digits: 1 },
  { key: "tss", label: "TSS", unit: "mg/L", digits: 1 },
  { key: "do", label: "DO", unit: "mg/L", digits: 2 },
  { key: "co2", label: "CO₂", unit: "mg/L", digits: 1 },
  { key: "ph", label: "pH", unit: "", digits: 2 },
  { key: "omega", label: "Ω canxit", unit: "", digits: 2 },
  { key: "alk", label: "Kiềm", unit: "mg/L", digits: 0 },
];

export const fmt = (v: number | null | undefined, digits = 2) =>
  v == null || !Number.isFinite(v) ? "—" : v.toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const RANK: Record<Level, number> = { ok: 0, warn: 1, bad: 2 };

export function worst(levels: (Level | null | undefined)[]): Level {
  return levels.reduce<Level>((a, l) => (l && RANK[l] > RANK[a] ? l : a), "ok");
}
