/*
 * Đối tượng nuôi. Ngưỡng NH₃ tự do dài hạn lấy theo bảng iRAS (µg/L N):
 * cá mú 30, tôm thẻ 50, rô phi 100; cua biển dùng mức giáp xác 50.
 * Hệ số tiêu hao ôxy và cho ăn là giá trị khởi điểm để minh hoạ, cần hiệu chỉnh theo trại.
 */

export type CultureKind = "boxes" | "tanks";

export interface Species {
  id: string;
  name: string;
  latin: string;
  culture: CultureKind;
  unitLabel: string;
  temp: number; // °C
  salinity: number; // ‰
  feedRate: number; // % sinh khối/ngày
  protein: number; // tỉ lệ đạm thức ăn
  oxygenPerFeed: number; // kg O₂ / kg thức ăn
  limits: {
    tan: number; // mg N/L
    nh3: number; // µg N/L
    no2: number; // mg N/L
    no3: number; // mg N/L
    doMin: number; // mg/L
    phMin: number;
    phMax: number;
    co2: number; // mg/L
    tss: number; // mg/L
  };
  defaults: {
    units: number; // số hộp hoặc số bể
    avgWeight: number; // g/con
    perUnit: number; // con/hộp hoặc con/bể
    unitVolume: number; // m³ nước mỗi hộp/bể
  };
  note: string;
}

export const SPECIES: Species[] = [
  {
    id: "mud-crab",
    name: "Cua biển (nuôi hộp)",
    latin: "Scylla paramamosain",
    culture: "boxes",
    unitLabel: "hộp",
    temp: 28,
    salinity: 20,
    feedRate: 3,
    protein: 0.4,
    // Hô hấp cua bùn ~0.1–0.2 mg O₂/g·h ⇒ ~0.15 kg O₂ mỗi kg thức ăn ở mức cho ăn 3%.
    oxygenPerFeed: 0.15,
    limits: { tan: 1.0, nh3: 50, no2: 1.0, no3: 50, doMin: 4.5, phMin: 7.6, phMax: 8.5, co2: 15, tss: 15 },
    defaults: { units: 240, avgWeight: 300, perUnit: 1, unitVolume: 0.008 },
    note: "Cua lột cần nước bão hoà CaCO₃ (Ω > 1) để cứng vỏ. Mỗi hộp một con.",
  },
  {
    id: "vannamei",
    name: "Tôm thẻ chân trắng",
    latin: "Litopenaeus vannamei",
    culture: "tanks",
    unitLabel: "bể",
    temp: 29,
    salinity: 15,
    feedRate: 2.5,
    protein: 0.38,
    oxygenPerFeed: 0.4,
    limits: { tan: 1.0, nh3: 50, no2: 1.0, no3: 60, doMin: 5, phMin: 7.5, phMax: 8.5, co2: 15, tss: 20 },
    defaults: { units: 4, avgWeight: 15, perUnit: 6000, unitVolume: 12 },
    note: "Tôm nhạy với NO₂⁻ khi độ mặn thấp.",
  },
  {
    id: "grouper",
    name: "Cá mú",
    latin: "Epinephelus spp.",
    culture: "tanks",
    unitLabel: "bể",
    temp: 27,
    salinity: 30,
    feedRate: 1.5,
    protein: 0.48,
    oxygenPerFeed: 0.5,
    limits: { tan: 1.0, nh3: 30, no2: 0.5, no3: 50, doMin: 5, phMin: 7.5, phMax: 8.3, co2: 15, tss: 15 },
    defaults: { units: 4, avgWeight: 500, perUnit: 400, unitVolume: 20 },
    note: "Ngưỡng NH₃ tự do 30 µg/L theo iRAS.",
  },
  {
    id: "tilapia",
    name: "Cá rô phi",
    latin: "Oreochromis niloticus",
    culture: "tanks",
    unitLabel: "bể",
    temp: 28,
    salinity: 0,
    feedRate: 2,
    protein: 0.32,
    oxygenPerFeed: 0.45,
    limits: { tan: 2.0, nh3: 100, no2: 0.5, no3: 100, doMin: 4, phMin: 6.8, phMax: 8.5, co2: 20, tss: 25 },
    defaults: { units: 4, avgWeight: 400, perUnit: 800, unitVolume: 20 },
    note: "Nước ngọt: Ω canxit chỉ để tham khảo.",
  },
];

export const speciesById = (id: string) => SPECIES.find((s) => s.id === id) ?? SPECIES[0];
