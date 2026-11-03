/*
 * Hoá học nước dùng chung. Mọi nồng độ N tính theo nitơ (mg N/L).
 * Các công thức chọn theo cách iRAS trình bày: amoni tự do theo pH–nhiệt–mặn,
 * pH từ cân bằng carbonat (kiềm + CO₂), độ bão hoà canxit Ω cho giáp xác.
 */

const K = (tC: number) => tC + 273.15;

/** Lực ion gần đúng của nước mặn theo độ mặn S (‰). */
export function ionicStrength(salinity: number): number {
  const s = Math.max(0, salinity);
  return (19.9273 * s) / (1000 - 1.005109 * s);
}

/**
 * Tỉ lệ NH₃ không ion hoá trong TAN.
 * pKa nước ngọt: Emerson và cộng sự (1975). Hiệu chỉnh mặn: Khoo và cộng sự (1977).
 */
export function freeAmmoniaFraction(pH: number, tC: number, salinity = 0): number {
  let pKa = 0.09018 + 2729.92 / K(tC);
  if (salinity > 0) pKa += (0.1552 - 0.0003142 * tC) * ionicStrength(salinity);
  return 1 / (1 + 10 ** (pKa - pH));
}

/** pK₁ của hệ carbonat. Nước ngọt: Harned & Davis (1943); mặn: hạ dần tới ~0.49 ở 35‰. */
export function pK1(tC: number, salinity = 0): number {
  const T = K(tC);
  const fresh = 3404.71 / T + 0.032786 * T - 14.8435;
  return fresh - 0.49 * Math.sqrt(Math.max(0, salinity) / 35);
}

/** pK₂ của hệ carbonat. Nước ngọt: Harned & Scholes (1941); mặn: hạ dần tới ~1.36 ở 35‰. */
export function pK2(tC: number, salinity = 0): number {
  const T = K(tC);
  const fresh = 2902.39 / T + 0.02379 * T - 6.498;
  return fresh - 1.36 * Math.sqrt(Math.max(0, salinity) / 35);
}

/**
 * pH ổn định từ kiềm tổng (mg/L CaCO₃) và CO₂ hoà tan (mg/L), theo Henderson–Hasselbalch.
 * Bỏ qua CO₃²⁻ trong kiềm, sai số nhỏ khi pH < 8.5.
 */
export function phFromCarbonate(alkalinity: number, co2: number, tC: number, salinity = 0): number {
  const hco3 = Math.max(alkalinity, 1) / 50.04; // mmol/L
  const co2mmol = Math.max(co2, 0.05) / 44.01; // mmol/L
  return pK1(tC, salinity) + Math.log10(hco3 / co2mmol);
}

/** Ca²⁺ (mmol/L): nước mặn theo tỉ lệ cố định của nước biển, nước ngọt theo độ cứng canxi. */
export function calcium(salinity: number, calciumHardness: number): number {
  const sea = (10.28 * Math.max(0, salinity)) / 35;
  const fresh = calciumHardness / 100.09;
  return salinity > 0 ? Math.max(sea, fresh) : fresh;
}

/**
 * Độ bão hoà canxit Ω = [Ca²⁺][CO₃²⁻] / Ksp. Ω < 1: nước ăn mòn CaCO₃, bất lợi cho
 * giáp xác cứng vỏ sau lột và cho bê tông bể. Chỉ dùng định tính, như iRAS ghi chú.
 */
export function calciteSaturation(
  pH: number,
  alkalinity: number,
  tC: number,
  salinity: number,
  calciumHardness: number,
): number {
  const hco3 = alkalinity / 50.04 / 1000; // mol/L
  const co3 = hco3 * 10 ** (pH - pK2(tC, salinity));
  const ca = calcium(salinity, calciumHardness) / 1000;
  const logKsp = -8.48 + 2.11 * Math.sqrt(Math.max(0, salinity) / 35);
  return (ca * co3) / 10 ** logKsp;
}

/** Ôxy bão hoà (mg/L) ở 1 atm, phương trình Benson & Krause (1984) dùng trong APHA 4500-O. */
export function oxygenSaturation(tC: number, salinity = 0): number {
  const T = K(tC);
  const s = Math.max(0, salinity);
  const lnC =
    -139.34411 +
    1.575701e5 / T -
    6.642308e7 / T ** 2 +
    1.2438e10 / T ** 3 -
    8.621949e11 / T ** 4 -
    s * (0.017674 - 10.754 / T + 2140.7 / T ** 2);
  return Math.exp(lnC);
}

/** CO₂ cân bằng với không khí (~420 ppm), mg/L. */
export function co2Equilibrium(tC: number): number {
  return 0.77 * 1.024 ** (20 - tC);
}

/** Hệ số nhiệt nitrat hoá θ^(T−10), θ = 1.09, chặn trên ở 25 °C như iRAS. */
export function nitrificationTempFactor(tC: number, cap = 25): number {
  return 1.09 ** (Math.min(tC, cap) - 10);
}

/** Hệ số mặn của nitrat hoá (1 − 0.01·S), như iRAS. */
export function nitrificationSaltFactor(salinity: number): number {
  return Math.max(0.3, 1 - 0.01 * Math.max(0, salinity));
}
