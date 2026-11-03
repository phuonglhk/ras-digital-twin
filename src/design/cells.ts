import { blocks, rackPosition, tierPitch, type RackDesign } from "./types";
export interface Cell {
  code: string;
  block: string;
  rack: number;
  column: number;
  tier: number;
  position: [number, number, number];
}
export function blockName(index: number): string {
  let n = index + 1,
    s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}
// Mã theo thứ tự cột rồi tầng; tham khảo ảnh video https://www.youtube.com/watch?v=jXCRomdc_o4
export function cells(d: RackDesign): Cell[] {
  const result: Cell[] = [];
  const bs = blocks(d);
  for (let r = 0; r < d.racks; r++) {
    const [x, z] = rackPosition(d, r);
    for (const b of bs) {
      const name = blockName(r * bs.length + b.index);
      for (let c = 0; c < b.cols; c++)
        for (let t = 0; t < d.tiers; t++)
          result.push({
            code: `${name}${c * d.tiers + t + 1}`,
            block: name,
            rack: r,
            column: c + 1,
            tier: t + 1,
            position: [
              x + b.offset + c * (d.length + d.gap) + d.length / 2,
              d.bottomHeight + t * tierPitch(d),
              z + d.width / 2,
            ],
          });
    }
  }
  return result;
}
export function cellsCsv(d: RackDesign): string {
  const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return (
    "\ufeff" +
    [
      ["Mã ô", "Khối", "Cột", "Tầng", "X (m)", "Y (m)", "Z (m)"],
      ...cells(d).map((c) => [
        c.code,
        c.block,
        String(c.column),
        String(c.tier),
        ...c.position.map((v) => v.toFixed(3)),
      ]),
    ]
      .map((row) => row.map(quote).join(","))
      .join("\r\n")
  );
}
