import { freeAmmoniaFraction } from "./chemistry";

export type UnitKind =
  | "tan"
  | "nh3n"
  | "nh3"
  | "nh4n"
  | "nh4"
  | "no2n"
  | "no2"
  | "no3n"
  | "no3"
  | "alk"
  | "mmol"
  | "dkh"
  | "salinity"
  | "density";
export const unitNames: Record<UnitKind, string> = {
  tan: "TAN (mg N/L)",
  nh3n: "NH₃-N (mg N/L)",
  nh3: "NH₃ (mg/L)",
  nh4n: "NH₄⁺-N (mg N/L)",
  nh4: "NH₄⁺ (mg/L)",
  no2n: "NO₂⁻-N (mg N/L)",
  no2: "NO₂⁻ (mg/L)",
  no3n: "NO₃⁻-N (mg N/L)",
  no3: "NO₃⁻ (mg/L)",
  alk: "Kiềm (mg/L CaCO₃)",
  mmol: "Kiềm (mmol/L CaCO₃)",
  dkh: "Kiềm (dKH)",
  salinity: "Độ mặn (‰)",
  density: "Tỉ trọng gần đúng",
};
const groups: UnitKind[][] = [
  ["tan", "nh3n", "nh3", "nh4n", "nh4"],
  ["no2n", "no2"],
  ["no3n", "no3"],
  ["alk", "mmol", "dkh"],
  ["salinity", "density"],
];
export function compatibleUnits(unit: UnitKind): UnitKind[] {
  return groups.find((group) => group.includes(unit)) ?? [];
}
/** Tỉ trọng chỉ là xấp xỉ, còn chuyển TAN giả định cân bằng NH₃/NH₄⁺. */
export function convertUnit(
  value: number,
  from: UnitKind,
  to: UnitKind,
  ph: number,
  temp: number,
  salt: number,
): number {
  if (!compatibleUnits(from).includes(to)) return NaN;
  if (from === to) return value;
  if (from === "salinity" || from === "density") {
    return from === "salinity" ? 1 + value * 0.00075 : (value - 1) / 0.00075;
  }
  if (compatibleUnits("tan").includes(from)) {
    const fraction = freeAmmoniaFraction(ph, temp, salt);
    const perTan: Partial<Record<UnitKind, number>> = {
      tan: 1,
      nh3n: fraction,
      nh3: (fraction * 17.031) / 14.007,
      nh4n: 1 - fraction,
      nh4: ((1 - fraction) * 18.039) / 14.007,
    };
    return (value / perTan[from]!) * perTan[to]!;
  }
  const factors: Partial<Record<UnitKind, number>> = {
    no2n: 1,
    no2: 46.005 / 14.007,
    no3n: 1,
    no3: 62.004 / 14.007,
    alk: 1,
    mmol: 1 / 50.04,
    dkh: 1 / 17.848,
  };
  return (value / factors[from]!) * factors[to]!;
}
