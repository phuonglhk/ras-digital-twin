import { describe, expect, it } from "vitest";

import {
  bufferBeta,
  calciteSaturation,
  co2FromDIC,
  dic,
  freeAmmoniaFraction,
  oxygenSaturation,
  phFromCarbonate,
  solvePH,
} from "./chemistry";
import {
  buildChain,
  defaultParams,
  levelOf,
  loads,
  makeupWater,
  passChain,
  report,
  steadyState,
  step,
  stripCO2,
  warnings,
} from "./process";
import { SPECIES } from "./species";

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

describe("hệ carbonat và các tải bổ sung", () => {
  it("pH nước ngọt gần Henderson–Hasselbalch dưới 8,3", () => {
    for (const co2 of [4, 8, 20])
      expect(Math.abs(solvePH(100, co2, 25) - phFromCarbonate(100, co2, 25))).toBeLessThan(0.03);
  });
  it("pH nước biển ở 25 °C nằm trong khoảng quan sát", () => {
    expect(solvePH(115, 0.4401, 25, 35)).toBeGreaterThan(8);
    expect(solvePH(115, 0.4401, 25, 35)).toBeLessThan(8.2);
  });
  it("khử khí bảo toàn kiềm và giảm DIC đúng lượng khí thoát", () => {
    const p = defaultParams(),
      w = { ...makeupWater(p), alk: 150, co2: 20 };
    const initial = dic(w.alk, w.co2, p.temp, p.salinity);
    expect(co2FromDIC(w.alk, initial, p.temp, p.salinity)).toBeCloseTo(w.co2, 6);
    stripCO2(w, 5, p);
    expect(w.alk).toBe(150);
    expect(dic(w.alk, w.co2, p.temp, p.salinity)).toBeCloseTo(initial - 5, 5);
    expect(w.co2).toBeGreaterThan(15);
    expect(w.co2).toBeLessThan(20);
  });
  it("sức đệm dương và tăng theo kiềm", () => {
    expect(bufferBeta(100, 5, 25, 0)).toBeGreaterThan(0);
    expect(bufferBeta(200, 5, 25, 0)).toBeGreaterThan(bufferBeta(100, 5, 25, 0));
  });
  it("ozone giảm DOM và ôxy hoá nitrit trên nhánh", () => {
    const p = defaultParams(),
      w = { ...makeupWater(p), dom: 10, no2: 2 };
    const off = passChain(w, p)[2].out;
    const on = passChain(w, { ...p, skimmer: { ...p.skimmer, ozone: true } })[2].out;
    expect(on.dom).toBeLessThan(off.dom);
    expect(on.no2).toBeLessThan(off.no2);
  });
  it("côn ôxy 150% tạo cảnh báo TGP", () => {
    const p = defaultParams(),
      pp = { ...p, oxygen: { on: true, target: 1.5 } },
      w = makeupWater(pp);
    const r = report(w, pp);
    expect(r.oxygen.tgpOutlet).toBeGreaterThan(110);
    expect(warnings(buildChain(w, pp), pp, r).some((x) => x.text.includes("TGP"))).toBe(true);
    expect(
      warnings(buildChain(w, pp), pp, r).some((x) => x.text.includes("gần vòi cấp nước") && x.level === "warn"),
    ).toBe(true);
  });
  it("cảnh báo TGP theo ngưỡng riêng của bể và côn", () => {
    const p = defaultParams(),
      w = makeupWater(p),
      r = report(w, p),
      chain = buildChain(w, p);
    const withTgp = (tgp: number) => [{ ...chain[0], point: { ...chain[0].point, tgp } }, ...chain.slice(1)];
    for (const [value, expected] of [
      [102, undefined],
      [102.1, "warn"],
      [105, "warn"],
      [105.1, "bad"],
    ] as const) {
      const alert = warnings(withTgp(value), p, r).find((x) => x.text.includes("TGP bể nuôi"));
      expect(alert?.level).toBe(expected);
    }
    expect(r.tgpTank).toBeCloseTo(chain[0].point.tgp, 8);
    expect(
      warnings(chain, p, { ...r, oxygen: { ...r.oxygen, tgpOutlet: 110 } }).some((x) =>
        x.text.includes("gần vòi cấp nước"),
      ),
    ).toBe(false);
    expect(
      warnings(chain, p, { ...r, oxygen: { ...r.oxygen, tgpOutlet: 110.1 } }).some((x) =>
        x.text.includes("gần vòi cấp nước"),
      ),
    ).toBe(true);
  });
  it.each(SPECIES)("mặc định $name không có mức đỏ hoặc cảnh báo TGP", (s) => {
    const p = defaultParams(s.id),
      w = steadyState(p),
      chain = buildChain(w, p),
      rep = report(w, p),
      tank = chain[0].point;
    for (const key of ["tan", "nh3", "no2", "do", "co2", "ph"] as const)
      expect(levelOf(key, tank[key], s), key).not.toBe("bad");
    if (p.salinity > 0) expect(levelOf("omega", tank.omega, s)).not.toBe("bad");
    const messages = warnings(chain, p, rep);
    expect(messages.filter((x) => x.level === "bad")).toEqual([]);
    expect(messages.filter((x) => x.text.includes("TGP"))).toEqual([]);
  });
  it("cảnh báo định dạng số thập phân theo tiếng Việt", () => {
    const p = { ...defaultParams(), temp: 12.5, salinity: 20.5 },
      w = { ...makeupWater(p), tan: 4, no2: 3, do: 2, co2: 40 };
    const messages = warnings(buildChain(w, p), p, report(w, p));
    expect(messages.some((x) => x.text.includes("12,5 °C"))).toBe(true);
    expect(messages.some((x) => x.text.includes("20,5‰"))).toBe(true);
    expect(messages.some((x) => x.text.includes("4,00 mg/L"))).toBe(true);
    expect(messages.every((x) => !/\d\.\d/.test(x.text))).toBe(true);
  });
  it("phân biệt giới hạn diện tích và lưu lượng", () => {
    const p = defaultParams(),
      w = { ...makeupWater(p), tan: 1 };
    expect(report(w, { ...p, biofilter: { ...p.biofilter, media: 0.001 } }).biofilter.limitedBy).toBe(
      "diện tích giá thể",
    );
    expect(report(w, { ...p, flow: 0.1, biofilter: { ...p.biofilter, media: 10 } }).biofilter.limitedBy).toBe(
      "lưu lượng",
    );
  });
  it("trạng thái cua mặc định đạt TAN và DO yêu cầu", () => {
    const w = steadyState(defaultParams());
    expect(w.tan).toBeLessThan(1);
    expect(w.do).toBeGreaterThan(4.5);
  });
  it("thứ tự tuyến và định cỡ theo tải cao điểm", () => {
    const p = defaultParams(),
      w = { ...makeupWater(p), tan: 1, do: 4 };
    expect(passChain(w, p).map((x) => x.id)).toEqual([
      "culture",
      "rdf",
      "skimmer",
      "biofilter",
      "degasser",
      "pump",
      "oxygen",
      "uv",
    ]);
    const average = report(w, { ...p, peakFactor: 1 });
    const peak = report(w, p);
    expect(peak.peakLoads.tan).toBeCloseTo(average.averageLoads.tan * 1.5);
    expect(peak.oxygen.pureO2).toBeGreaterThan(average.oxygen.pureO2);
    expect(peak.biofilter.airFlow).toBeGreaterThanOrEqual(average.biofilter.airFlow);
    expect(report(w, { ...p, pumpOn: false }).oxygen.pureO2).toBe(0);
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
