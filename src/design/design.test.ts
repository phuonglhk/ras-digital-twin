import { describe, expect, it } from "vitest";
import { boxPresets, defaultDesign, floorArea, tierPitch, type Component } from "./types";
import { decompose } from "./decompose";
import { bom, csv, costRows, amountOf } from "./bom";
import { hazenWilliams, hydraulics, uniformity } from "./hydraulics";
import { inspectNetwork } from "./network";
const small = { ...defaultDesign, racks: 1, tiers: 2, cols: 3 };
const key = (p: Component["position"]) => p.map((v) => v.toFixed(6)).join(",");
function audit(parts: Component[], network: "cấp" | "thoát") {
  const pipes = parts.filter((p) => p.network === network && p.end),
    adjacency = new Map<string, string[]>(),
    sources: string[] = [],
    sinks = new Set<string>();
  for (const p of pipes) {
    const a = key(p.position),
      b = key(p.end!);
    adjacency.set(a, [...(adjacency.get(a) ?? []), b]);
    if (!adjacency.has(b)) adjacency.set(b, []);
    if (p.source) sources.push(a);
    if (p.sink) sinks.add(b);
    if (network === "thoát") expect(p.end![1], p.id).toBeLessThan(p.position[1]);
  }
  const inbound = new Map<string, number>();
  for (const targets of adjacency.values()) for (const n of targets) inbound.set(n, (inbound.get(n) ?? 0) + 1);
  for (const [n, targets] of adjacency) {
    if (!inbound.has(n)) expect(sources).toContain(n);
    if (!targets.length) expect(sinks.has(n)).toBe(true);
  }
  for (const source of sources) {
    const seen = new Set<string>(),
      queue = [source];
    while (queue.length) {
      const node = queue.shift()!;
      if (seen.has(node)) continue;
      seen.add(node);
      queue.push(...(adjacency.get(node) ?? []));
    }
    expect([...sinks].some((s) => seen.has(s))).toBe(true);
  }
  expect(sources.length).toBeGreaterThan(0);
  expect(sinks.size).toBeGreaterThan(0);
}
describe("mạng kệ", () => {
  it("mẫu hộp", () => {
    expect(boxPresets.bing.boxWeight).toBe(1.4);
    expect(boxPresets.zkaqua.boxWeight).toBeNull();
  });
  it("đếm tay 1 kệ × 2 tầng × 3 hộp", () => {
    const p = decompose(small);
    const rows = bom(p);
    // 6 hộp, 6 ống bọc, 3 dây chằng. Đế: 2×1,32 + 2×0,4 + 4×0,1 = 3,84 m.
    // Hai ống cấp dài tổng 2,35 m và các đoạn ống tràn ngang tổng dưới 3 m: mỗi hệ 3 kẹp.
    const count = (type: string) => p.filter((x) => x.type === type).reduce((n, x) => n + (x.count ?? 0), 0);
    expect(count("Hộp nuôi")).toBe(6);
    expect(count("Ống bọc khía chân")).toBe(6);
    expect(count("Lưới chắn ống tràn")).toBe(6);
    expect(count("Van chặn tầng")).toBe(2);
    expect(count("Van xả cặn")).toBe(0);
    expect(count("Co 90°")).toBe(8);
    expect(p.filter((c) => c.type === "Dây chằng cột")).toHaveLength(3);
    expect(rows.find((r) => r.item === "Đế kê")?.quantity).toBeCloseTo(3.84);
    expect(rows.find((r) => r.item === "Dây chằng cột")?.quantity).toBe(3);
    expect(rows.some((r) => r.item === "Thanh đỡ tầng" || r.system === "xả cặn")).toBe(false);
    expect(rows.find((r) => r.item === "Kẹp ống" && r.system === "cấp")?.quantity).toBe(3);
    expect(rows.find((r) => r.item === "Kẹp ống" && r.system === "tràn")?.quantity).toBe(3);
    const boxes = p.filter((c) => c.type === "Hộp nuôi" && c.col === 0);
    expect(boxes[1].position[1] - boxes[0].position[1]).toBeCloseTo(0.175);
    const supply = p.find((c) => c.system === "cấp" && c.dn === 27 && c.end && c.tier === 0)!;
    expect(supply.position[1] + small.headerDn / 2000).toBeCloseTo(boxes[1].position[1]);
    const rim = p.filter((c) => c.system === "tràn" && c.dn === small.drainHeaderDn && c.end && c.col === undefined);
    expect(rim).toHaveLength(6);
    expect(
      rim.every(
        (c) =>
          c.position[1] + small.drainHeaderDn / 2000 <
          small.bottomHeight + (c.tier ?? 0) * tierPitch(small) + small.overflowHeight,
      ),
    ).toBe(true);
    expect(p.some((c) => c.intermittent)).toBe(false);
    expect(inspectNetwork(p)).toEqual([]);
  });
  it("các tuỳ chọn van và tắt nhánh rửa", () => {
    const p = decompose({ ...small, stacking: "gia-do", supplyValve: true, sludgeValve: true });
    expect(p.filter((c) => c.type === "Van cấp hộp")).toHaveLength(6);
    expect(p.filter((c) => c.type === "Van xả cặn")).toHaveLength(6);
    expect(decompose({ ...small, tierValve: false }).filter((c) => c.type === "Van chặn tầng")).toHaveLength(0);
    expect(decompose({ ...small, flushEnabled: false }).filter((c) => c.intermittent)).toHaveLength(0);
  });
  it.each(["một dãy", "quay lưng", "song song"] as const)("duyệt mạng %s, không hở và dốc xuống", (layout) => {
    const p = decompose({ ...small, racks: 3, layout });
    audit(p, "cấp");
    audit(p, "thoát");
    expect(inspectNetwork(p)).toEqual([]);
  });
  it.each(["một dãy", "quay lưng", "song song"] as const)("giá đỡ %s có mạng thoát liên tục", (layout) => {
    const p = decompose({ ...small, stacking: "gia-do", racks: 2, layout });
    audit(p, "cấp");
    audit(p, "thoát");
    expect(inspectNetwork(p)).toEqual([]);
  });
  it("phát hiện đoạn hở và đoạn tự chảy đi lên", () => {
    const parts = decompose(small);
    const index = parts.findIndex((x) => x.network === "thoát" && !x.source && !x.sink && x.end);
    const p = parts[index];
    expect(inspectNetwork(parts.filter((_, i) => i !== index)).length).toBeGreaterThan(0);
    const changed = parts.map((x, i) =>
      i === index ? { ...p, end: [p.end![0], p.position[1] + 0.01, p.end![2]] as Component["position"] } : x,
    );
    expect(inspectNetwork(changed).some((s) => s.includes("không dốc xuống"))).toBe(true);
  });
  it("cảnh báo thiếu khoảng hở và không cộng xả rửa vào lưu lượng", () => {
    expect(
      hydraulics({ ...small, stacking: "gia-do", tierSpacing: 0.2 }).warnings.some((w) => w.includes("Khoảng hở")),
    ).toBe(true);
    expect(
      hydraulics({ ...small, stacking: "gia-do", tierSpacing: 0.2, flushEnabled: false }).warnings.some((w) =>
        w.includes("Khoảng hở"),
      ),
    ).toBe(false);
    expect(hydraulics(small).q).toBe(9);
  });
  it("ống tràn hút đáy DN21 và ống bọc DN34", () => {
    const p = decompose(small);
    expect(p.filter((c) => c.type === "Ống bọc khía chân" && c.dn === 34)).toHaveLength(6);
    expect(p.filter((c) => c.network === "thoát" && c.system === "tràn" && c.source && c.dn === 21)).toHaveLength(6);
  });
  it("CSV cùng giá và tổng trên màn hình", () => {
    const r = bom(decompose(small)),
      s = csv(r, {}, "VND", 25000);
    expect(s.startsWith("\ufeff")).toBe(true);
    for (const fields of costRows(r, {}, "VND", 25000))
      expect(s).toContain(fields.map((x) => `"${x.replace(/"/g, '""')}"`).join(","));
    expect(amountOf(r.find((x) => x.item === "Hộp nuôi")!, {})).toBeCloseTo(38.4);
  });
  it("phân rã 1000 hộp", () =>
    expect(
      decompose({ ...defaultDesign, racks: 5, tiers: 8, cols: 25 }).filter((x) => x.type === "Hộp nuôi"),
    ).toHaveLength(1000));
  it("giá đỡ vẫn có thanh tầng và nhánh rửa", () => {
    const p = decompose({ ...small, stacking: "gia-do" });
    expect(p.filter((c) => c.type === "Thanh đỡ tầng")).toHaveLength(4);
    expect(p.some((c) => c.system === "xả cặn")).toBe(true);
    expect(inspectNetwork(p)).toEqual([]);
  });
  it("cảnh báo khe, chiều cao và lưu lượng xả hộp", () => {
    expect(tierPitch(small)).toBeCloseTo(0.175);
    const h = hydraulics({ ...small, tiers: 11, drainHeaderDn: 42 });
    expect(h.warnings.some((w) => w.includes("bề rộng rãnh"))).toBe(true);
    expect(h.warnings.some((w) => w.includes("ngưỡng giả định"))).toBe(true);
    expect(h.bottomLoad).toBeCloseTo(10 * (1.4 + 13.76 + 0.3));
    expect(h.flushRequired).toBeCloseTo(13.76 / 2 + 2 * 1.5);
    expect(hydraulics({ ...small, slotWidth: 0.02 }).warnings.some((w) => w.includes("bề rộng rãnh"))).toBe(true);
    expect(hydraulics(small).warnings.some((w) => w.includes("xả hết một hộp"))).toBe(true);
    expect(hydraulics({ ...small, boxWeight: null }).bottomLoad).toBeNull();
  });
  it("diện tích sàn có lối đi cho 1000 hộp", () =>
    expect(floorArea({ ...defaultDesign, racks: 5, tiers: 8, cols: 25 })).toBeCloseTo(69.84));
});
describe("thuỷ lực", () => {
  it("Hazen–Williams: 100 m, 10 L/s, D 100 mm, C 150", () =>
    expect(hazenWilliams(100, 0.01, 0.1)).toBeCloseTo(1.46, 2));
  it("đồng đều giảm khi ống dài hơn hoặc nhỏ hơn", () => {
    expect(uniformity(20, 20, 27, 1)).toBeLessThan(uniformity(5, 20, 27, 1));
    expect(uniformity(10, 20, 21, 1)).toBeLessThan(uniformity(10, 20, 34, 1));
  });
  it("lưu lượng và sump", () => {
    const h = hydraulics(small);
    expect(h.boxes).toBe(6);
    expect(h.q).toBe(9);
    expect(h.sump).toBe(45);
    expect(h.minimum).toBeCloseTo(0.876, 2);
  });
});
