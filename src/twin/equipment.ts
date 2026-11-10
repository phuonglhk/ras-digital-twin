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
  return new THREE.MeshPhongMaterial({
    color: 0x4fb7e6,
    transparent: true,
    opacity: 0.62,
    shininess: 80,
    depthWrite: false,
  });
}

function lampAt(group: THREE.Group, y: number) {
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x5b6b5e }),
  );
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
    g.position.set(
      -((bb.min.x + bb.max.x) / 2) * g.scale.x,
      -bb.min.y * g.scale.y,
      -((bb.min.z + bb.max.z) / 2) * g.scale.z,
    );
    const wrap = new THREE.Group();
    wrap.add(g);
    return wrap;
  }
}

/* ---------------- thiết bị ---------------- */

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
  const offset = new THREE.Vector3(
    -((bb.min.x + bb.max.x) / 2) * scale.x,
    -bb.min.y * scale.y,
    -((bb.min.z + bb.max.z) / 2) * scale.z,
  );
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
  const lamps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.05, 0.05, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    positions.length,
  );
  positions.forEach((pos, i) => {
    m4.makeTranslation(pos.x, pos.y + size.y + 0.04, pos.z + size.z * 0.35);
    lamps.setMatrixAt(i, m4);
    lamps.setColorAt(i, new THREE.Color(0x4ade80));
  });
  group.add(lamps);
  return { group, lamps };
}

/** Gắn tên bộ phận cho các nhóm hình học được tạo bởi builder. */
export function labelEquipmentParts(equipment: Equipment, labels: string[], indexes: number[][]): Equipment {
  indexes.forEach((groupIndexes, index) => {
    groupIndexes.forEach((childIndex) => {
      const child = equipment.group.children[childIndex];
      if (child) child.userData.part = labels[index];
    });
  });
  return equipment;
}

/** Gắn nhãn theo tên bộ phận (thiết bị đã chuẩn hoá). Mỗi nhãn ứng với một hoặc nhiều nhóm có tên. */
export function labelEquipmentByName(equipment: Equipment, labels: string[], names: string[][]): Equipment {
  names.forEach((group, index) => {
    for (const name of group) {
      const part = equipment.group.getObjectByName(name);
      if (part) part.userData.part = labels[index];
    }
  });
  return equipment;
}

/** Kệ hộp với các giọt nước cấp và dòng chảy trong ống tràn. */
export function crabRack(kit: AssetKit): Equipment {
  const group = new THREE.Group();
  group.add(rackFrame(1.5, 3, 0.7, 0.4));
  const positions = [-0.45, 0, 0.45].flatMap((x) => [0.1, 0.5].map((y) => new THREE.Vector3(x, y, 0)));
  group.add(crabBoxes(kit, positions, new THREE.Vector3(0.4, 0.3, 0.6)).group);
  const pipe = cylinder(0.04, 0.04, 1.5, MAT.pvc, 8);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(0, 0.1, 0.43);
  group.add(pipe);
  const drops = positions.map(() => new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), MAT.hdpe));
  drops.forEach((drop) => group.add(drop));
  const flow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), MAT.hdpe);
  group.add(flow);
  const lamp = lampAt(group, 1.5);
  return {
    group,
    inlet: new THREE.Vector3(0, 1.3, 0),
    outlet: new THREE.Vector3(0.75, 0.1, 0.43),
    height: 1.3,
    lamp,
    animate: (t, on) => {
      drops.forEach((drop, i) => {
        drop.visible = on;
        drop.position.set(positions[i].x, positions[i].y + 0.55 - ((t + i * 0.16) % 1) * 0.25, 0);
      });
      flow.visible = on;
      flow.position.set(-0.75 + (t % 1) * 1.5, 0.1, 0.43);
    },
  };
}

/* Thiết bị đã dựng theo chuẩn mô hình 3D (docs/chuan-mo-hinh-3d.md). */
export { oxygenCone, pump, skimmer, uvReactor } from "./devices";
export { blower, degasser, denitrification, drumFilter, mbbr, roundTank } from "./devicesProcess";
