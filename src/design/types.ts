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
  bottomHeight: 0.2,
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
export function rackPosition(d: RackDesign, rack: number): [number, number] {
  if (d.layout === "một dãy") return [rack * (d.cols * (d.length + d.gap) + d.aisle), 0];
  if (d.layout === "quay lưng")
    return [Math.floor(rack / 2) * (d.cols * (d.length + d.gap) + d.aisle), (rack % 2) * d.width];
  return [0, rack * (d.width + d.aisle)];
}
