import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { oxygenCone, pump, skimmer, uvReactor, type StandardEquipment } from "./devices";
import { blower, degasser, denitrification, drumFilter, mbbr, roundTank } from "./devicesProcess";
import { isShared } from "./materials";
import { measure, type Detail } from "./parts";

/* Kích thước khung bao khai báo (m) và các bộ phận bắt buộc theo docs/chuan-mo-hinh-3d.md. */
const DEVICES: {
  id: string;
  build: (detail: Detail) => StandardEquipment;
  size: [number, number, number];
  parts: string[];
}[] = [
  {
    id: "bom-tuan-hoan",
    build: pump,
    size: [1.04, 0.62, 0.39],
    parts: ["be", "than-bom", "truc-bom", "dong-co", "dong-ho"],
  },
  {
    id: "tach-dam",
    build: skimmer,
    size: [0.9, 1.98, 0.71],
    parts: ["cot-tiep-xuc", "coc-bot", "cap-khi", "cua-vao", "cua-ra"],
  },
  {
    id: "den-uv",
    build: uvReactor,
    size: [1.35, 0.94, 0.555],
    parts: ["buong-chieu", "den-uv", "cam-bien", "tu-dien"],
  },
  {
    id: "con-oxy",
    build: oxygenCone,
    size: [1.17, 2.18, 1.03],
    parts: ["con-tiep-xuc", "cua-vao", "duong-ra", "dong-ho", "duong-oxy", "binh-oxy"],
  },
  {
    id: "loc-trong",
    build: drumFilter,
    size: [1.84, 1.21, 1.03],
    parts: ["be-vo", "luoi-loc", "phun-rua", "mang-can", "dong-co", "tu-dien", "cua-vao", "cua-ra"],
  },
  {
    id: "mbbr",
    build: (detail) => mbbr(0.5, detail),
    size: [1.39, 1.44, 0.93],
    parts: ["be-phan-ung", "gia-the", "luoi-chan", "ong-khi", "cua-vao", "cua-ra"],
  },
  {
    id: "thap-khu-co2",
    build: degasser,
    size: [1.18, 2.61, 1.34],
    parts: ["be-day", "than-thap", "lop-dem", "quat"],
  },
  {
    id: "may-thoi-khi",
    build: blower,
    size: [0.72, 1.07, 0.425],
    parts: ["be", "buong-nen", "duong-khi-ra", "dong-co"],
  },
  {
    id: "khu-nitrat",
    build: denitrification,
    size: [1.19, 1.75, 1.36],
    parts: ["be-phan-ung", "may-khuay", "cap-cacbon", "cua-vao", "cua-ra"],
  },
  {
    id: "be-tron",
    build: (detail) => roundTank(4, detail),
    size: [3.33, 1.47, 2.51],
    parts: ["thanh-be", "ong-dung", "cua-vao", "nuoc"],
  },
];

const BUDGET: Record<Detail, { triangles: number; drawCalls: number }> = {
  high: { triangles: 40000, drawCalls: 40 },
  low: { triangles: 6000, drawCalls: 16 },
};

function body(eq: StandardEquipment) {
  eq.lamp.removeFromParent();
  return new THREE.Box3().setFromObject(eq.group);
}

describe.each(DEVICES)("mô hình chuẩn $id", ({ build, size, parts }) => {
  it.each(["high", "low"] as Detail[])("khung bao, đáy và ngân sách ở mức %s", (detail) => {
    const eq = build(detail);
    const box = body(eq);
    const got = box.getSize(new THREE.Vector3());
    size.forEach((expected, axis) => {
      expect(Math.abs(got.getComponent(axis) - expected) / expected).toBeLessThan(0.05);
    });
    expect(Math.abs(box.min.y)).toBeLessThan(1e-6);
    expect(Math.abs(box.min.x + box.max.x)).toBeLessThan(1e-6);
    expect(Math.abs(box.min.z + box.max.z)).toBeLessThan(1e-6);
    expect(eq.height).toBeCloseTo(got.y, 6);
    const m = measure(eq.group);
    expect(m.triangles).toBeLessThanOrEqual(BUDGET[detail].triangles);
    expect(m.drawCalls).toBeLessThanOrEqual(BUDGET[detail].drawCalls);
  });

  it("mức cao có đủ bộ phận theo tên", () => {
    const eq = build("high");
    for (const name of parts) expect(eq.group.getObjectByName(name), name).toBeTruthy();
  });

  it("cổng chính nằm trong khung bao, sát mặt ngoài theo hướng cổng", () => {
    const eq = build("high");
    const box = body(eq).expandByScalar(1e-3);
    // Hai cổng chính: nước vào/ra, hoặc khí vào/ra với máy thổi khí.
    const water = eq.ports.filter(
      (p) => p.position.distanceTo(eq.inlet) < 1e-9 || p.position.distanceTo(eq.outlet) < 1e-9,
    );
    expect(water).toHaveLength(2);
    for (const p of water) {
      expect(box.containsPoint(p.position), p.name).toBe(true);
      expect(p.direction.length()).toBeCloseTo(1, 6);
      // Đi 15 cm theo hướng cổng phải ra khỏi khung bao: cổng không chìm trong thân.
      expect(box.containsPoint(p.position.clone().addScaledVector(p.direction, 0.15)), p.name).toBe(false);
      expect(p.dn).toBeGreaterThan(0);
    }
  });

  it("mỗi cổng nước có hình học (ống cụt, mặt bích) ngay tại vị trí cổng", () => {
    const eq = build("high");
    eq.group.updateMatrixWorld(true);
    const point = new THREE.Vector3();
    for (const p of eq.ports.filter((q) => q.kind !== "oxy")) {
      let nearest = Infinity;
      eq.group.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const pos = o.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          point.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
          nearest = Math.min(nearest, point.distanceTo(p.position));
        }
      });
      expect(nearest, p.name).toBeLessThan(p.dn / 1000 + 0.02);
    }
  });

  it("chỉ dùng vật liệu trong bảng chung, trừ vật liệu có hoạt cảnh và nước", () => {
    const eq = build("high");
    eq.lamp.removeFromParent();
    eq.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const material = o.material as THREE.Material;
      const allowed =
        isShared(material) || material.userData.animated === true || material instanceof THREE.MeshPhysicalMaterial;
      expect(allowed, `${o.parent?.name}: ${material.type}`).toBe(true);
    });
  });

  it("hoạt cảnh là hàm của thời gian, không cộng dồn theo khung", () => {
    const eq = build("low");
    const snapshot = () => {
      const state: number[] = [];
      eq.group.traverse((o) => {
        state.push(...o.position.toArray(), o.rotation.x, o.rotation.y, o.rotation.z, ...o.scale.toArray());
        if (o instanceof THREE.Points) state.push(...(o.geometry.attributes.position.array as Float32Array));
      });
      return state;
    };
    eq.animate?.(3.7, true);
    const first = snapshot();
    eq.animate?.(3.7, true);
    expect(snapshot()).toEqual(first);
  });
});
