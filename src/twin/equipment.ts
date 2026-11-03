/*
 * Thiết bị RAS cho cảnh 3D.
 * Có asset Blockbench thì dùng (lọc trống, bơm, bể, hộp cua); thiết bị iRAS chưa có asset
 * (tách đạm, MBBR, tháp khử CO₂, UV, côn ôxy) dựng bằng khối, cùng phong cách khối vuông.
 * Mọi kích thước tính bằng mét. Gốc toạ độ mỗi thiết bị ở tâm đáy.
 */
import * as THREE from "three";

import { buildParts, modelGroup, partsSize, type BbLibrary, type Part } from "./bbmodel";

export interface Equipment {
  group: THREE.Group;
  inlet: THREE.Vector3; // toạ độ cục bộ
  outlet: THREE.Vector3;
  height: number;
  water?: THREE.Mesh; // khối nước để tô màu theo chất lượng
  lamp: THREE.Mesh;
  animate?: (time: number, running: boolean) => void;
}

const MAT = {
  pvc: new THREE.MeshLambertMaterial({ color: 0xd9ded9 }),
  hdpe: new THREE.MeshLambertMaterial({ color: 0x2f6fae }),
  steel: new THREE.MeshLambertMaterial({ color: 0x9aa6ad }),
  dark: new THREE.MeshLambertMaterial({ color: 0x33413a }),
  frame: new THREE.MeshLambertMaterial({ color: 0x55655c }),
  o2: new THREE.MeshLambertMaterial({ color: 0x3f8f5a }),
  foam: new THREE.MeshLambertMaterial({ color: 0xf1ead2 }),
  media: new THREE.MeshLambertMaterial({ color: 0xe8e2c8 }),
};

export function waterMaterial() {
  return new THREE.MeshPhongMaterial({ color: 0x4fb7e6, transparent: true, opacity: 0.62, shininess: 80, depthWrite: false });
}

function lampAt(group: THREE.Group, y: number) {
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0x5b6b5e }));
  lamp.position.set(0, y, 0);
  group.add(lamp);
  return lamp;
}

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function cylinder(rTop: number, rBottom: number, h: number, mat: THREE.Material, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Bọt khí bốc lên trong một khối hộp. */
function bubbles(count: number, w: number, h: number, d: number, y0: number) {
  const pos = new Float32Array(count * 3);
  const seed = Array.from({ length: count }, () => [Math.random() - 0.5, Math.random(), Math.random() - 0.5, 0.4 + Math.random() * 0.8]);
  const pts = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  const tick = (time: number, on: boolean) => {
    pts.visible = on;
    if (!on) return;
    seed.forEach(([x, y, z, v], i) => {
      pos[i * 3] = x * w;
      pos[i * 3 + 1] = y0 + ((y + time * v * 0.4) % 1) * h;
      pos[i * 3 + 2] = z * d;
    });
    pts.geometry.attributes.position.needsUpdate = true;
  };
  return { pts, tick };
}

/* ---------------- dùng asset ---------------- */

export class AssetKit {
  private parts = new Map<string, Part[]>();
  constructor(private lib: BbLibrary) {}
  has(key: string) {
    return !!this.lib[key];
  }
  partsOf(key: string) {
    if (!this.parts.has(key)) this.parts.set(key, buildParts(this.lib[key]));
    return this.parts.get(key)!;
  }
  /** Model đặt tâm đáy ở gốc, co giãn theo kích thước mong muốn (m). */
  place(key: string, size: THREE.Vector3Like) {
    const parts = this.partsOf(key);
    const s = partsSize(parts);
    const g = modelGroup(parts);
    g.scale.set(size.x / s.x, size.y / s.y, size.z / s.z);
    const bb = new THREE.Box3();
    for (const p of parts) bb.union(p.geometry.boundingBox!);
    g.position.set(-((bb.min.x + bb.max.x) / 2) * g.scale.x, -bb.min.y * g.scale.y, -((bb.min.z + bb.max.z) / 2) * g.scale.z);
    const wrap = new THREE.Group();
    wrap.add(g);
    return wrap;
  }
}

/* ---------------- thiết bị ---------------- */

export function drumFilter(kit: AssetKit): Equipment {
  const group = new THREE.Group();
  const size = new THREE.Vector3(1.4, 1.1, 1.3);
  group.add(kit.place("drum_filter", size));
  return { group, inlet: new THREE.Vector3(-0.7, 0.6, 0), outlet: new THREE.Vector3(0.7, 0.45, 0), height: size.y, lamp: lampAt(group, size.y + 0.3) };
}

export function pump(kit: AssetKit): Equipment {
  const group = new THREE.Group();
  const size = new THREE.Vector3(0.7, 0.6, 0.6);
  group.add(kit.place("pump", size));
  let spin = 0;
  const shaft = box(0.08, 0.08, 0.5, MAT.dark, 0, 0.26, 0);
  group.add(shaft);
  return {
    group,
    inlet: new THREE.Vector3(-0.35, 0.3, 0),
    outlet: new THREE.Vector3(0.35, 0.3, 0),
    height: size.y,
    lamp: lampAt(group, size.y + 0.3),
    animate: (_t, on) => {
      if (on) spin += 0.4;
      shaft.rotation.z = spin;
    },
  };
}

/** Bể chữ nhật từ asset tank, có khối nước bên trong. */
export function boxTank(kit: AssetKit, w: number, h: number, d: number): Equipment {
  const group = new THREE.Group();
  group.add(kit.place("tank", new THREE.Vector3(w, h, d)));
  const water = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 1, d * 0.9), waterMaterial());
  water.scale.y = h * 0.82;
  water.position.y = 0.06 + water.scale.y / 2;
  group.add(water);
  return { group, water, inlet: new THREE.Vector3(-w / 2, h * 0.75, 0), outlet: new THREE.Vector3(w / 2, h * 0.5, 0), height: h, lamp: lampAt(group, h + 0.3) };
}

/** Bể vi sinh MBBR: bể chữ nhật, giá thể trôi và bọt khí. */
export function mbbr(kit: AssetKit, mediaVolume: number): Equipment {
  const reactor = Math.max(0.3, mediaVolume / 0.5);
  const h = 1.2;
  const w = Math.sqrt((reactor / h) * 1.4);
  const d = (reactor / h) / w;
  const eq = boxTank(kit, w, h, d);
  const chips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.03, 0.05), MAT.media, 160);
  const seeds = Array.from({ length: 160 }, () => [Math.random() * Math.PI * 2, 0.15 + Math.random() * 0.8, Math.random() * 0.5 + 0.3, Math.random()]);
  eq.group.add(chips);
  const air = bubbles(120, w * 0.8, h * 0.75, d * 0.8, 0.08);
  eq.group.add(air.pts);
  const m4 = new THREE.Matrix4();
  eq.animate = (time, on) => {
    seeds.forEach(([a, y, r, ph], i) => {
      const ang = a + (on ? time * (0.6 + ph) : 0);
      m4.makeRotationY(ang * 3).setPosition(Math.cos(ang) * r * w * 0.4, 0.1 + y * h * 0.7 + Math.sin(time * 2 + ph * 6) * 0.03, Math.sin(ang) * r * d * 0.4);
      chips.setMatrixAt(i, m4);
    });
    chips.instanceMatrix.needsUpdate = true;
    air.tick(time, on);
  };
  return eq;
}

/** Tách đạm (protein skimmer): cột phản ứng, cốc gom bọt, hộc chứa dưới. */
export function skimmer(): Equipment {
  const group = new THREE.Group();
  group.add(box(0.7, 0.35, 0.6, MAT.hdpe));
  const col = cylinder(0.17, 0.17, 1.5, new THREE.MeshPhongMaterial({ color: 0xbfe6f5, transparent: true, opacity: 0.45, depthWrite: false }));
  col.position.set(0, 0.35 + 0.75, 0);
  group.add(col);
  const cup = cylinder(0.26, 0.2, 0.3, MAT.pvc);
  cup.position.set(0, 0.35 + 1.5 + 0.15, 0);
  group.add(cup);
  const foam = cylinder(0.22, 0.22, 0.12, MAT.foam);
  foam.position.set(0, 0.35 + 1.5 + 0.26, 0);
  group.add(foam);
  const air = bubbles(70, 0.24, 1.35, 0.24, 0.4);
  group.add(air.pts);
  return {
    group,
    inlet: new THREE.Vector3(-0.35, 0.25, 0),
    outlet: new THREE.Vector3(0.35, 0.2, 0),
    height: 2.2,
    lamp: lampAt(group, 2.5),
    animate: (t, on) => {
      air.tick(t, on);
      foam.scale.y = on ? 1 + Math.sin(t * 1.3) * 0.2 : 0.5;
    },
  };
}

/** Tháp khử CO₂ dạng đệm, quạt hút trên đỉnh, hộc chứa dưới. */
export function degasser(): Equipment {
  const group = new THREE.Group();
  group.add(box(0.95, 0.4, 0.95, MAT.hdpe));
  group.add(box(0.7, 2.0, 0.7, MAT.pvc, 0, 0.4, 0));
  for (let i = 0; i < 4; i++) group.add(box(0.72, 0.06, 0.72, MAT.dark, 0, 0.65 + i * 0.45, 0));
  group.add(box(0.5, 0.22, 0.5, MAT.steel, 0, 2.4, 0));
  const blades = new THREE.Group();
  blades.position.set(0, 2.66, 0);
  for (let i = 0; i < 3; i++) {
    const b = box(0.42, 0.02, 0.08, MAT.dark);
    b.rotation.y = (i * Math.PI) / 3;
    blades.add(b);
  }
  group.add(blades);
  return {
    group,
    inlet: new THREE.Vector3(-0.35, 2.1, 0),
    outlet: new THREE.Vector3(0.48, 0.25, 0),
    height: 2.7,
    lamp: lampAt(group, 3.0),
    animate: (_t, on) => {
      if (on) blades.rotation.y += 0.35;
    },
  };
}

/** Đèn UV ống ngang trên giá, phát sáng tím khi bật. */
export function uvReactor(): Equipment {
  const group = new THREE.Group();
  group.add(box(0.1, 0.5, 0.1, MAT.frame, -0.4, 0, 0));
  group.add(box(0.1, 0.5, 0.1, MAT.frame, 0.4, 0, 0));
  const tube = cylinder(0.12, 0.12, 1.1, MAT.steel);
  tube.rotation.z = Math.PI / 2;
  tube.position.set(0, 0.62, 0);
  group.add(tube);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x9b7bff, transparent: true, opacity: 0.0 });
  const glow = cylinder(0.14, 0.14, 0.9, glowMat);
  glow.rotation.z = Math.PI / 2;
  glow.position.set(0, 0.62, 0);
  group.add(glow);
  group.add(box(0.3, 0.35, 0.2, MAT.dark, 0, 0, 0.35));
  return {
    group,
    inlet: new THREE.Vector3(-0.55, 0.62, 0),
    outlet: new THREE.Vector3(0.55, 0.62, 0),
    height: 0.8,
    lamp: lampAt(group, 1.1),
    animate: (t, on) => {
      glowMat.opacity = on ? 0.35 + Math.sin(t * 8) * 0.08 : 0;
    },
  };
}

/** Côn ôxy (Speece cone) và bình ôxy lỏng. */
export function oxygenCone(): Equipment {
  const group = new THREE.Group();
  const cone = cylinder(0.12, 0.36, 1.3, MAT.steel, 14);
  cone.position.set(0, 0.25 + 0.65, 0);
  group.add(cone);
  group.add(box(0.3, 0.25, 0.3, MAT.frame));
  const tank = cylinder(0.16, 0.16, 1.2, MAT.o2, 12);
  tank.position.set(0.15, 0.6, 0.6);
  group.add(tank);
  const cap = cylinder(0.08, 0.16, 0.12, MAT.o2, 12);
  cap.position.set(0.15, 1.26, 0.6);
  group.add(cap);
  return { group, inlet: new THREE.Vector3(0, 1.55, 0), outlet: new THREE.Vector3(0.38, 0.3, 0), height: 1.6, lamp: lampAt(group, 1.9) };
}

/** Bể tròn cho cá/tôm. */
export function roundTank(volume: number): Equipment {
  const h = volume > 8 ? 1.4 : 1.0;
  const r = Math.sqrt(volume / (Math.PI * h * 0.85));
  const group = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28, 1, true), new THREE.MeshLambertMaterial({ color: 0x2f6fae, side: THREE.DoubleSide }));
  wall.position.y = h / 2;
  wall.castShadow = wall.receiveShadow = true;
  group.add(wall);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(r, 28), MAT.dark);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  group.add(floor);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 6, 28), MAT.pvc);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = h;
  group.add(rim);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.97, r * 0.97, 1, 28), waterMaterial());
  water.scale.y = h * 0.85;
  water.position.y = water.scale.y / 2;
  group.add(water);
  const stand = cylinder(0.06, 0.06, h + 0.2, MAT.pvc, 8);
  stand.position.set(0, (h + 0.2) / 2, 0);
  group.add(stand);
  return { group, water, inlet: new THREE.Vector3(-r, h, 0), outlet: new THREE.Vector3(r, 0.2, 0), height: h, lamp: lampAt(group, h + 0.5) };
}

/** Khung kệ thép cho hộp cua. */
export function rackFrame(length: number, tiers: number, depth: number, tierH: number) {
  const g = new THREE.Group();
  const H = tiers * tierH + 0.15;
  const posts = Math.max(2, Math.ceil(length / 1.2) + 1);
  for (let i = 0; i < posts; i++) {
    const x = -length / 2 + (i * length) / (posts - 1);
    for (const z of [-depth / 2, depth / 2]) g.add(box(0.05, H, 0.05, MAT.frame, x, 0, z));
  }
  for (let t = 0; t < tiers; t++) g.add(box(length, 0.03, depth, MAT.frame, 0, 0.08 + t * tierH, 0));
  // Ống tràn chung chạy dọc mỗi kệ.
  const drain = cylinder(0.04, 0.04, length, MAT.pvc, 8);
  drain.rotation.z = Math.PI / 2;
  drain.position.set(0, 0.04, depth / 2 + 0.08);
  g.add(drain);
  return g;
}

/** Hộp cua dạng InstancedMesh từ asset crab_box (nhiều hộp, ít draw call). */
export function crabBoxes(kit: AssetKit, positions: THREE.Vector3[], size: THREE.Vector3) {
  const parts = kit.partsOf("crab_box");
  const s = partsSize(parts);
  const bb = new THREE.Box3();
  for (const p of parts) bb.union(p.geometry.boundingBox!);
  const scale = new THREE.Vector3(size.x / s.x, size.y / s.y, size.z / s.z);
  const offset = new THREE.Vector3(-((bb.min.x + bb.max.x) / 2) * scale.x, -bb.min.y * scale.y, -((bb.min.z + bb.max.z) / 2) * scale.z);
  const group = new THREE.Group();
  const m4 = new THREE.Matrix4();
  for (const p of parts) {
    const inst = new THREE.InstancedMesh(p.geometry, p.material, positions.length);
    positions.forEach((pos, i) => {
      m4.makeScale(scale.x, scale.y, scale.z).setPosition(pos.x + offset.x, pos.y + offset.y, pos.z + offset.z);
      inst.setMatrixAt(i, m4);
    });
    inst.castShadow = inst.receiveShadow = true;
    group.add(inst);
  }
  // Đèn trạng thái từng hộp.
  const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff }), positions.length);
  positions.forEach((pos, i) => {
    m4.makeTranslation(pos.x, pos.y + size.y + 0.04, pos.z + size.z * 0.35);
    lamps.setMatrixAt(i, m4);
    lamps.setColorAt(i, new THREE.Color(0x4ade80));
  });
  group.add(lamps);
  return { group, lamps };
}
