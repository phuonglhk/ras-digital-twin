import { rackPosition, rimSlope, tierPitch, type Component, type RackDesign, type System } from "./types";
import { choosePressureDn, chooseGravityDn } from "./hydraulics";
type Point = Component["position"];
export function decompose(d: RackDesign): Component[] {
  const out: Component[] = [];
  let id = 0;
  const add = (type: string, system: System, position: Point, extra: Partial<Component> = {}) =>
    out.push({ id: `tp-${++id}`, type, system, position, ...extra });
  const pipe = (system: System, a: Point, b: Point, dn: number, extra: Partial<Component> = {}) => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (length > 1e-8) add("Ống thẳng", system, a, { dn, length, end: b, ...extra });
  };
  const span = d.cols * (d.length + d.gap),
    pitch = tierPitch(d),
    flushInstalled = d.stacking === "gia-do" && d.flushEnabled,
    stackFlushExtra = (d.length * d.width * d.overflowHeight * 1000) / d.drainDownMinutes - d.flow,
    rackQ = d.cols * d.tiers * d.flow,
    totalQ = rackQ * d.racks,
    mainDn = choosePressureDn(totalQ),
    riserDn = choosePressureDn(rackQ);
  const groups = Array.from({ length: d.layout === "quay lưng" ? Math.ceil(d.racks / 2) : d.racks }, (_, g) => {
    const r = d.layout === "quay lưng" ? g * 2 : g;
    const [x, z] = rackPosition(d, r);
    return { r, x, z, count: d.layout === "quay lưng" ? Math.min(2, d.racks - r) : 1, drainZ: z + d.width + 0.025 };
  });
  const supplyBases: Point[] = [];
  for (let r = 0; r < d.racks; r++) {
    const [rx, rz] = rackPosition(d, r),
      reversed = d.layout === "quay lưng" && r % 2 === 1,
      sign = reversed ? -1 : 1,
      front = reversed ? rz + d.width : rz,
      supplyZ = front + sign * 0.08;
    const base: Point = [rx - 0.08, 0, supplyZ];
    supplyBases.push(base);
    const h = d.bottomHeight + (d.tiers - 1) * pitch + d.height;
    for (let t = 0; t < d.tiers; t++) {
      const y = d.bottomHeight + t * pitch,
        sy = y + (d.stacking === "xep-chong" ? pitch - d.headerDn / 2000 : d.height),
        meta = { rack: r, tier: t };
      const lower = t === 0 ? base : ([base[0], sy - pitch, supplyZ] as Point);
      const top: Point = [base[0], sy, supplyZ];
      pipe("ống đứng cấp", lower, top, riserDn, { ...meta, network: "cấp", flow: (d.tiers - t) * d.cols * d.flow });
      add("Tê", "cấp", top, { ...meta, dn: d.headerDn, count: 1 });
      if (d.tierValve) add("Van chặn tầng", "cấp", top, { ...meta, dn: d.headerDn, count: 1 });
      if (riserDn !== d.headerDn) add("Côn thu", "cấp", top, { ...meta, dn: d.headerDn, count: 1 });
      if (t === d.tiers - 1) add("Nút bịt", "ống đứng cấp", top, { ...meta, dn: riserDn, count: 1 });
      let prev = top;
      for (let c = 0; c < d.cols; c++) {
        const x = rx + c * (d.length + d.gap) + d.length / 2,
          next: Point = [x, sy, supplyZ],
          m = { ...meta, col: c };
        pipe("cấp", prev, next, d.headerDn, { ...m, network: "cấp", flow: (d.cols - c) * d.flow });
        const tip: Point = [x, sy - 0.015, supplyZ];
        pipe("cấp", next, tip, 21, { ...m, network: "cấp", flow: d.flow, sink: true });
        add(d.supplyValve ? "Van cấp hộp" : "Lỗ định lượng", "cấp", tip, { ...m, count: 1, flow: d.flow });
        prev = next;
        add("Hộp nuôi", "khung", [x, y, rz + d.width / 2], { ...m, count: 1, reversed });
      }
      add("Nút bịt", "cấp", prev, { ...meta, dn: d.headerDn, count: 1 });
      if (d.stacking === "gia-do") {
        pipe("khung", [rx, y, rz], [rx + span, y, rz], 0, { ...meta, type: "Thanh đỡ tầng" });
        pipe("khung", [rx, y, rz + d.width], [rx + span, y, rz + d.width], 0, { ...meta, type: "Thanh đỡ tầng" });
      }
    }
    if (d.stacking === "xep-chong") {
      for (const z of [rz, rz + d.width])
        pipe("khung", [rx, d.bottomHeight, z], [rx + span, d.bottomHeight, z], 0, { rack: r, type: "Đế kê" });
      for (const x of [rx, rx + span]) {
        pipe("khung", [x, d.bottomHeight, rz], [x, d.bottomHeight, rz + d.width], 0, { rack: r, type: "Đế kê" });
        for (const z of [rz, rz + d.width])
          pipe("khung", [x, 0, z], [x, d.bottomHeight, z], 0, { rack: r, type: "Đế kê" });
      }
      for (let c = 0; c < d.cols; c++) {
        const x = rx + (c + 0.5) * (d.length + d.gap);
        pipe("khung", [x, d.bottomHeight, rz], [x, h, rz], 0, { rack: r, col: c, type: "Dây chằng cột", count: 1 });
      }
      pipe("khung", [rx, d.bottomHeight, rz + d.width], [rx + span, h, rz + d.width], 0, {
        rack: r,
        type: "Thanh giằng dãy",
      });
    } else {
      for (const x of [rx, rx + span])
        for (const z of [rz, rz + d.width]) pipe("khung", [x, 0, z], [x, h, z], 0, { rack: r, type: "Cột giá đỡ" });
      pipe("khung", [rx, 0, rz + d.width], [rx + span, h, rz + d.width], 0, { rack: r, type: "Thanh giằng dãy" });
    }
    add("Co 90°", "ống đứng cấp", base, { rack: r, dn: riserDn, count: 1 });
    add("Rắc co", "ống đứng cấp", base, { rack: r, dn: riserDn, count: 1 });
    if (mainDn !== riserDn) add("Côn thu", "ống đứng cấp", base, { rack: r, dn: riserDn, count: 1 });
  }
  let prevSupply: Point = [-d.filterDistance, 0, 0];
  supplyBases.forEach((p, i) => {
    pipe("ống chính", prevSupply, p, mainDn, { network: "cấp", flow: (d.racks - i) * rackQ, source: i === 0 });
    prevSupply = p;
  });
  // Ống đứng DN21 trong ống bọc DN34 có khía chân hút nước sát đáy: Louisiana Sea Grant,
  // https://repository.library.noaa.gov/view/noaa/39465/noaa_39465_DS1.pdf .
  const trunk: Point[] = [
    [-d.filterDistance, 0, groups[0].drainZ],
    ...groups.map((g) => [g.x + span + 0.08, 0, g.drainZ] as Point),
  ];
  const dist = trunk.slice(1).map((p, i) => Math.hypot(p[0] - trunk[i][0], p[2] - trunk[i][2]));
  const total = dist.reduce((a, b) => a + b, 0);
  let travelled = 0;
  trunk[0][1] = -total * d.slope;
  for (let i = 1; i < trunk.length; i++) {
    travelled += dist[i - 1];
    trunk[i][1] = (-total + travelled) * d.slope;
    const flow = groups.slice(i - 1).reduce((s, g) => s + g.count * rackQ, 0);
    pipe("ống chính", trunk[i], trunk[i - 1], chooseGravityDn(totalQ, d.slope), {
      network: "thoát",
      flow,
      flushFlow: flushInstalled
        ? (flow * d.flushFlow) / d.flow
        : d.stacking === "xep-chong" && i === 1
          ? stackFlushExtra
          : 0,
      sink: i === 1,
    });
  }
  groups.forEach((g, gi) => {
    const riserX = g.x + span + 0.08,
      base = trunk[gi + 1],
      dn = chooseGravityDn(g.count * rackQ, d.slope),
      junctions: { point: Point; flow: number; flushFlow: number }[] = [];
    for (let t = 0; t < d.tiers; t++) {
      const y = d.bottomHeight + t * pitch,
        meta = { rack: g.r, tier: t },
        headerStart = y + d.overflowHeight - 0.02,
        flushStart = y - 0.025;
      for (const kind of ["tràn", ...(flushInstalled ? ["xả cặn"] : [])] as ("tràn" | "xả cặn")[]) {
        const isFlush = kind === "xả cặn",
          z = g.drainZ + (isFlush ? 0.055 : 0),
          dnHeader = isFlush
            ? 34
            : d.stacking === "xep-chong"
              ? d.drainHeaderDn
              : chooseGravityDn(g.count * d.cols * d.flow, d.slope);
        const at = (x: number): Point => [
          x,
          (isFlush ? flushStart : headerStart) - (isFlush ? d.slope : rimSlope(d)) * (x - g.x),
          z,
        ];
        let prev: Point | undefined;
        for (let c = 0; c < d.cols; c++) {
          const x = g.x + c * (d.length + d.gap) + d.length / 2 + d.length * 0.3,
            node = at(x),
            flow = (c + 1) * g.count * d.flow;
          if (prev)
            pipe(kind, prev, node, dnHeader, {
              ...meta,
              network: "thoát",
              flow: isFlush ? 0 : flow - g.count * d.flow,
              intermittent: isFlush,
              flushFlow: isFlush
                ? c * g.count * d.flushFlow
                : d.stacking === "xep-chong" && g.r === 0 && t === 0
                  ? stackFlushExtra
                  : undefined,
            });
          for (let side = 0; side < g.count; side++) {
            const r = g.r + side,
              [, rz] = rackPosition(d, r),
              rev = d.layout === "quay lưng" && r % 2 === 1,
              back = rev ? rz : rz + d.width,
              sign = rev ? -1 : 1,
              pitZ = back - sign * 0.1,
              m = { rack: r, tier: t, col: c };
            if (isFlush) {
              const p0: Point = [x, y + 0.005, pitZ],
                p1: Point = [x, y - 0.012, pitZ],
                p2: Point = [x, node[1] + 0.005, z];
              pipe(kind, p0, p1, 34, {
                ...m,
                network: "thoát",
                source: true,
                intermittent: true,
                flow: 0,
                flushFlow: d.flushFlow,
              });
              pipe(kind, p1, p2, 34, { ...m, network: "thoát", intermittent: true, flow: 0, flushFlow: d.flushFlow });
              pipe(kind, p2, node, 34, { ...m, network: "thoát", intermittent: true, flow: 0, flushFlow: d.flushFlow });
              add("Co 90°", kind, p1, { ...m, dn: 34, count: 2 });
              if (d.sludgeValve) add("Van xả cặn", kind, p1, { ...m, dn: 34, count: 1 });
            } else {
              const top: Point = [x, y + d.overflowHeight, pitZ],
                junction: Point = [x, y + d.overflowHeight - 0.01, pitZ];
              pipe(kind, top, junction, 21, { ...m, network: "thoát", source: true, flow: d.flow });
              // Phần ống đứng bên dưới cửa ra được bịt đáy; chỉ đoạn trên cửa ra mang dòng liên tục.
              pipe(kind, [x, y + 0.01, pitZ], junction, 21, { ...m, flow: 0 });
              add("Nút bịt", kind, [x, y + 0.01, pitZ], { ...m, dn: 21, count: 1 });
              pipe(kind, junction, node, 21, {
                ...m,
                network: "thoát",
                flow: d.flow,
                flushFlow: d.stacking === "xep-chong" && r === 0 && t === 0 && c === 0 ? stackFlushExtra : undefined,
              });
              add("Ống bọc khía chân", kind, [x, y + 0.01, pitZ], { ...m, dn: 34, count: 1 });
              add("Lưới chắn ống tràn", kind, [x, y + 0.01, pitZ], { ...m, dn: 34, count: 1 });
              add("Co 90°", kind, junction, { ...m, dn: 21, count: 1 });
              if (dnHeader !== 21) add("Côn thu", kind, node, { ...m, dn: 21, count: 1 });
            }
            add("Tê", kind, node, { ...m, dn: dnHeader, count: 1 });
          }
          if (!prev) add("Nút bịt", kind, node, { ...meta, dn: dnHeader, count: 1 });
          prev = node;
        }
        const finish = at(riserX);
        pipe(kind, prev!, finish, dnHeader, {
          ...meta,
          network: "thoát",
          flow: isFlush ? 0 : g.count * d.cols * d.flow,
          intermittent: isFlush,
          flushFlow: isFlush
            ? g.count * d.cols * d.flushFlow
            : d.stacking === "xep-chong" && g.r === 0 && t === 0
              ? stackFlushExtra
              : undefined,
        });
        // Nối chéo có độ dốc xuống tới ống đứng; cả hai hệ cùng vào một ống đứng.
        const outlet: Point = [riserX, finish[1] - 0.002, g.drainZ];
        pipe("ống đứng thoát", finish, outlet, dnHeader, {
          ...meta,
          network: "thoát",
          flow: isFlush ? 0 : g.count * d.cols * d.flow,
          intermittent: isFlush,
          flushFlow: isFlush
            ? g.count * d.cols * d.flushFlow
            : d.stacking === "xep-chong" && g.r === 0 && t === 0
              ? stackFlushExtra
              : undefined,
        });
        junctions.push({
          point: outlet,
          flow: isFlush ? 0 : g.count * d.cols * d.flow,
          flushFlow: isFlush
            ? g.count * d.cols * d.flushFlow
            : d.stacking === "xep-chong" && g.r === 0 && t === 0
              ? stackFlushExtra
              : 0,
        });
        add("Tê", "ống đứng thoát", outlet, { ...meta, dn, count: 1 });
        if (dnHeader !== dn) add("Côn thu", "ống đứng thoát", outlet, { ...meta, dn: dnHeader, count: 1 });
      }
    }
    junctions.sort((a, b) => b.point[1] - a.point[1]);
    let q = 0,
      flushQ = 0;
    add("Nút bịt", "ống đứng thoát", junctions[0].point, { rack: g.r, dn, count: 1 });
    junctions.forEach((j, i) => {
      q += j.flow;
      flushQ += j.flushFlow;
      const next = junctions[i + 1]?.point ?? base;
      pipe("ống đứng thoát", j.point, next, dn, { rack: g.r, network: "thoát", flow: q, flushFlow: flushQ });
    });
    add("Co 90°", "ống đứng thoát", base, { rack: g.r, dn, count: 1 });
    add("Rắc co", "ống đứng thoát", base, { rack: g.r, dn, count: 1 });
  });
  return out;
}
