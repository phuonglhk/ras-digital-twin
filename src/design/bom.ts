import type { Component, System } from "./types";
export interface BomRow {
  key: string;
  system: System;
  item: string;
  spec: string;
  unit: string;
  quantity: number;
  note: string;
  ids: string[];
}
export function bom(components: Component[]): BomRow[] {
  const rows = new Map<string, BomRow>();
  for (const c of components) {
    const item = c.system === "khung" && c.type === "Ống thẳng" ? "Thép hộp khung" : c.type;
    const spec = c.dn ? `DN${c.dn}` : "—",
      unit = c.type === "Dây chằng cột" ? "cái" : c.length !== undefined ? "m" : "cái",
      key = [c.system, item, spec].join("|");
    const row = rows.get(key) ?? { key, system: c.system, item, spec, unit, quantity: 0, note: "", ids: [] };
    row.quantity += c.type === "Dây chằng cột" ? (c.count ?? 1) : (c.length ?? c.count ?? 1);
    row.ids.push(c.id);
    rows.set(key, row);
  }
  for (const row of rows.values())
    if (row.unit === "m" && row.item === "Ống thẳng")
      row.note = `Dự trù 5%: ${Math.ceil((row.quantity * 1.05) / 4)} cây 4 m`;
  for (const system of ["cấp", "tràn", "xả cặn", "ống chính", "ống đứng cấp", "ống đứng thoát"] as const) {
    const pipes = components.filter(
      (c) =>
        c.system === system &&
        c.end &&
        Math.hypot(c.end[0] - c.position[0], c.end[2] - c.position[2]) > Math.abs(c.end[1] - c.position[1]),
    );
    const total = pipes.reduce((n, c) => n + Math.hypot(c.end![0] - c.position[0], c.end![2] - c.position[2]), 0);
    if (total)
      rows.set(`${system}|kẹp`, {
        key: `${system}|kẹp`,
        system,
        item: "Kẹp ống",
        spec: "Theo cỡ ống",
        unit: "cái",
        quantity: Math.ceil(total),
        note: "Khoảng 1 cái/m ống ngang",
        ids: pipes.map((c) => c.id),
      });
  }
  return [...rows.values()];
}
export const displayQuantity = (n: number) =>
  Number(n.toFixed(2)).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
export type Currency = "USD" | "VND";
export type Prices = Record<string, number>;
// Giá ống và phụ kiện là ví dụ có thể sửa, không phải báo giá; hộp lấy giữa khoảng FOB tham khảo.
export function defaultPrice(row: BomRow): number {
  if (row.item === "Hộp nuôi") return 6.4;
  if (row.unit === "m") return row.system === "khung" ? 2 : 1;
  if (row.item === "Lỗ định lượng") return 0;
  if (row.item.startsWith("Van")) return 2;
  return 0.5;
}
export function priceOf(row: BomRow, prices: Prices): number {
  return prices[row.key] ?? defaultPrice(row);
}
export function amountOf(row: BomRow, prices: Prices): number {
  return Number(row.quantity.toFixed(2)) * priceOf(row, prices);
}
export function costRows(rows: BomRow[], prices: Prices, currency: Currency, exchange: number): string[][] {
  const factor = currency === "VND" ? exchange : 1;
  const money = (n: number) => displayQuantity(n * factor);
  const systems = [...new Set(rows.map((r) => r.system))];
  return systems
    .flatMap((system) => {
      const group = rows.filter((r) => r.system === system);
      return [
        ...group.map((r) => [
          r.system,
          r.item,
          r.spec,
          r.unit,
          displayQuantity(r.quantity),
          money(priceOf(r, prices)),
          money(amountOf(r, prices)),
          r.note,
        ]),
        [
          system,
          "Tổng hệ thống",
          "—",
          "—",
          "—",
          "—",
          money(group.reduce((sum, r) => sum + amountOf(r, prices), 0)),
          "",
        ],
      ];
    })
    .concat([["", "Tổng cộng", "—", "—", "—", "—", money(rows.reduce((sum, r) => sum + amountOf(r, prices), 0)), ""]]);
}
export function csv(rows: BomRow[], prices: Prices = {}, currency: Currency = "USD", exchange = 25000): string {
  const quote = (x: string) => `"${x.replace(/"/g, '""')}"`;
  return (
    "\ufeff" +
    [
      [
        "Hệ thống",
        "Hạng mục",
        "Quy cách",
        "Đơn vị",
        "Số lượng",
        `Đơn giá (${currency})`,
        `Thành tiền (${currency})`,
        "Ghi chú",
      ],
      ...costRows(rows, prices, currency, exchange),
    ]
      .map((row) => row.map(quote).join(","))
      .join("\r\n")
  );
}
