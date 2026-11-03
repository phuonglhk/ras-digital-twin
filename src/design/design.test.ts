import { describe, expect, it } from "vitest";
import { blocks, boxPresets, defaultDesign, floorArea, tierPitch, type Component } from "./types";
import { decompose } from "./decompose";
import { bom, csv, costRows, amountOf, displaySpec } from "./bom";
import { defaultParams, describe as describeWater, steadyState } from "../model/process";
import {
  distributedHeaderLoss,
  fullFlowLoss,
  fullHeaderLoss,
  hazenWilliams,
  hydraulics,
  trenchCapacity,
  uniformity,
} from "./hydraulics";
import { inspectNetwork } from "./network";
import { filterRoom } from "./filtration";
import { blockName, cells, cellsCsv } from "./cells";
import { assembledComponents, assemblyCaptions } from "./assembly";
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
    // 6 hộp, 6 ống bọc, 3 dây chằng. Một hàng gạch 1,32 m cần 4 viên dài 0,4 m.
    // Hai ống cấp tổng dưới 3 m cần 3 kẹp; ống tràn cộng đoạn nối cân bằng cần 4 kẹp.
    const count = (type: string) => p.filter((x) => x.type === type).reduce((n, x) => n + (x.count ?? 0), 0);
    expect(count("Hộp nuôi")).toBe(6);
    expect(count("Ống bọc khía chân")).toBe(6);
    expect(count("Lưới chắn ống tràn")).toBe(6);
    expect(count("Van chặn tầng")).toBe(2);
    expect(count("Van xả cặn")).toBe(0);
    expect(count("Co 90°")).toBe(9);
    expect(p.filter((c) => c.type === "Dây chằng cột")).toHaveLength(3);
    expect(rows.find((r) => r.item === "Gạch bê tông")?.quantity).toBe(4);
    expect(rows.find((r) => r.item === "Sỏi đệm")?.quantity).toBeCloseTo(1.32 * 0.4 * 0.05);
    expect(rows.find((r) => r.item === "Dây chằng cột")?.quantity).toBe(3);
    expect(rows.some((r) => r.item === "Thanh đỡ tầng" || r.system === "xả cặn")).toBe(false);
    expect(rows.find((r) => r.item === "Kẹp ống" && r.system === "cấp")?.quantity).toBe(3);
    expect(rows.find((r) => r.item === "Kẹp ống" && r.system === "tràn")?.quantity).toBe(4);
    const boxes = p.filter((c) => c.type === "Hộp nuôi" && c.col === 0);
    expect(boxes[1].position[1] - boxes[0].position[1]).toBeCloseTo(0.175);
    const supply = p.find((c) => c.system === "cấp" && c.dn === 27 && c.end && c.tier === 0)!;
    expect(supply.position[1] + small.headerDn / 2000).toBeCloseTo(boxes[1].position[1]);
    const rim = p.filter((c) => c.system === "tràn" && c.dn === small.drainHeaderDn && c.end && c.col === undefined);
    expect(rim).toHaveLength(8);
    expect(
      rim.every(
        (c) =>
          c.position[1] + small.drainHeaderDn / 2000 <
          small.bottomHeight + (c.tier ?? 0) * tierPitch(small) + small.overflowHeight,
      ),
    ).toBe(true);
    expect(p.some((c) => c.intermittent)).toBe(false);
    const nodes = new Set(
      p.filter((c) => c.network === "thoát" && c.end).flatMap((c) => [key(c.position), key(c.end!)]),
    );
    for (const bridge of p.filter((c) => c.type === "Ống nối cân bằng")) {
      expect(nodes.has(key(bridge.position))).toBe(true);
      expect(nodes.has(key(bridge.end!))).toBe(true);
    }
    expect(inspectNetwork(p)).toEqual([]);
  });
  it("các tuỳ chọn van và tắt nhánh rửa", () => {
    const p = decompose({ ...small, stacking: "gia-do", supplyValve: true, sludgeValve: true });
    expect(p.filter((c) => c.type === "Van cấp hộp")).toHaveLength(6);
    expect(p.filter((c) => c.type === "Van xả cặn")).toHaveLength(6);
    expect(decompose({ ...small, tierValve: false }).filter((c) => c.type === "Van chặn tầng")).toHaveLength(0);
    expect(decompose({ ...small, flushEnabled: false }).filter((c) => c.intermittent)).toHaveLength(0);
  });
  it("cụm van hông: hai tầng, ba hộp, một hoặc hai đầu cấp", () => {
    const one = decompose(small),
      both = decompose({ ...small, supplyEnds: "hai" });
    const n = (parts: Component[], name: string) =>
      parts.filter((x) => x.type === name).reduce((s, c) => s + (c.count ?? 0), 0);
    expect(n(one, "Van chặn tầng")).toBe(2);
    expect(n(one, "Rắc co tầng cấp")).toBe(2);
    expect(n(one, "Van thoát tầng")).toBe(4);
    expect(n(one, "Rắc co tầng thoát")).toBe(4);
    expect(n(both, "Van chặn tầng")).toBe(4);
    expect(n(both, "Rắc co tầng cấp")).toBe(4);
    expect(both.filter((c) => c.type === "Hộp nuôi")).toHaveLength(6);
    expect(inspectNetwork(both)).toEqual([]);
  });
  it("ống trên cao: ba cột, hai tầng, một van mỗi ống thả", () => {
    const d = { ...small, plumbing: "ong-tren-cao" as const },
      p = decompose(d);
    expect(p.filter((c) => c.type === "Van đầu ống thả")).toHaveLength(3);
    expect(p.filter((c) => c.type === "Tê nhánh tầng")).toHaveLength(6);
    expect(p.filter((c) => c.type === "Van chặn tầng")).toHaveLength(0);
    expect(p.filter((c) => c.type === "Mương thoát hở").length).toBeGreaterThan(0);
    expect(inspectNetwork(p)).toEqual([]);
    expect(decompose({ ...d, dropEvery: 2 }).filter((c) => c.type === "Van đầu ống thả")).toHaveLength(2);
    expect(bom(p).find((c) => c.item === "Van đầu ống thả")?.quantity).toBe(3);
    expect(bom(p).find((c) => c.item === "Mương thoát hở")?.unit).toBe("m");
    expect(bom(p).find((c) => c.item === "Mương thoát hở")?.spec).toContain(`${d.trenchWidth} m × ${d.trenchDepth} m`);
    expect(
      p
        .filter((c) => c.system === "ống chính trên cao" && c.network === "cấp")
        .every((c) => c.position[1] > d.bottomHeight + (d.tiers - 1) * tierPitch(d) + d.height),
    ).toBe(true);
  });
  it("ống trên cao liên thông khi chia nhiều khối và mỗi ống thả cấp hai cột", () => {
    const d = { ...defaultDesign, plumbing: "ong-tren-cao" as const, cols: 25, dropEvery: 2 as const };
    const p = decompose(d);
    expect(inspectNetwork(p)).toEqual([]);
    expect(p.filter((c) => c.type === "Tê cấp hộp")).toHaveLength(d.racks * d.tiers * d.cols);
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
    for (const fields of costRows(r, {}, "VND", 25000, true))
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
  it("mã ô theo khối, cột rồi tầng và CSV có BOM", () => {
    const d = { ...small, cols: 25 };
    const all = cells(d);
    expect(all).toHaveLength(50);
    expect(all[0].code).toBe("A1");
    expect(all[1].code).toBe("A2");
    expect(all[2].code).toBe("A3");
    expect(all[18].code).toBe("B1");
    expect(blockName(26)).toBe("AA");
    expect(cellsCsv(d).startsWith("\ufeff")).toBe(true);
    for (const c of decompose(d).filter((x) => x.type === "Hộp nuôi"))
      expect(all.some((x) => x.code === c.code)).toBe(true);
  });
  it("một cột vẫn thoát hai đầu và không nhân đôi hộp", () => {
    const p = decompose({ ...small, cols: 1, tiers: 1 });
    expect(p.filter((c) => c.type === "Hộp nuôi")).toHaveLength(1);
    expect(p.filter((c) => c.system === "ống đứng thoát" && c.type === "Co 90°")).toHaveLength(2);
    expect(inspectNetwork(p)).toEqual([]);
  });
  it("đầu tê và lỗ khoan, vật tư lắp ráp cộng dồn", () => {
    const tee = decompose(small),
      hole = decompose({ ...small, outletStyle: "lo-khoan" });
    expect(tee.filter((c) => c.type === "Tê cấp hộp")).toHaveLength(6);
    expect(hole.filter((c) => c.type === "Tê cấp hộp")).toHaveLength(0);
    expect(bom(hole).find((r) => r.item === "Lỗ định lượng")?.quantity).toBe(6);
    const steps = assemblyCaptions(small);
    expect(assembledComponents(tee, small, 0).some((c) => c.type === "Hộp nuôi")).toBe(false);
    expect(assembledComponents(tee, small, 1).filter((c) => c.type === "Hộp nuôi")).toHaveLength(3);
    expect(assembledComponents(tee, small, steps.length - 1)).toHaveLength(tee.length);
  });
  it("cảnh báo khe, chiều cao và lưu lượng xả hộp", () => {
    expect(tierPitch(small)).toBeCloseTo(0.175);
    const h = hydraulics({ ...small, tiers: 11, drainHeaderDn: 42 });
    expect(h.warnings.some((w) => w.includes("bề rộng rãnh"))).toBe(true);
    expect(hydraulics({ ...small, tiers: 14 }).warnings.some((w) => w.includes("vượt giới hạn giả định"))).toBe(true);
    expect(h.bottomLoad).toBeCloseTo(10 * (1.4 + 13.76 + 0.3));
    expect(h.flushRequired).toBeCloseTo(13.76 / 2 + 2 * 1.5);
    expect(hydraulics({ ...small, slotWidth: 0.02 }).warnings.some((w) => w.includes("bề rộng rãnh"))).toBe(true);
    expect(hydraulics({ ...small, availableHead: 0.0001 }).warnings.some((w) => w.includes("xả một hộp"))).toBe(true);
    expect(hydraulics({ ...small, boxWeight: null }).bottomLoad).toBeNull();
  });
  it("diện tích sàn có lối đi cho hai bố trí 1000 hộp", () => {
    expect(floorArea({ ...defaultDesign, racks: 5, tiers: 8, cols: 25 })).toBeCloseTo(72.24);
    expect(floorArea({ ...defaultDesign, racks: 4, tiers: 10, cols: 25 })).toBeCloseTo(57.6);
  });
});
describe("thuỷ lực", () => {
  it("phòng lọc theo lưu lượng và tải cua", () => {
    const room = filterRoom(defaultDesign, 3);
    // ⌈9 × (40/30) × (90/90) / 2,5⌉ = 5; 90 m³/giờ tương tự là 48.
    expect(room.lamps).toBe(5);
    expect(filterRoom({ ...defaultDesign, racks: 5, tiers: 8, cols: 25 }, 3).lamps).toBe(48);
    expect(filterRoom({ ...defaultDesign, uvQ40: 1.25 }, 3).lamps).toBe(10);
    expect(room.flow).toBe(150);
    expect(room.settling).toBeCloseTo(2.25);
    expect(room.sump).toBeCloseTo(0.75);
    expect(room.sandDiameter).toBeCloseTo(Math.sqrt((4 * (9 / 35)) / Math.PI));
    expect(room.mediaVolume).toBeGreaterThan(0);
    const rows = bom(room.components),
      settling = rows.find((r) => r.item === "Bể lắng")!;
    expect(displaySpec(settling)).toBe("2,25 m³");
    expect(csv(rows)).toContain('"2.25 m³"');
    expect(room.components.find((c) => c.type === "Bơm tuần hoàn")?.count).toBe(2);
    const alt = filterRoom({ ...defaultDesign, mechanical: "loc-trong" }, 3);
    expect(alt.components.some((c) => c.type === "Lọc trống")).toBe(true);
    expect(alt.components.some((c) => c.type === "Bình lọc cát")).toBe(false);
  });
  it("chất lượng nước dùng giá thể của phòng lọc và lưu lượng thiết kế", () => {
    const d = { ...defaultDesign, racks: 5, tiers: 8, cols: 25, crabWeight: 0.45 };
    const p = defaultParams("mud-crab");
    p.units = d.racks * d.tiers * d.cols;
    p.perUnit = 1;
    p.avgWeight = d.crabWeight * 1000;
    p.unitVolume = d.length * d.width * d.overflowHeight;
    p.flow = p.units * d.flow * 0.06;
    p.biofilter.media = filterRoom(d, 0).mediaVolume;
    const expected = describeWater(steadyState(p), p);
    expect(hydraulics(d).water.tan).toBeCloseTo(expected.tan, 8);
    expect(hydraulics(d).water.do).toBeCloseTo(expected.do, 8);
  });
  it("chia 25 cột thành ba khối cân bằng", () =>
    expect(blocks({ ...defaultDesign, cols: 25 }).map((b) => b.cols)).toEqual([9, 8, 8]));
  it.each([defaultDesign, { ...defaultDesign, racks: 5, tiers: 8, cols: 25 }])(
    "hai đầu thoát đủ cột áp cho cấu hình tham khảo",
    (d) => {
      const h = hydraulics(d);
      expect(h.continuousHead).toBeLessThanOrEqual(d.availableHead);
      expect(h.flushHead).toBeLessThanOrEqual(d.availableHead);
      expect(h.warnings.some((w) => /Ống góp tràn vượt|Mực nước khi xả|Không đủ cao độ đặt ống góp/.test(w))).toBe(
        false,
      );
      expect(inspectNetwork(decompose(d))).toEqual([]);
    },
  );
  it("cao độ cửa ra khớp chênh cao người dùng nhập", () => {
    for (const drop of [0.03, 0.05]) {
      const d = { ...small, availableHead: drop };
      const edges = decompose(d).filter(
        (c) =>
          c.system === "ống đứng thoát" && c.network === "thoát" && c.dn === d.drainHeaderDn && c.tier === 0 && c.end,
      );
      const levels = edges.map((c) => d.bottomHeight + d.overflowHeight - c.end![1]);
      expect(Math.min(...levels)).toBeCloseTo(drop, 5);
      expect(inspectNetwork(decompose(d))).toEqual([]);
    }
  });
  it("Hazen–Williams: 100 m, 10 L/s, D 100 mm, C 150", () =>
    expect(hazenWilliams(100, 0.01, 0.1)).toBeCloseTo(1.46, 2));
  it("ống đầy cộng tổn thất cục bộ theo từng cửa", () => {
    // Ví dụ đối chiếu 100 m, Q 10 L/s, đường kính trong 100 mm, C=150: 1,46 m.
    // https://reuven.tools/tools/hazen-williams/
    expect(fullFlowLoss(100, 0.01, 0.1, 150, 0)).toBeCloseTo(1.46, 2);
    expect(fullHeaderLoss(60, 100, 600, 0)).toBeCloseTo(hazenWilliams(100, 0.01, 0.048), 9);
    expect(distributedHeaderLoss(34, 0.5, 5, 1, 1.5, 5, 0.3)).toBeGreaterThan(
      distributedHeaderLoss(34, 0.5, 5, 1, 1.5, 0, 0.3),
    );
    expect(trenchCapacity(0.2, 0.1, 0.01)).toBeCloseTo(((0.02 * (0.02 / 0.4) ** (2 / 3) * 0.1) / 0.013) * 60000, 5);
    const h = hydraulics({ ...defaultDesign, plumbing: "ong-tren-cao" });
    expect(h.tierDifference).toBeGreaterThan(0.1);
    expect(h.warnings.some((w) => w.includes("lỗ định lượng"))).toBe(true);
  });
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
