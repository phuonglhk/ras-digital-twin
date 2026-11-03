export type System = "cấp" | "tràn" | "xả cặn" | "ống đứng cấp" | "ống đứng thoát" | "ống chính" | "khung";
export interface RackDesign {
  length: number;
  width: number;
  height: number;
  floorSlope: number;
  overflowHeight: number;
  boxWeight: number | null;
  boxPreset: "bing" | "zkaqua";
  cols: number;
  tiers: number;
  racks: number;
  layout: "một dãy" | "quay lưng" | "song song";
  gap: number;
  tierSpacing: number;
  stacking: "xep-chong" | "gia-do";
  interlock: number;
  slotWidth: number;
  stackLimit: number;
  crabWeight: number;
  drainDownMinutes: number;
  drainHeaderDn: number;
  bottomHeight: number;
  aisle: number;
  flow: number;
  supplyValve: boolean;
  sludgeValve: boolean;
  flushEnabled: boolean;
  flushFlow: number;
  tierValve: boolean;
  residualHead: number;
  filterDistance: number;
  slope: number;
  headerDn: number;
}
// Kích thước hộp theo https://bingcrabhouse.co.id/spesifikasi-box-kepiting/.
// 1,5 L/phút là giá trị nhà cung cấp dẫn trong đặc tả, không phải ngưỡng của Sea Grant.
export const defaultDesign: RackDesign = {
  length: 0.43,
  width: 0.4,
  height: 0.18,
  floorSlope: 0.02,
  overflowHeight: 0.08,
  boxWeight: 1.4,
  boxPreset: "bing",
  cols: 10,
  tiers: 5,
  racks: 2,
  layout: "một dãy",
  gap: 0.01,
  tierSpacing: 0.3,
  stacking: "xep-chong",
  interlock: 0.005,
  slotWidth: 0.035,
  stackLimit: 10,
  crabWeight: 0.3,
  drainDownMinutes: 2,
  drainHeaderDn: 34,
  bottomHeight: 0.1,
  aisle: 0.8,
  flow: 1.5,
  supplyValve: false,
  sludgeValve: false,
  flushEnabled: true,
  flushFlow: 0.5, // Giả định minh hoạ khi từng hộp cùng xả, có thể nhập lại theo lưu lượng thực tế.
  tierValve: true,
  residualHead: 1,
  filterDistance: 5,
  slope: 0.01,
  headerDn: 27,
};
// Kích thước và vật liệu theo tài liệu nhà sản xuất; catalog ZKAQUA không nêu khối lượng.
// https://bingcrabhouse.co.id/spesifikasi-box-kepiting/
// https://zkaqua.en.made-in-china.com/product-group/XqTtpjkbZLVc/Crab-Box-catalog-1.html
export const boxPresets = {
  bing: {
    label: "Bing Crab House NEW GEN 5 Jumbo",
    length: 0.43,
    width: 0.4,
    height: 0.18,
    boxWeight: 1.4,
    material: "PP",
  },
  zkaqua: { label: "ZKAQUA Mud Crab Box", length: 0.42, width: 0.33, height: 0.185, boxWeight: null, material: "PE" },
} as const;
export interface Component {
  id: string;
  type: string;
  system: System;
  dn?: number;
  length?: number;
  count?: number;
  position: [number, number, number];
  end?: [number, number, number];
  rack?: number;
  tier?: number;
  col?: number;
  flow?: number;
  reversed?: boolean;
  network?: "cấp" | "thoát";
  source?: boolean;
  sink?: boolean;
  intermittent?: boolean;
  flushFlow?: number;
}
export function tierPitch(d: RackDesign): number {
  return d.stacking === "xep-chong" ? d.height - d.interlock : d.tierSpacing;
}
/** Giữ ống góp trong vùng thành hộp khi xếp chồng; vẫn dốc về ống đứng. */
export function rimSlope(d: RackDesign): number {
  if (d.stacking === "gia-do") return d.slope;
  const span = d.cols * (d.length + d.gap) + 0.08;
  return Math.min(d.slope, Math.max(0.00001, (d.overflowHeight - 0.02 - d.drainHeaderDn / 2000 - 0.002) / span));
}
/** Diện tích hình chữ nhật bao dãy và lối đi phục vụ, không gồm phòng lọc. */
export function floorArea(d: RackDesign): number {
  const span = d.cols * (d.length + d.gap);
  if (d.layout === "một dãy") return (d.racks * span + (d.racks - 1) * d.aisle) * (d.width + d.aisle);
  if (d.layout === "song song") return span * (d.racks * d.width + d.racks * d.aisle);
  const pairs = Math.ceil(d.racks / 2);
  return (pairs * span + (pairs - 1) * d.aisle) * ((d.racks > 1 ? 2 : 1) * d.width + d.aisle);
}
export function rackPosition(d: RackDesign, rack: number): [number, number] {
  if (d.layout === "một dãy") return [rack * (d.cols * (d.length + d.gap) + d.aisle), 0];
  if (d.layout === "quay lưng")
    return [Math.floor(rack / 2) * (d.cols * (d.length + d.gap) + d.aisle), (rack % 2) * d.width];
  return [0, rack * (d.width + d.aisle)];
}
