import { describe, expect, it } from "vitest";

import { calciteSaturation, freeAmmoniaFraction, oxygenSaturation, phFromCarbonate } from "./chemistry";
import { buildChain, defaultParams, loads, steadyState, step } from "./process";

describe("hoá học", () => {
  it("tỉ lệ NH₃ tự do khớp số iRAS hiển thị (pH 8.02, 12 °C, nước ngọt: 2.23%)", () => {
    expect(freeAmmoniaFraction(8.02, 12, 0) * 100).toBeCloseTo(2.23, 1);
  });

  it("NH₃ tự do tăng theo pH và nhiệt độ, giảm theo độ mặn", () => {
    expect(freeAmmoniaFraction(8.3, 28)).toBeGreaterThan(freeAmmoniaFraction(7.8, 28));
    expect(freeAmmoniaFraction(8, 30)).toBeGreaterThan(freeAmmoniaFraction(8, 20));
    expect(freeAmmoniaFraction(8, 28, 30)).toBeLessThan(freeAmmoniaFraction(8, 28, 0));
  });

  it("pH cân bằng carbonat gần số iRAS (kiềm 150, CO₂ 5.2 mg/L, 14 °C → ~7.83)", () => {
    expect(phFromCarbonate(150, 5.2, 14, 0)).toBeGreaterThan(7.7);
    expect(phFromCarbonate(150, 5.2, 14, 0)).toBeLessThan(7.95);
  });

  it("CO₂ cao làm Ω canxit giảm", () => {
    const hi = calciteSaturation(phFromCarbonate(150, 3, 28, 20), 150, 28, 20, 90);
    const lo = calciteSaturation(phFromCarbonate(150, 20, 28, 20), 150, 28, 20, 90);
    expect(lo).toBeLessThan(hi);
  });

  it("DO bão hoà 25 °C nước ngọt ~8.26 mg/L", () => {
    expect(oxygenSaturation(25, 0)).toBeCloseTo(8.26, 1);
  });
});

describe("cân bằng chất", () => {
  it("tải TAN theo Timmons: F·PC·0.092", () => {
    const p = defaultParams("mud-crab");
    const L = loads(p);
    expect(L.tan).toBeCloseTo(L.feed * p.protein * 0.092 * 1000, 6);
  });

  it("trạng thái ổn định mặc định cho cua giữ TAN dưới ngưỡng và DO trên ngưỡng", () => {
    const p = defaultParams("mud-crab");
    const w = steadyState(p);
    const s = loads(p).species;
    expect(w.tan).toBeLessThan(s.limits.tan);
    expect(w.do).toBeGreaterThan(s.limits.doMin);
  });

  it("tại trạng thái ổn định, TAN vào = TAN bị nitrat hoá + TAN theo nước thay", () => {
    const p = { ...defaultParams("mud-crab"), mealPulses: false };
    const w = steadyState(p);
    const chain = buildChain(w, p);
    const L = loads(p);
    const qDay = p.flow * 24;
    const nitrified = qDay * (chain[2].out.tan - chain[3].out.tan);
    const exchanged = (p.exchange / 100) * L.totalVolume * w.tan;
    expect((nitrified + exchanged) / L.tan).toBeCloseTo(1, 2);
  });

  it("tắt bể vi sinh thì TAN cao hơn", () => {
    const p = defaultParams("mud-crab");
    const off = { ...p, biofilter: { ...p.biofilter, on: false } };
    expect(steadyState(off).tan).toBeGreaterThan(steadyState(p).tan * 3);
  });

  it("bể vi sinh non làm NO₂⁻ tăng", () => {
    const p = defaultParams("mud-crab");
    const young = { ...p, biofilter: { ...p.biofilter, maturity: 0.3 } };
    expect(steadyState(young).no2).toBeGreaterThan(steadyState(p).no2 * 2);
  });

  it("dừng bơm 1 giờ làm DO giảm và TAN tăng", () => {
    const p = defaultParams("mud-crab");
    const L = loads(p);
    let w = steadyState(p);
    const start = { ...w };
    const off = { ...p, pumpOn: false };
    for (let i = 0; i < 60; i++) w = step(w, off, L, 1 / 1440, 12);
    expect(w.tan).toBeGreaterThan(start.tan);
    expect(w.do).toBeLessThan(start.do);
  });

  it("chuỗi theo thứ tự iRAS: TAN giảm qua bể vi sinh, CO₂ giảm qua tháp khử khí", () => {
    const p = defaultParams("mud-crab");
    const c = buildChain(steadyState(p), p);
    const by = Object.fromEntries(c.map((x) => [x.id, x.out]));
    expect(by.biofilter.tan).toBeLessThan(by.skimmer.tan);
    expect(by.degasser.co2).toBeLessThan(by.biofilter.co2);
    expect(by.oxygen.do).toBeGreaterThanOrEqual(by.uv.do);
  });
});
