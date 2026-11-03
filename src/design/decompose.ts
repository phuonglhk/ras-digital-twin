import { blocks, rackPosition, rimSlope, tierPitch, type Component, type RackDesign, type System } from "./types";
import { choosePressureDn, chooseGravityDn } from "./hydraulics";
import { blockName } from "./cells";
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
  const pitch = tierPitch(d),
    flushInstalled = d.stacking === "gia-do" && d.flushEnabled,
    stackFlushExtra = (d.length * d.width * d.overflowHeight * 1000) / d.drainDownMinutes - d.flow,
    rackQ = d.cols * d.tiers * d.flow,
    totalQ = rackQ * d.racks,
    mainDn = choosePressureDn(totalQ);
  const groupRows = Array.from({ length: d.layout === "quay lưng" ? Math.ceil(d.racks / 2) : d.racks }, (_, g) => {
    const r = d.layout === "quay lưng" ? g * 2 : g;
    const [x, z] = rackPosition(d, r);
    return {
      r,
      x,
      z,
      count: d.layout === "quay lưng" ? Math.min(2, d.racks - r) : 1,
      drainZ: z + d.width + 0.025,
      riserZ: z + 0.13,
    };
  });
  const groups = groupRows.flatMap((row) => blocks(d).map((block) => ({ ...row, x: row.x + block.offset, block })));
  const rimStart = (block: { cols: number; span: number }, y: number) => {
    if (d.stacking !== "xep-chong") return y + d.overflowHeight - 0.02;
    const step = d.length + d.gap;
    const center = (block.cols === 1 ? 0 : Math.ceil(block.cols / 2) - 0.5) * step + d.length * 0.8;
    const distance = d.drainEnds === "hai" ? Math.min(center + 0.08, block.span + 0.08 - center) : block.span + 0.08;
    const sideDrop = Math.abs(d.width - 0.105) * d.slope + 0.002;
    return y + d.overflowHeight - d.availableHead + rimSlope(d) * distance + sideDrop;
  };
  const supplyBases: { point: Point; flow: number; exit?: Point }[] = [];
  for (let r = 0; r < d.racks; r++)
    for (const block of blocks(d)) {
      const [rowX, rz] = rackPosition(d, r),
        rx = rowX + block.offset,
        span = block.span;
      const reversed = d.layout === "quay lưng" && r % 2 === 1,
        sign = reversed ? -1 : 1;
      const front = reversed ? rz + d.width : rz,
        supplyZ = front + sign * 0.08;
      const h = d.bottomHeight + (d.tiers - 1) * pitch + d.height;
      // Ảnh trại: https://www.youtube.com/watch?v=jJqlI1b1gA8 ; lắp ráp: https://www.youtube.com/watch?v=jXCRomdc_o4
      if (d.plumbing === "ong-tren-cao") {
        const over = h + 0.1,
          blockFlow = block.cols * d.tiers * d.flow,
          countDrops = Math.ceil(block.cols / d.dropEvery);
        const drops = Array.from({ length: countDrops }, (_, i) => {
          const first = i * d.dropEvery,
            count = Math.min(d.dropEvery, block.cols - first),
            left = i % 2 === 0;
          const offset = 0.025 + Math.floor(i / 2) * (d.headerDn / 1000 + 0.008);
          return { first, count, x: left ? rx - offset : rx + span + offset };
        }).sort((a, b) => a.x - b.x);
        const base: Point = [drops[0].x - 0.08, over, supplyZ];
        const route: { point: Point; flow: number; exit?: Point } = { point: base, flow: blockFlow };
        supplyBases.push(route);
        let previous = base;
        let remaining = blockFlow;
        for (const { first, count, x } of drops) {
          const top: Point = [x, over, supplyZ];
          const m = { rack: r, block: r * blocks(d).length + block.index, col: block.first + first };
          pipe("ống chính trên cao", previous, top, mainDn, { ...m, network: "cấp", flow: remaining });
          previous = top;
          remaining -= count * d.tiers * d.flow;
          add("Tê đầu ống thả", "ống chính trên cao", top, { ...m, dn: mainDn, count: 1 });
          add("Van đầu ống thả", "ống chính trên cao", top, { ...m, dn: mainDn, count: 1 });
          let previousDrop = top;
          for (let t = d.tiers - 1; t >= 0; t--) {
            const y = d.bottomHeight + t * pitch,
              sy = y + (d.stacking === "xep-chong" ? pitch - d.headerDn / 2000 : d.height),
              branch: Point = [x, sy, supplyZ],
              meta = { ...m, tier: t };
            pipe("ống thả", previousDrop, branch, d.headerDn, {
              ...meta,
              network: "cấp",
              flow: (t + 1) * count * d.flow,
            });
            previousDrop = branch;
            add("Tê nhánh tầng", "ống thả", branch, { ...meta, dn: d.headerDn, count: 1 });
            for (let k = 0; k < count; k++) {
              const col = first + k,
                bx = rx + col * (d.length + d.gap) + d.length / 2,
                tip: Point = [bx, sy + 0.01, supplyZ],
                boxMeta = { ...meta, col: block.first + col };
              const tap: Point = [bx, sy, supplyZ];
              pipe("cấp", branch, tap, d.headerDn, { ...boxMeta, network: "cấp", flow: d.flow });
              pipe("cấp", tap, tip, 21, {
                ...boxMeta,
                network: "cấp",
                flow: d.flow,
                sink: true,
                virtual: d.outletStyle === "lo-khoan",
              });
              add(d.outletStyle === "te-ong" ? "Tê cấp hộp" : "Lỗ định lượng", "cấp", tap, {
                ...boxMeta,
                count: 1,
                flow: d.flow,
                spec: d.outletStyle === "te-ong" ? `DN${d.headerDn} × DN21` : `Ø ${d.orificeDiameter} mm`,
              });
              if (d.supplyValve) add("Van cấp hộp", "cấp", tip, { ...boxMeta, count: 1, flow: d.flow });
              add("Hộp nuôi", "khung", [bx, y, rz + d.width / 2], {
                ...boxMeta,
                count: 1,
                reversed,
                code: `${blockName(r * blocks(d).length + block.index)}${col * d.tiers + t + 1}`,
              });
            }
          }
        }
        route.exit = previous;
        add("Rắc co ống chính trên cao", "ống chính trên cao", base, {
          rack: r,
          dn: mainDn,
          count: Math.ceil(span / d.trunkSection),
        });
      } else {
        const mid = Math.ceil(block.cols / 2);
        const sidePaths =
          d.supplyEnds === "hai"
            ? [
                { left: true, indices: Array.from({ length: mid }, (_, i) => i) },
                {
                  left: false,
                  indices: Array.from({ length: Math.max(1, block.cols - mid) }, (_, i) => block.cols - 1 - i),
                },
              ]
            : [
                {
                  left: d.supplyEnds === "trai",
                  indices: Array.from({ length: block.cols }, (_, i) =>
                    d.supplyEnds === "trai" ? i : block.cols - 1 - i,
                  ),
                },
              ];
        for (const side of sidePaths) {
          const base: Point = [side.left ? rx - 0.08 : rx + span + 0.08, 0, supplyZ],
            perBox = d.supplyEnds === "hai" && block.cols === 1 ? d.flow / 2 : d.flow;
          const sideFlow = side.indices.length * d.tiers * perBox,
            riserDn = choosePressureDn(sideFlow);
          supplyBases.push({ point: base, flow: sideFlow });
          for (let t = 0; t < d.tiers; t++) {
            const y = d.bottomHeight + t * pitch,
              sy = y + (d.stacking === "xep-chong" ? pitch - d.headerDn / 2000 : d.height),
              meta = { rack: r, tier: t, block: r * blocks(d).length + block.index };
            const lower: Point = t === 0 ? base : [base[0], sy - pitch, supplyZ],
              top: Point = [base[0], sy, supplyZ];
            pipe("ống đứng cấp", lower, top, riserDn, {
              ...meta,
              network: "cấp",
              flow: (d.tiers - t) * side.indices.length * perBox,
            });
            add("Tê", "cấp", top, { ...meta, dn: d.headerDn, count: 1 });
            if (d.tierValve)
              add("Van chặn tầng", "cấp", [base[0] + (side.left ? 0.025 : -0.025), sy, supplyZ], {
                ...meta,
                dn: d.headerDn,
                count: 1,
              });
            add("Rắc co tầng cấp", "cấp", [base[0] + (side.left ? 0.055 : -0.055), sy, supplyZ], {
              ...meta,
              dn: d.headerDn,
              count: 1,
            });
            if (riserDn !== d.headerDn) add("Côn thu", "cấp", top, { ...meta, dn: d.headerDn, count: 1 });
            if (t === d.tiers - 1) add("Nút bịt", "ống đứng cấp", top, { ...meta, dn: riserDn, count: 1 });
            let prev = top;
            side.indices.forEach((c, j) => {
              const x = rx + c * (d.length + d.gap) + d.length / 2,
                next: Point = [x, sy, supplyZ],
                m = { ...meta, col: block.first + c };
              pipe("cấp", prev, next, d.headerDn, { ...m, network: "cấp", flow: (side.indices.length - j) * perBox });
              if (!(d.supplyEnds === "hai" && block.cols === 1 && !side.left)) {
                const tip: Point = [x, sy + 0.01, supplyZ];
                pipe("cấp", next, tip, 21, {
                  ...m,
                  network: "cấp",
                  flow: d.flow,
                  sink: true,
                  virtual: d.outletStyle === "lo-khoan",
                });
                add(d.outletStyle === "te-ong" ? "Tê cấp hộp" : "Lỗ định lượng", "cấp", next, {
                  ...m,
                  count: 1,
                  flow: d.flow,
                  spec: d.outletStyle === "te-ong" ? `DN${d.headerDn} × DN21` : `Ø ${d.orificeDiameter} mm`,
                });
                if (d.supplyValve) add("Van cấp hộp", "cấp", tip, { ...m, count: 1, flow: d.flow });
                add("Hộp nuôi", "khung", [x, y, rz + d.width / 2], {
                  ...m,
                  count: 1,
                  reversed,
                  code: `${blockName(r * blocks(d).length + block.index)}${c * d.tiers + t + 1}`,
                });
              }
              prev = next;
            });
            if (!(d.supplyEnds === "hai" && block.cols === 1))
              add("Nút bịt", "cấp", prev, { ...meta, dn: d.headerDn, count: 1 });
          }
          add("Co 90°", "ống đứng cấp", base, { rack: r, dn: riserDn, count: 1 });
          add("Rắc co", "ống đứng cấp", base, { rack: r, dn: riserDn, count: 1 });
          if (mainDn !== riserDn) add("Côn thu", "ống đứng cấp", base, { rack: r, dn: riserDn, count: 1 });
        }
      }
      if (d.stacking === "gia-do")
        for (let t = 0; t < d.tiers; t++) {
          const y = d.bottomHeight + t * pitch,
            meta = { rack: r, tier: t };
          pipe("khung", [rx, y, rz], [rx + span, y, rz], 0, { ...meta, type: "Thanh đỡ tầng" });
          pipe("khung", [rx, y, rz + d.width], [rx + span, y, rz + d.width], 0, { ...meta, type: "Thanh đỡ tầng" });
        }
      if (d.stacking === "xep-chong") {
        if (d.baseStyle === "gach-soi") {
          const gravelHeight = Math.min(d.gravelDepth, d.bottomHeight),
            brickHeight = d.bottomHeight - gravelHeight;
          add("Sỏi đệm", "khung", [rx + span / 2, gravelHeight / 2, rz + d.width / 2], {
            rack: r,
            block: r * blocks(d).length + block.index,
            unit: "m³",
            count: span * d.width * gravelHeight,
            size: [span, gravelHeight, d.width],
          });
          for (let i = 0; i < Math.ceil(span / d.brickLength); i++) {
            const length = Math.min(d.brickLength, span - i * d.brickLength);
            add(
              "Gạch bê tông",
              "khung",
              [rx + i * d.brickLength + length / 2, gravelHeight + brickHeight / 2, rz + d.width / 2],
              { rack: r, block: r * blocks(d).length + block.index, count: 1, size: [length, brickHeight, d.width] },
            );
          }
        } else
          add("Bệ bê tông đổ", "khung", [rx + span / 2, d.bottomHeight / 2, rz + d.width / 2], {
            rack: r,
            block: r * blocks(d).length + block.index,
            unit: "m³",
            count: span * d.width * d.bottomHeight,
            size: [span, d.bottomHeight, d.width],
          });
        for (let c = 0; c < block.cols; c++) {
          const x = rx + (c + 0.5) * (d.length + d.gap);
          pipe("khung", [x, d.bottomHeight, rz], [x, h, rz], 0, {
            rack: r,
            col: block.first + c,
            type: "Dây chằng cột",
            count: 1,
          });
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
    }
  let prevSupply: Point = [-d.filterDistance, 0, 0];
  supplyBases.forEach(({ point, exit }, i) => {
    const remaining = supplyBases.slice(i).reduce((a, b) => a + b.flow, 0);
    if (d.plumbing === "ong-tren-cao" && i === 0) {
      const top: Point = [prevSupply[0], point[1], prevSupply[2]];
      pipe("ống đứng cấp", prevSupply, top, mainDn, { network: "cấp", flow: remaining, source: true });
      prevSupply = top;
    }
    pipe(d.plumbing === "ong-tren-cao" ? "ống chính trên cao" : "ống chính", prevSupply, point, mainDn, {
      network: "cấp",
      flow: remaining,
      source: d.plumbing !== "ong-tren-cao" && i === 0,
    });
    prevSupply = exit ?? point;
  });
  if (d.plumbing === "ong-tren-cao") {
    const end = supplyBases[supplyBases.length - 1].exit;
    if (end) add("Nút bịt", "ống chính trên cao", end, { dn: mainDn, count: 1 });
    for (const part of out)
      if (part.system === "ống chính trên cao" && part.network === "cấp" && part.block !== undefined) {
        part.flow = (part.flow ?? 0) + supplyBases.slice(part.block + 1).reduce((a, b) => a + b.flow, 0);
      }
  }
  // Ống đứng DN21 trong ống bọc DN34 có khía chân hút nước sát đáy: Louisiana Sea Grant,
  // https://repository.library.noaa.gov/view/noaa/39465/noaa_39465_DS1.pdf .
  const paths = groups.flatMap((g) => {
    const dual = d.stacking === "xep-chong" && d.drainEnds === "hai";
    const mid = Math.ceil(g.block.cols / 2);
    return dual
      ? [
          {
            g,
            left: true,
            indices: Array.from({ length: mid }, (_, i) => mid - 1 - i),
            fraction: g.block.cols === 1 ? 0.5 : 1,
          },
          {
            g,
            left: false,
            indices: Array.from({ length: Math.max(1, g.block.cols - mid) }, (_, i) =>
              g.block.cols === 1 ? 0 : mid + i,
            ),
            fraction: g.block.cols === 1 ? 0.5 : 1,
          },
        ]
      : [
          {
            g,
            left: d.stacking === "xep-chong" && d.supplyEnds === "trai",
            indices: Array.from({ length: g.block.cols }, (_, i) =>
              d.stacking === "xep-chong" && d.supplyEnds === "trai" ? g.block.cols - 1 - i : i,
            ),
            fraction: 1,
          },
        ];
  });
  // Hai nhánh cùng nối vật lý qua đoạn cân bằng giữa khối. Đoạn này không gán
  // chiều cố định vì dòng có thể đổi hướng khi xả một hộp.
  if (d.stacking === "xep-chong" && d.drainEnds === "hai")
    for (const g of groups)
      if (g.block.cols > 1) {
        const mid = Math.ceil(g.block.cols / 2),
          step = d.length + d.gap,
          center = g.x + (mid - 0.5) * step + d.length * 0.8;
        const a = center - step / 2,
          b = center + step / 2;
        for (let t = 0; t < d.tiers; t++) {
          const y = rimStart(g.block, d.bottomHeight + t * pitch) - (rimSlope(d) * step) / 2;
          pipe("tràn", [a, y, g.drainZ], [b, y, g.drainZ], d.drainHeaderDn, {
            rack: g.r,
            tier: t,
            type: "Ống nối cân bằng",
            flow: 0,
          });
        }
      }
  const trunk: Point[] = [
    [-d.filterDistance, 0, paths[0].g.riserZ],
    ...paths.map(({ g, left }) => [left ? g.x - 0.08 : g.x + g.block.span + 0.08, 0, g.riserZ] as Point),
  ];
  const dist = trunk.slice(1).map((p, i) => Math.hypot(p[0] - trunk[i][0], p[2] - trunk[i][2]));
  const total = dist.reduce((a, b) => a + b, 0);
  let travelled = 0;
  trunk[0][1] = -total * d.slope;
  for (let i = 1; i < trunk.length; i++) {
    travelled += dist[i - 1];
    trunk[i][1] = (-total + travelled) * d.slope;
    const flow = paths
      .slice(i - 1)
      .reduce((s, p) => s + p.fraction * p.g.count * p.indices.length * d.tiers * d.flow, 0);
    pipe(
      d.plumbing === "ong-tren-cao" ? "mương" : "ống chính",
      trunk[i],
      trunk[i - 1],
      chooseGravityDn(totalQ, d.slope),
      {
        network: "thoát",
        ...(d.plumbing === "ong-tren-cao"
          ? { type: "Mương thoát hở", spec: `${d.trenchWidth} m × ${d.trenchDepth} m` }
          : {}),
        flow,
        flushFlow: flushInstalled
          ? (flow * d.flushFlow) / d.flow
          : d.stacking === "xep-chong" && i === 1
            ? stackFlushExtra
            : 0,
        sink: i === 1,
      },
    );
  }
  paths.forEach(({ g, left, indices, fraction }, gi) => {
    const riserX = left ? g.x - 0.08 : g.x + g.block.span + 0.08,
      base = trunk[gi + 1],
      dn = chooseGravityDn(fraction * g.count * indices.length * d.tiers * d.flow, d.slope),
      junctions: { point: Point; flow: number; flushFlow: number }[] = [];
    for (let t = 0; t < d.tiers; t++) {
      const y = d.bottomHeight + t * pitch,
        meta = { rack: g.r, tier: t, block: g.r * blocks(d).length + g.block.index },
        headerStart = rimStart(g.block, y),
        flushStart = y - 0.025;
      for (const kind of ["tràn", ...(flushInstalled ? ["xả cặn"] : [])] as ("tràn" | "xả cặn")[]) {
        const isFlush = kind === "xả cặn",
          z = g.drainZ + (isFlush ? 0.055 : 0),
          dnHeader = isFlush
            ? 34
            : d.stacking === "xep-chong"
              ? d.drainHeaderDn
              : chooseGravityDn(g.count * indices.length * d.flow, d.slope);
        const at = (x: number): Point => [
          x,
          (isFlush ? flushStart : headerStart) -
            (isFlush ? d.slope : rimSlope(d)) *
              (left
                ? (d.drainEnds === "hai"
                    ? g.x +
                      (g.block.cols === 1 ? 0 : Math.ceil(g.block.cols / 2) - 0.5) * (d.length + d.gap) +
                      d.length * 0.8
                    : g.x + g.block.span) - x
                : x -
                  (d.drainEnds === "hai" && d.stacking === "xep-chong"
                    ? g.x +
                      (g.block.cols === 1 ? 0 : Math.ceil(g.block.cols / 2) - 0.5) * (d.length + d.gap) +
                      d.length * 0.8
                    : g.x)),
          z,
        ];
        let prev: Point | undefined;
        for (let j = 0; j < indices.length; j++) {
          const c = indices[j];
          const x = g.x + c * (d.length + d.gap) + d.length / 2 + d.length * 0.3,
            node = at(x),
            flow = (j + 1) * g.count * d.flow;
          if (prev)
            pipe(kind, prev, node, dnHeader, {
              ...meta,
              network: "thoát",
              flow: isFlush ? 0 : flow - g.count * d.flow,
              intermittent: isFlush,
              flushFlow: isFlush ? j * g.count * d.flushFlow : undefined,
            });
          for (let side = 0; side < g.count; side++) {
            if (g.block.cols === 1 && d.stacking === "xep-chong" && d.drainEnds === "hai" && !left && !isFlush)
              continue;
            const r = g.r + side,
              [, rz] = rackPosition(d, r),
              rev = d.layout === "quay lưng" && r % 2 === 1,
              back = rev ? rz : rz + d.width,
              sign = rev ? -1 : 1,
              pitZ = back - sign * 0.1,
              m = { rack: r, tier: t, col: g.block.first + c, block: r * blocks(d).length + g.block.index };
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
                flushFlow:
                  d.stacking === "xep-chong" && r === 0 && t === 0 && g.block.first + c === 0
                    ? stackFlushExtra
                    : undefined,
              });
              add("Ống bọc khía chân", kind, [x, y + 0.01, pitZ], { ...m, dn: 34, count: 1 });
              add("Lưới chắn ống tràn", kind, [x, y + 0.01, pitZ], { ...m, dn: 34, count: 1 });
              add("Co 90°", kind, junction, { ...m, dn: 21, count: 1 });
              if (dnHeader !== 21) add("Côn thu", kind, node, { ...m, dn: 21, count: 1 });
            }
            add("Tê", kind, node, { ...m, dn: dnHeader, count: 1 });
          }
          if (!prev && !(d.stacking === "xep-chong" && d.drainEnds === "hai" && !isFlush))
            add("Nút bịt", kind, node, { ...meta, dn: dnHeader, count: 1 });
          prev = node;
        }
        const finish = at(riserX);
        pipe(kind, prev!, finish, dnHeader, {
          ...meta,
          network: "thoát",
          flow: isFlush ? 0 : fraction * g.count * indices.length * d.flow,
          intermittent: isFlush,
          flushFlow: isFlush
            ? g.count * indices.length * d.flushFlow
            : d.stacking === "xep-chong" && g.r === 0 && t === 0 && g.block.first === 0 && indices.includes(0)
              ? stackFlushExtra
              : undefined,
        });
        // Nối chéo có độ dốc xuống tới ống đứng; cả hai hệ cùng vào một ống đứng.
        const outlet: Point = [riserX, finish[1] - 0.002 - Math.abs(z - g.riserZ) * d.slope, g.riserZ];
        if (!isFlush && d.plumbing === "van-hong") {
          const along = (f: number): Point => [
            finish[0],
            finish[1] + (outlet[1] - finish[1]) * f,
            finish[2] + (outlet[2] - finish[2]) * f,
          ];
          add("Rắc co tầng thoát", "tràn", along(0.3), { ...meta, dn: dnHeader, count: 1 });
          if (d.drainValve) add("Van thoát tầng", "tràn", along(0.7), { ...meta, dn: dnHeader, count: 1 });
        }
        pipe("ống đứng thoát", finish, outlet, dnHeader, {
          ...meta,
          network: "thoát",
          flow: isFlush ? 0 : fraction * g.count * indices.length * d.flow,
          intermittent: isFlush,
          flushFlow: isFlush
            ? g.count * indices.length * d.flushFlow
            : d.stacking === "xep-chong" && g.r === 0 && t === 0 && g.block.first === 0 && indices.includes(0)
              ? stackFlushExtra
              : undefined,
        });
        junctions.push({
          point: outlet,
          flow: isFlush ? 0 : fraction * g.count * indices.length * d.flow,
          flushFlow: isFlush
            ? g.count * indices.length * d.flushFlow
            : d.stacking === "xep-chong" && g.r === 0 && t === 0 && g.block.first === 0 && indices.includes(0)
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
