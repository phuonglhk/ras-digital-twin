/*
 * Mô hình công nghệ RAS bám theo iRAS:
 *   bể nuôi → lọc trống (RDF) → tách đạm (skimmer) → bể vi sinh (MBBR)
 *   → tháp khử CO₂ → bơm → côn ôxy → UV → hồi về bể nuôi,
 *   cùng nhánh khử nitrat và châm kiềm.
 * Tải ô nhiễm suy từ lượng thức ăn (Timmons & Ebeling 2010):
 *   TAN = F·PC·0.092, TSS = 0.25·F, O₂ = hệ số loài·F, CO₂ = 1.375·O₂.
 * Nitrat hoá theo diện tích giá thể như iRAS: r = k·S^0.7·θ^(T−10)·(1−0.01·Sal).
 * Toàn bộ là mô hình minh hoạ để vận hành và đào tạo, không thay thiết kế kỹ thuật.
 */

import {
  calciteSaturation,
  bufferBeta,
  co2FromDIC,
  co2Equilibrium,
  dic,
  freeAmmoniaFraction,
  nitrificationSaltFactor,
  nitrificationTempFactor,
  oxygenSaturation,
  solvePH,
} from "./chemistry";
import { speciesById, type Species } from "./species";
import { fmt } from "./format";

export interface Params {
  speciesId: string;
  units: number;
  perUnit: number;
  avgWeight: number; // g
  unitVolume: number; // m³
  processVolume: number; // m³ nước trong thiết bị xử lý và bể chứa
  feedRate: number; // %/ngày
  protein: number;
  temp: number;
  salinity: number;
  makeupAlk: number; // mg/L CaCO₃ của nước cấp
  calciumHardness: number; // mg/L CaCO₃ (nước ngọt)
  flow: number; // m³/h lưu lượng tuần hoàn
  exchange: number; // %/ngày tổng thể tích
  pumpOn: boolean;
  mealPulses: boolean;
  peakFactor: number;
  rdf: { on: boolean; efficiency: number };
  skimmer: { on: boolean; bypass: number; ozone: boolean };
  biofilter: { on: boolean; media: number; ssa: number; k: number; maturity: number };
  degasser: { on: boolean; gl: number; efficiency: number };
  uv: { on: boolean; bypass: number; dose: number };
  oxygen: { on: boolean; target: number }; // phần bão hoà, 1 = 100%
  denit: { on: boolean; flow: number; efficiency: number }; // m³/h
  alkDosing: { on: boolean; target: number };
}

export function defaultParams(speciesId = "mud-crab"): Params {
  const s = speciesById(speciesId);
  const cultureVol = s.defaults.units * s.defaults.unitVolume;
  return {
    speciesId: s.id,
    units: s.defaults.units,
    perUnit: s.defaults.perUnit,
    avgWeight: s.defaults.avgWeight,
    unitVolume: s.defaults.unitVolume,
    processVolume: Math.max(2, Math.round(cultureVol * 0.6 * 10) / 10),
    feedRate: s.feedRate,
    protein: s.protein,
    temp: s.temp,
    salinity: s.salinity,
    makeupAlk: 120,
    calciumHardness: 90,
    // Hệ hộp: ~19 phút một vòng cho thể tích nuôi; hệ bể: ~40 phút.
    flow: s.culture === "boxes" ? 6 : Math.round(cultureVol * 1.5),
    exchange: 10,
    pumpOn: true,
    mealPulses: true,
    peakFactor: 1.5,
    rdf: { on: true, efficiency: 0.75 },
    skimmer: { on: true, bypass: 0.2, ozone: false },
    biofilter: {
      on: true,
      media: s.culture === "boxes" ? 0.25 : Math.round(cultureVol * 0.08 * 10) / 10,
      ssa: 500,
      k: 0.58,
      maturity: 1,
    },
    // Giữ quan hệ thiết kế hiện có của bảng điều khiển: hiệu suất = min(0,9; 0,2 + 0,09 × G:L).
    degasser: { on: true, gl: 8, efficiency: 0.9 },
    uv: { on: true, bypass: 0.1, dose: 40 },
    oxygen: { on: true, target: 1.2 },
    denit: { on: true, flow: s.culture === "boxes" ? 0.15 : Math.round(cultureVol * 0.01 * 10) / 10, efficiency: 0.8 },
    // 200 mg/L nằm trong khoảng RAS 150–200 mg/L: NOAA, North Central Regional Aquaculture Conference (1997), mục Alkalinity.
    alkDosing: { on: true, target: 200 },
  };
}

/* ---------------- trạng thái nước ---------------- */

export interface Water {
  tan: number; // mg N/L
  no2: number;
  no3: number;
  tss: number;
  dom: number; // mg COD/L
  do: number;
  co2: number;
  alk: number; // mg/L CaCO₃
}

export interface Point extends Water {
  ph: number;
  fNh3: number;
  nh3: number; // µg N/L
  nh4: number; // mg N/L
  omega: number;
  doSat: number; // phần bão hoà
  tgp: number; // % áp suất khí tổng ước tính
  beta: number; // mg/L CaCO₃ trên mỗi đơn vị pH
}

export const WATER_KEYS: (keyof Water)[] = ["tan", "no2", "no3", "tss", "dom", "do", "co2", "alk"];

export function describe(w: Water, p: Params): Point {
  const ph = solvePH(w.alk, w.co2, p.temp, p.salinity);
  const f = freeAmmoniaFraction(ph, p.temp, p.salinity);
  return {
    ...w,
    ph,
    fNh3: f,
    nh3: w.tan * f * 1000,
    nh4: w.tan * (1 - f),
    omega: calciteSaturation(ph, w.alk, p.temp, p.salinity, p.calciumHardness),
    doSat: w.do / oxygenSaturation(p.temp, p.salinity),
    // Định luật Dalton: giả sử các khí khác ở áp suất cân bằng, O₂ chiếm 20,95% áp suất khí khô.
    tgp: 100 * (1 + 0.2095 * (w.do / oxygenSaturation(p.temp, p.salinity) - 1)),
    beta: bufferBeta(w.alk, w.co2, p.temp, p.salinity),
  };
}

/* ---------------- tải từ đối tượng nuôi ---------------- */

export interface Loads {
  species: Species;
  animals: number;
  biomass: number; // kg
  feed: number; // kg/ngày
  tan: number; // g N/ngày
  tss: number; // g/ngày
  dom: number; // g COD/ngày
  o2: number; // g/ngày
  co2: number; // g/ngày
  cultureVolume: number; // m³
  totalVolume: number; // m³
  density: number; // kg/m³ nước nuôi
}

export function loads(p: Params): Loads {
  const species = speciesById(p.speciesId);
  const animals = p.units * p.perUnit;
  const biomass = (animals * p.avgWeight) / 1000;
  const feed = (biomass * p.feedRate) / 100;
  const o2 = feed * species.oxygenPerFeed * 1000;
  const cultureVolume = p.units * p.unitVolume;
  return {
    species,
    animals,
    biomass,
    feed,
    tan: feed * p.protein * 0.092 * 1000,
    tss: feed * 0.25 * 1000,
    // Giả định thiết kế theo đặc tả: COD hoà tan bằng 10% thức ăn.
    dom: feed * 0.1 * 1000,
    o2,
    co2: o2 * 1.375,
    cultureVolume,
    totalVolume: cultureVolume + p.processVolume,
    density: biomass / Math.max(cultureVolume, 1e-6),
  };
}

/** Hệ số tải theo giờ khi cho ăn theo bữa (07:00 và 17:00), trung bình ngày = 1. */
const MEALS = [7, 17];
function rawMeal(hour: number) {
  let v = 0.35;
  for (const m of MEALS) {
    for (const shift of [-24, 0, 24]) {
      const d = hour - (m + 4 + shift); // đỉnh bài tiết ~4 h sau bữa ăn
      v += Math.exp(-(d * d) / (2 * 2.2 * 2.2));
    }
  }
  return v;
}
const MEAL_MEAN = Array.from({ length: 240 }, (_, i) => rawMeal(i / 10)).reduce((a, b) => a + b, 0) / 240;
export function mealFactor(hour: number) {
  return rawMeal(((hour % 24) + 24) % 24) / MEAL_MEAN;
}

/* ---------------- từng thiết bị trên tuyến ---------------- */

export type UnitId = "culture" | "rdf" | "skimmer" | "biofilter" | "degasser" | "pump" | "uv" | "oxygen";

export const UNIT_ORDER: UnitId[] = ["culture", "rdf", "skimmer", "biofilter", "degasser", "pump", "oxygen", "uv"];

export const UNIT_LABEL: Record<UnitId | "denit", string> = {
  culture: "Bể nuôi",
  rdf: "Lọc trống RDF",
  skimmer: "Tách đạm",
  biofilter: "Bể vi sinh MBBR",
  degasser: "Tháp khử CO₂",
  pump: "Bơm tuần hoàn",
  uv: "Đèn UV",
  oxygen: "Côn ôxy",
  denit: "Khử nitrat",
};

export interface Biofilter {
  area: number; // m²
  rate: number; // g N/m²·ngày tại TAN đầu vào
  capacity: number; // g N/ngày
  etaTan: number; // hiệu suất một lượt NH₄⁺ → NO₂⁻
  etaNo2: number; // hiệu suất một lượt NO₂⁻ → NO₃⁻
  fTemp: number;
  fSalt: number;
  limitedBy: "diện tích giá thể" | "lưu lượng";
}

export function biofilterKinetics(p: Params, tanIn: number, qDay: number): Biofilter {
  const b = p.biofilter;
  const area = b.media * b.ssa;
  const fTemp = nitrificationTempFactor(p.temp);
  const fSalt = nitrificationSaltFactor(p.salinity);
  // Vi khuẩn ôxy hoá amoni ổn định nhanh hơn vi khuẩn ôxy hoá nitrit khi bể còn non.
  const aob = Math.min(1, b.maturity * 1.6);
  const rate = b.k * Math.max(tanIn, 0) ** 0.7 * fTemp * fSalt * aob;
  const capacity = rate * area;
  // Hiệu suất một lượt bị chặn ở 85%: MBBR thực tế hiếm khi vượt (iRAS báo 47–63%).
  const etaTan = b.on && qDay > 0 && tanIn > 1e-6 ? Math.min(0.85, capacity / (qDay * tanIn)) : 0;
  const etaNo2 = b.on ? Math.min(0.95, 0.95 * b.maturity) : 0;
  return {
    area,
    rate,
    capacity,
    etaTan,
    etaNo2,
    fTemp,
    fSalt,
    limitedBy: etaTan >= 0.85 ? "lưu lượng" : "diện tích giá thể",
  };
}

/** Khử một lượng CO₂ (mg/L), giữ kiềm và cân bằng lại DIC. */
export function stripCO2(w: Water, amount: number, p: Params): void {
  // Dickson và cộng sự (2007): khí thoát làm giảm DIC, không đổi kiềm tổng.
  const total = dic(w.alk, w.co2, p.temp, p.salinity);
  w.co2 = co2FromDIC(w.alk, Math.max(0, total - Math.max(0, amount)), p.temp, p.salinity);
}

export interface Step {
  id: UnitId;
  out: Water;
  note: string;
  active: boolean;
}

/** Cho nước đi một lượt qua tuyến xử lý, bắt đầu từ nước ra khỏi bể nuôi. */
export function passChain(tank: Water, p: Params): Step[] {
  const qDay = p.flow * 24;
  const sat = oxygenSaturation(p.temp, p.salinity);
  const eq = co2Equilibrium(p.temp);
  const steps: Step[] = [];
  let w: Water = { ...tank };
  const push = (id: UnitId, note: string, active = true) => steps.push({ id, out: { ...w }, note, active });

  push("culture", "Nước ra, nồng độ cao nhất");

  if (p.rdf.on) {
    w.tss *= 1 - p.rdf.efficiency;
    push("rdf", `TSS −${Math.round(p.rdf.efficiency * 100)}%`);
  } else push("rdf", "Đang tắt", false);

  if (p.skimmer.on) {
    const b = p.skimmer.bypass;
    w.tss *= 1 - b * 0.4;
    // Hiệu suất một lượt nhánh theo đặc tả; ozone ôxy hoá giả định 20% NO₂⁻ trên nhánh.
    w.dom *= 1 - b * (p.skimmer.ozone ? 0.7 : 0.4);
    if (p.skimmer.ozone) {
      const oxidized = w.no2 * b * 0.2;
      w.no2 -= oxidized;
      w.no3 += oxidized;
    }
    w.do += (sat - w.do) * b * 0.3;
    stripCO2(w, Math.max(0, w.co2 - eq) * b * 0.2, p);
    push("skimmer", `Nhánh ${Math.round(b * 100)}% · TSS −${Math.round(b * 40)}%`);
  } else push("skimmer", "Đang tắt", false);

  if (p.biofilter.on) {
    const k = biofilterKinetics(p, w.tan, qDay);
    const dTan = w.tan * k.etaTan;
    const no2In = w.no2 + dTan;
    const dNo2 = no2In * k.etaNo2;
    w.tan -= dTan;
    w.no2 = no2In - dNo2;
    w.no3 += dNo2;
    w.do = Math.max(0, w.do - 3.43 * dTan - 1.14 * dNo2);
    w.do += (sat - w.do) * 0.35; // MBBR sục khí
    const carbonBefore = dic(w.alk, w.co2, p.temp, p.salinity);
    w.alk = Math.max(1, w.alk - 7.14 * dTan);
    // Bảo toàn DIC khi nitrat hoá tiêu hao kiềm và tạo CO₂ (hệ số mô hình hiện hữu).
    w.co2 = co2FromDIC(w.alk, carbonBefore + 8.5 * dTan, p.temp, p.salinity);
    stripCO2(w, Math.max(0, w.co2 - eq) * 0.15, p);
    w.tss *= 0.9;
    push("biofilter", `Nitrat hoá ${Math.round(k.etaTan * 100)}% · TAN → NO₃⁻`);
  } else push("biofilter", "Đang tắt", false);

  if (p.degasser.on) {
    stripCO2(w, Math.max(0, w.co2 - eq) * p.degasser.efficiency, p);
    w.do += (sat - w.do) * 0.6;
    push("degasser", `G:L=${p.degasser.gl} · CO₂ −${Math.round(p.degasser.efficiency * 100)}%`);
  } else push("degasser", "Đang tắt", false);

  push("pump", p.pumpOn ? `${p.flow} m³/h` : "Đang dừng", p.pumpOn);

  if (p.oxygen.on) {
    w.do = Math.max(w.do, p.oxygen.target * sat);
    push("oxygen", `DO → ${Math.round(p.oxygen.target * 100)}% bão hoà`);
  } else push("oxygen", "Đang tắt", false);

  if (p.uv.on) push("uv", `${p.uv.dose} mJ/cm² · nhánh ${Math.round(p.uv.bypass * 100)}%`);
  else push("uv", "Đang tắt", false);

  return steps;
}

/* ---------------- cân bằng chất tại bể nuôi ---------------- */

export function makeupWater(p: Params): Water {
  return {
    tan: 0,
    no2: 0,
    no3: 0,
    tss: 0,
    dom: 0,
    do: oxygenSaturation(p.temp, p.salinity),
    co2: co2Equilibrium(p.temp),
    alk: p.makeupAlk,
  };
}

export interface Rates {
  dWdt: Water; // mg/L·ngày
  returnWater: Water;
  steps: Step[];
  alkDose: number; // g CaCO₃/ngày cần châm để giữ kiềm mục tiêu
  denitRemoved: number; // g N/ngày
}

/** Tốc độ thay đổi nồng độ trong bể (coi toàn hệ là một khối trộn đều). */
export function rates(tank: Water, p: Params, L: Loads, hour = 12): Rates {
  const V = L.totalVolume;
  const q = p.pumpOn ? p.flow * 24 : 0;
  const qx = (p.exchange / 100) * V;
  const qd = p.denit.on && p.pumpOn ? p.denit.flow * 24 : 0;
  const m = p.mealPulses ? mealFactor(hour) : 1;
  const steps = passChain(tank, p);
  const ret = q > 0 ? steps[steps.length - 1].out : tank;
  const mk = makeupWater(p);

  const d = {} as Water;
  for (const key of WATER_KEYS) {
    d[key] = (q * (ret[key] - tank[key]) + qx * (mk[key] - tank[key])) / V;
  }
  // Cân bằng khối lượng DIC khi trộn các dòng, Dickson và cộng sự (2007).
  d.co2 =
    (q * (dic(ret.alk, ret.co2, p.temp, p.salinity) - dic(tank.alk, tank.co2, p.temp, p.salinity)) +
      qx * (dic(mk.alk, mk.co2, p.temp, p.salinity) - dic(tank.alk, tank.co2, p.temp, p.salinity))) /
    V;

  // Nguồn và tiêu hao trong bể nuôi (g/ngày ÷ m³ = mg/L·ngày).
  d.tan += (L.tan * m) / V;
  d.tss += (L.tss * m) / V;
  d.dom += (L.dom * m) / V;
  // Giả định động học bậc nhất cho dị dưỡng: 0,02 g O₂/g TSS/ngày và 0,05 g O₂/g COD/ngày.
  const heterotrophic = (0.02 * tank.tss + 0.05 * tank.dom) * V;
  const o2Use = (L.o2 * m + heterotrophic) * Math.min(1, tank.do / 0.5);
  d.dom -= 0.05 * tank.dom * Math.min(1, tank.do / 0.5);
  d.do -= o2Use / V;
  d.co2 += (o2Use * 1.375) / V;
  // Trao đổi khí bề mặt bể nuôi (nhỏ, có cả khi bơm dừng).
  const sat = oxygenSaturation(p.temp, p.salinity);
  d.do += 0.6 * (sat - tank.do);
  d.co2 += 0.4 * (co2Equilibrium(p.temp) - tank.co2);

  // Nhánh khử nitrat: lấy nước từ bể, khử NO₃⁻, hồi kiềm 3.57 g CaCO₃ / g N.
  const denitRemoved = qd * tank.no3 * p.denit.efficiency;
  d.no3 -= denitRemoved / V;
  d.alk += (3.57 * denitRemoved) / V;

  // Châm NaHCO₃ tự động giữ kiềm mục tiêu (bù đúng phần thiếu, kiểu bộ điều khiển P).
  let alkDose = 0;
  if (p.alkDosing.on && tank.alk < p.alkDosing.target) {
    const needPerDay = Math.max(0, -d.alk) + (p.alkDosing.target - tank.alk) * 4;
    alkDose = needPerDay * V;
    d.alk += needPerDay;
  }

  return { dWdt: d, returnWater: ret, steps, alkDose, denitRemoved };
}

export function step(tank: Water, p: Params, L: Loads, dtDays: number, hour: number): Water {
  const { dWdt } = rates(tank, p, L, hour);
  const next = {} as Water;
  for (const key of WATER_KEYS) next[key] = Math.max(key === "alk" ? 1 : 0, tank[key] + dWdt[key] * dtDays);
  // Tích phân DIC và kiềm rồi thiết lập lại CO₂ tự do theo cân bằng carbonat.
  next.co2 = co2FromDIC(
    next.alk,
    Math.max(0, dic(tank.alk, tank.co2, p.temp, p.salinity) + dWdt.co2 * dtDays),
    p.temp,
    p.salinity,
  );
  return next;
}

/** Trạng thái ổn định (tải trung bình ngày), tìm bằng tích phân tới khi hết thay đổi. */
export function steadyState(p: Params, start?: Water): Water {
  const L = loads(p);
  const pp = { ...p, mealPulses: false };
  let w: Water = start ?? { ...makeupWater(p), tan: 0.5, no2: 0.1, no3: 20, tss: 5 };
  const V = L.totalVolume;
  const turnover = (pp.pumpOn ? pp.flow * 24 : 0) + (pp.exchange / 100) * V + (pp.denit.on ? pp.denit.flow * 24 : 0);
  const dt = Math.min((0.5 * V) / Math.max(turnover, 1e-6), 0.02);
  for (let i = 0; i < 40000; i++) {
    const next = step(w, pp, L, dt, 12);
    let change = 0;
    for (const key of WATER_KEYS)
      change = Math.max(change, Math.abs(next[key] - w[key]) / Math.max(1e-3, Math.abs(w[key])));
    w = next;
    if (i > 50 && change < 1e-7) break;
  }
  return w;
}

/* ---------------- số liệu thiết bị (như mục 工艺单元 của iRAS) ---------------- */

export interface UnitReport {
  loads: Loads;
  averageLoads: { tan: number; o2: number; co2: number };
  peakLoads: { tan: number; o2: number; co2: number };
  biofilter: Biofilter & { removed: number; o2: number; alk: number; designTan: number; airFlow: number };
  rdf: { solids: number; backwash: number };
  degasser: { airFlow: number; co2Removed: number };
  pump: { power: number; head: number; turnover: number };
  uv: { flow: number; power: number };
  oxygen: { pureO2: number; tgpOutlet: number };
  tgpTank: number;
  denit: { removed: number; methanol: number; alkBack: number };
  alk: { consumed: number; dose: number; nahco3: number };
}

export function report(tank: Water, p: Params): UnitReport {
  const L = loads(p);
  const qDay = p.pumpOn ? p.flow * 24 : 0;
  const r = rates(tank, p, L);
  const byId = Object.fromEntries(r.steps.map((s) => [s.id, s.out])) as Record<UnitId, Water>;
  const k = biofilterKinetics(p, byId.skimmer.tan, qDay);
  const removed = qDay * byId.skimmer.tan * k.etaTan;
  // Cùng giả định dị dưỡng bậc nhất như cân bằng trong bể; tải nền không nhân hệ số bữa ăn.
  const heterotrophic = (0.02 * tank.tss + 0.05 * tank.dom) * L.totalVolume;
  const averageLoads = { tan: L.tan, o2: L.o2 + heterotrophic, co2: (L.o2 + heterotrophic) * 1.375 };
  const peakLoads = {
    tan: L.tan * p.peakFactor,
    o2: L.o2 * p.peakFactor + heterotrophic,
    co2: (L.o2 * p.peakFactor + heterotrophic) * 1.375,
  };
  // Côn ôxy hiệu suất hoà tan ~85%.
  // Định cỡ theo tải giờ cao điểm, hệ số truyền ôxy 85% như giả định thiết kế hiện hữu.
  const pureO2 =
    p.oxygen.on && p.pumpOn
      ? (qDay * Math.max(0, byId.oxygen.do - byId.pump.do) + L.o2 * Math.max(0, p.peakFactor - 1)) / 0.85 / 1000
      : 0;
  const denitRemoved = r.denitRemoved;
  const o2Nitri = (removed * 4.57) / 1000; // kg/ngày
  // Gió MBBR: đủ ôxy (không khí 0.28 kg O₂/m³, hiệu suất truyền 5%) hoặc đủ khuấy trộn (~5 m³/h mỗi m³ bể, bể = giá thể ÷ 50%).
  const airFlow = p.biofilter.on
    ? Math.max((o2Nitri * p.peakFactor) / (0.28 * 0.05) / 24, 5 * (p.biofilter.media / 0.5))
    : 0;
  return {
    loads: L,
    averageLoads,
    peakLoads,
    biofilter: {
      ...k,
      removed,
      o2: o2Nitri,
      alk: (removed * 7.14) / 1000,
      designTan: L.species.limits.tan * 0.5,
      airFlow,
    },
    rdf: { solids: (qDay * byId.culture.tss * (p.rdf.on ? p.rdf.efficiency : 0)) / 1000, backwash: qDay * 0.004 },
    degasser: {
      airFlow: p.degasser.on ? p.flow * p.degasser.gl : 0,
      co2Removed:
        (qDay *
          Math.max(
            0,
            dic(byId.biofilter.alk, byId.biofilter.co2, p.temp, p.salinity) -
              dic(byId.degasser.alk, byId.degasser.co2, p.temp, p.salinity),
          )) /
        1000,
    },
    pump: {
      power: p.pumpOn ? (1000 * 9.81 * (p.flow / 3600) * 7) / 0.6 / 1000 : 0,
      head: 7,
      turnover: (L.cultureVolume / Math.max(p.flow, 1e-6)) * 60,
    },
    uv: { flow: p.flow * (p.uv.on ? p.uv.bypass : 0), power: p.uv.on ? p.flow * p.uv.bypass * p.uv.dose * 0.0012 : 0 },
    oxygen: { pureO2, tgpOutlet: describe(byId.oxygen, p).tgp },
    tgpTank: describe(tank, p).tgp,
    denit: { removed: denitRemoved, methanol: (denitRemoved * 2.47) / 1000, alkBack: (denitRemoved * 3.57) / 1000 },
    alk: { consumed: (removed * 7.14) / 1000, dose: r.alkDose / 1000, nahco3: ((r.alkDose / 1000) * 84.01) / 50.04 },
  };
}

/* ---------------- cảnh báo kiểu iRAS ---------------- */

export type Level = "ok" | "warn" | "bad";

export interface Warning {
  level: Level;
  text: string;
}

/** Ba mức như iRAS: vượt ngưỡng đỏ, quá nửa ngưỡng vàng, còn lại xanh. */
export function levelMax(v: number, limit: number): Level {
  return v > limit ? "bad" : v > limit / 2 ? "warn" : "ok";
}

export function levelOf(key: keyof Point, v: number, s: Species): Level | null {
  const l = s.limits;
  switch (key) {
    case "tan":
      return levelMax(v, l.tan);
    case "nh3":
      return levelMax(v, l.nh3);
    case "no2":
      return levelMax(v, l.no2);
    case "no3":
      return levelMax(v, l.no3);
    case "tss":
      return levelMax(v, l.tss);
    case "co2":
      return levelMax(v, l.co2);
    case "do":
      return v < l.doMin ? "bad" : v < l.doMin * 1.15 ? "warn" : "ok";
    case "ph":
      return v < l.phMin || v > l.phMax ? "bad" : v < l.phMin + 0.1 || v > l.phMax - 0.1 ? "warn" : "ok";
    case "omega":
      return v < 1 ? (v < 0.6 ? "bad" : "warn") : "ok";
    default:
      return null;
  }
}

export function warnings(chain: { id: UnitId; point: Point }[], p: Params, rep: UnitReport): Warning[] {
  const s = rep.loads.species;
  const out: Warning[] = [];
  const tank = chain[0]?.point;
  if (!tank) return out;
  if (tank.tgp > 102)
    out.push({
      level: tank.tgp > 105 ? "bad" : "warn",
      text: `TGP bể nuôi ${fmt(tank.tgp, 1)}% vượt ${tank.tgp > 105 ? 105 : 102}%: nguy cơ bệnh bọt khí.`,
    });
  if (p.pumpOn && p.oxygen.on && rep.oxygen.tgpOutlet > 110)
    out.push({
      level: "warn",
      text: `TGP sau côn ôxy ${fmt(rep.oxygen.tgpOutlet, 1)}% vượt 110%: nguy cơ bệnh bọt khí gần vòi cấp nước.`,
    });

  if (!p.pumpOn)
    out.push({
      level: "bad",
      text: "Bơm tuần hoàn đang dừng: nước không qua xử lý, TAN và CO₂ tích tụ, DO tụt trong bể nuôi.",
    });

  if (rep.biofilter.fTemp < 1.5) {
    out.push({
      level: "warn",
      text: `Nước ${fmt(p.temp, 1)} °C: hệ số nhiệt nitrat hoá ${fmt(rep.biofilter.fTemp, 2)}×, cần nhiều giá thể hơn để giữ TAN.`,
    });
  }
  if (p.salinity > 0) {
    out.push({
      level: "ok",
      text: `Độ mặn ${fmt(p.salinity, Number.isInteger(p.salinity) ? 0 : 1)}‰: hệ số mặn nitrat hoá ${fmt(rep.biofilter.fSalt, 2)}×, DO bão hoà thấp hơn nước ngọt ~${fmt(0.575 * p.salinity, 0)}%.`,
    });
  }
  if (p.biofilter.maturity < 0.8) {
    out.push({
      level: "warn",
      text: `Bể vi sinh mới chín ${Math.round(p.biofilter.maturity * 100)}%: vi khuẩn ôxy hoá nitrit chưa đủ, NO₂⁻ dễ tăng vọt.`,
    });
  }

  const worst = (key: keyof Point) => chain.reduce((a, c) => (c.point[key] > a.point[key] ? c : a), chain[0]);
  const nh3 = worst("nh3");
  if (levelOf("nh3", nh3.point.nh3, s) !== "ok") {
    out.push({
      level: levelOf("nh3", nh3.point.nh3, s)!,
      text: `NH₃ tự do ${fmt(nh3.point.nh3, 1)} µg/L tại ${UNIT_LABEL[nh3.id]} (${fmt(nh3.point.fNh3 * 100, 2)}% TAN ở pH ${fmt(nh3.point.ph, 2)}). Ngưỡng ${s.name}: ${fmt(s.limits.nh3, 0)} µg/L.`,
    });
  }
  const no2 = worst("no2");
  if (levelOf("no2", no2.point.no2, s) !== "ok") {
    out.push({
      level: levelOf("no2", no2.point.no2, s)!,
      text: `NO₂⁻ ${fmt(no2.point.no2, 2)} mg/L: bước NO₂⁻ → NO₃⁻ chưa theo kịp.`,
    });
  }
  if (levelOf("tan", tank.tan, s) === "bad") {
    out.push({
      level: "bad",
      text: `TAN bể nuôi ${fmt(tank.tan, 2)} mg/L vượt ${fmt(s.limits.tan, 1)}: tăng giá thể vi sinh hoặc lưu lượng tuần hoàn.`,
    });
  }
  const minOmega = chain.reduce((a, c) => (c.point.omega < a.point.omega ? c : a), chain[0]);
  if (p.salinity > 0 && minOmega.point.omega < 1) {
    out.push({
      level: minOmega.point.omega < 0.6 ? "bad" : "warn",
      text: `Ω canxit ${fmt(minOmega.point.omega, 2)} < 1 tại ${UNIT_LABEL[minOmega.id]}: nước ăn mòn CaCO₃, bất lợi cho giáp xác cứng vỏ sau lột. Tăng kiềm hoặc khử CO₂.`,
    });
  }
  if (levelOf("co2", tank.co2, s) === "bad")
    out.push({
      level: "bad",
      text: `CO₂ ${fmt(tank.co2, 1)} mg/L vượt ${fmt(s.limits.co2, 0)}: tăng G:L tháp khử khí.`,
    });
  if (tank.do < s.limits.doMin)
    out.push({ level: "bad", text: `DO bể nuôi ${fmt(tank.do, 1)} mg/L dưới ${fmt(s.limits.doMin, 1)}.` });
  if (levelOf("no3", tank.no3, s) === "bad")
    out.push({ level: "warn", text: `NO₃⁻ ${fmt(tank.no3, 0)} mg/L: tăng thay nước hoặc lưu lượng nhánh khử nitrat.` });
  if (rep.pump.turnover > 60 && p.pumpOn)
    out.push({
      level: "warn",
      text: `Một vòng tuần hoàn mất ${fmt(rep.pump.turnover, 0)} phút cho thể tích nuôi: nên dưới 60 phút.`,
    });
  return out;
}

export function buildChain(tank: Water, p: Params) {
  return passChain(tank, p).map((s) => ({ ...s, point: describe(s.out, p) }));
}
