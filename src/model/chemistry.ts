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

/** pK₁ của hệ carbonat, thang pH tổng; tại S = 0 dùng giới hạn nước ngọt. */
export function pK1(tC: number, salinity = 0): number {
  const T = K(tC);
  const s = Math.max(0, salinity), r = Math.sqrt(s);
  // Millero (2010), phương trình 16–21 và bảng 2, thang pH tổng.
  return -126.34048 + 6320.813/T + 19.568224*Math.log(T) + 13.4051*r + 0.03185*s - 0.00005218*s*s + (-531.095*r - 5.7789*s)/T - 2.0663*r*Math.log(T);
}

/** pK₂ của hệ carbonat, thang pH tổng; tại S = 0 dùng giới hạn nước ngọt. */
export function pK2(tC: number, salinity = 0): number {
  const T = K(tC);
  const s = Math.max(0, salinity), r = Math.sqrt(s);
  // Millero (2010), phương trình 16–21 và bảng 3, thang pH tổng.
  return -90.18333 + 5143.692/T + 14.613358*Math.log(T) + 21.5724*r + 0.1212*s - 0.0003714*s*s + (-798.292*r - 18.951*s)/T - 3.403*r*Math.log(T);
}

// Dickson (1990), phương trình 23, hằng số borat trên thang pH tổng.
function boronK(tC: number, s: number): number {
  const t = K(tC), r = Math.sqrt(s);
  return Math.exp((-8966.9 - 2890.53*r - 77.942*s + 1.728*s*r - 0.0996*s*s)/t + 148.0248 + 137.1942*r + 1.62142*s + (-24.4344 - 25.085*r - 0.2474*s)*Math.log(t) + 0.053105*r*t);
}
// Millero (1995), hằng số phân ly nước, xấp xỉ thang tổng.
function waterK(tC: number, s: number): number {
  const t = K(tC);
  return Math.exp(148.96502 - 13847.26/t - 23.6521*Math.log(t) + (118.67/t - 5.977 + 1.0495*Math.log(t))*Math.sqrt(s) - 0.01615*s);
}
// Dickson và cộng sự (2007): TA = HCO₃ + 2CO₃ + B(OH)₄ + OH − H.
function alkalinityAt(ph: number, carbon: number, tC: number, salinity: number, fixedDIC: boolean): number {
  const s = Math.max(0, salinity), h = 10 ** -ph, k1 = 10 ** -pK1(tC,s), k2 = 10 ** -pK2(tC,s);
  const ratio = k1/h, ratio2 = ratio*k2/h;
  const co2 = fixedDIC ? carbon/(1+ratio+ratio2) : carbon;
  const kb = boronK(tC,s);
  // Uppström (1974): tổng bo = 0,0004157 × S/35 mol/kg.
  const borate = 0.0004157*s/35 * kb/(kb+h);
  return co2*(ratio+2*ratio2) + borate + waterK(tC,s)/h - h;
}
function bisect(target: number, carbon: number, tC: number, s: number, fixedDIC: boolean): number {
  let lo = 0, hi = 14;
  for (let i = 0; i < 38; i++) { const mid = (lo+hi)/2; if (alkalinityAt(mid,carbon,tC,s,fixedDIC) < target) lo = mid; else hi = mid; }
  return (lo+hi)/2;
}
/** TA: mg/L CaCO₃; CO₂ và DIC: mg/L quy đổi CO₂. */
export function solvePH(ta: number, co2: number, tC: number, s = 0): number {
  return bisect(ta/50040, Math.max(0,co2)/44010, tC,s,false);
}
// Dickson và cộng sự (2007): cân bằng khối lượng carbon vô cơ.
export function dic(ta: number, co2: number, tC: number, s = 0): number {
  const h = 10 ** -solvePH(ta,co2,tC,s), k1 = 10 ** -pK1(tC,s), k2 = 10 ** -pK2(tC,s);
  return Math.max(0,co2)*(1+k1/h+k1*k2/(h*h));
}
export function co2FromDIC(ta: number, total: number, tC: number, s = 0): number {
  const ph = bisect(ta/50040,Math.max(0,total)/44010,tC,s,true), h = 10 ** -ph;
  const k1 = 10 ** -pK1(tC,s), k2 = 10 ** -pK2(tC,s);
  return Math.max(0,total)/(1+k1/h+k1*k2/(h*h));
}
// Van Slyke (1922): β = dTA/dpH tại DIC không đổi, sai phân trung tâm.
export function bufferBeta(ta: number, co2: number, tC: number, s = 0): number {
  const ph = solvePH(ta,co2,tC,s), total = dic(ta,co2,tC,s)/44010, delta = 0.001;
  return (alkalinityAt(ph+delta,total,tC,s,true)-alkalinityAt(ph-delta,total,tC,s,true))*50040/(2*delta);
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
  // Cân bằng carbonat, borat và nước theo Dickson và cộng sự (2007).
  const h = 10 ** -pH, k2 = 10 ** -pK2(tC, salinity);
  const hco3 = Math.max(0, alkalinity / 50040 - alkalinityAt(pH, 0, tC, salinity, false)) / (1 + 2*k2/h);
  const co3 = hco3 * k2/h;
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
