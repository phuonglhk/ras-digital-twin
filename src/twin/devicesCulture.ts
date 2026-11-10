/*
 * Hộp nuôi cua và kệ xếp chồng theo chuẩn mô hình 3D (docs/chuan-mo-hinh-3d.md), đợt 3.
 * Hộp xếp chồng trực tiếp kiểu căn hộ, khoá bằng gờ ở góc, không có khung kệ và không có khe giữa tầng.
 * Ống cấp và ống thu chạy sau lưng hộp. Kích thước là cỡ điển hình, chỉ để minh hoạ.
 */
import * as THREE from "three";

import { finish, move, NX, port, X, type StandardEquipment } from "./devices";
import { PBR, waterMaterial } from "./materials";
import { Kit, orient, pipeRadius, v3, type Detail } from "./parts";

/** Kích thước hộp (m): dài theo X, sâu theo Z (cửa ở +Z), bước tầng khi xếp chồng. */
export const CRAB_BOX = { w: 0.44, h: 0.24, d: 0.4, pitch: 0.235, wall: 0.008 };
/** Khoảng lùi sau lưng hộp của tuyến ống cấp và ống thu. */
const BACK = CRAB_BOX.d / 2 + 0.05;
const SUPPLY_Y = CRAB_BOX.h - 0.045; // đầu cấp xuyên thành sau
const DRAIN_Y = 0.05; // cửa ra ống tràn xuyên thành sau

/** Hình học một hộp, gộp theo vật liệu để dựng InstancedMesh. Gốc ở tâm đáy hộp. */
function crabBoxGeometries(detail: Detail) {
  const { w, h, d, wall } = CRAB_BOX;
  const kit = new Kit(detail);
  kit.openTank(w, h, d, wall, PBR.boxBlue, undefined, PBR.translucent);
  kit.box(0.09, 0.014, 0.012, PBR.black, move(0, h * 0.72, d / 2 + 0.002)); // tay cửa
  if (kit.high)
    for (const x of [-w / 2 + 0.02, w / 2 - 0.02])
      for (const z of [-d / 2 + 0.02, d / 2 - 0.02]) kit.box(0.03, 0.01, 0.03, PBR.boxBlue, move(x, h, z)); // gờ khoá
  // Ống tràn đặt mực nước và cửa ra xuyên thành sau.
  const xs = -w / 2 + 0.06;
  kit.cyl(0.012, 0.085, PBR.pvc, move(xs, wall, -d / 2 + 0.06), 0.012, false, 8);
  kit.cyl(0.011, 0.1, PBR.pvc, orient(v3(xs, DRAIN_Y, -BACK), v3(0, 0, 1)), 0.011, false, 8);
  // Đầu cấp nước xuyên thành sau, gần mép trên.
  const xc = w / 2 - 0.07;
  kit.cyl(0.008, 0.09, PBR.pvc, orient(v3(xc, SUPPLY_Y, -BACK), v3(0, 0, 1)), 0.008, false, 8);
  // Cua: mai và hai càng, đủ để nhận ra trong hộp.
  const seg = kit.high ? 10 : 6;
  const shell = new THREE.SphereGeometry(1, seg, Math.max(4, seg / 2));
  shell.scale(0.06, 0.02, 0.045);
  kit.add(shell, PBR.crab, move(0.03, wall + 0.022, 0.03));
  for (const side of [-1, 1]) {
    const claw = new THREE.SphereGeometry(1, seg, Math.max(4, seg / 2));
    claw.scale(0.022, 0.012, 0.016);
    kit.add(claw, PBR.crab, move(0.03 + side * 0.065, wall + 0.02, 0.075));
  }
  return kit.merged();
}

/**
 * Nhiều hộp cua dạng InstancedMesh: mỗi vật liệu một draw call.
 * `lamps` là đèn trạng thái từng hộp (tô màu bằng setColorAt), `water` là nước trong hộp (tô màu chung).
 */
export function crabBoxes(positions: THREE.Vector3[], detail: Detail = "low") {
  const { w, h, d, wall } = CRAB_BOX;
  const group = new THREE.Group();
  group.name = "hop-cua";
  const m4 = new THREE.Matrix4();
  const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, dx = 0, dy = 0, dz = 0) => {
    const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
    positions.forEach((p, i) => mesh.setMatrixAt(i, m4.makeTranslation(p.x + dx, p.y + dy, p.z + dz)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.castShadow = mesh.receiveShadow = !material.transparent;
    group.add(mesh);
    return mesh;
  };
  for (const { geometry, material } of crabBoxGeometries(detail)) instanced(geometry, material);
  const depth = 0.07;
  const water = instanced(
    new THREE.BoxGeometry(w - wall * 2, depth, d - wall * 2),
    waterMaterial(),
    0,
    wall + depth / 2,
    0,
  );
  water.name = "nuoc";
  const lamps = instanced(
    new THREE.BoxGeometry(0.03, 0.02, 0.01),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    w / 2 - 0.04,
    h * 0.72,
    d / 2 + 0.006,
  );
  lamps.name = "den-trang-thai-hop";
  positions.forEach((_, i) => lamps.setColorAt(i, new THREE.Color(0x4ade80)));
  return { group, lamps, water };
}

/** Kệ hộp cua xếp chồng 3 cột × 4 tầng trên đế bê tông, có ống cấp, van từng tầng và ống thu sau lưng. */
export function crabRack(detail: Detail = "high"): StandardEquipment {
  const { w, h, d, pitch } = CRAB_BOX;
  const kit = new Kit(detail);
  const cols = 3;
  const tiers = 4;
  const px = w + 0.01;
  const base = 0.12;
  const half = (cols * px) / 2;
  const top = base + (tiers - 1) * pitch + h;
  const rs = pipeRadius(27);
  const rd = pipeRadius(34);
  const xs = -half - 0.1; // ống đứng cấp
  const xr = half + 0.1; // ống đứng thu

  kit.part("de-ke");
  kit.box(cols * px + 0.1, base, d + 0.1, PBR.plinth);
  // Nắp tầng trên cùng và đai chằng chống đổ ở hai đầu.
  for (let c = 0; c < cols; c++) kit.box(w, 0.012, d, PBR.boxBlue, move(-half + px / 2 + c * px, top, 0));
  for (const x of [-half + 0.03, half - 0.03]) {
    kit.box(0.025, top - base + 0.016, 0.003, PBR.black, move(x, base, d / 2 + 0.003));
    kit.box(0.025, 0.003, d + 0.006, PBR.black, move(x, top + 0.012, 0));
  }

  kit.part("ong-cap");
  kit.pipe([v3(xs - 0.17, 0.1, -BACK), v3(xs, 0.1, -BACK), v3(xs, top + 0.04, -BACK)], pipeRadius(42), PBR.pipeSupply);
  kit.cyl(pipeRadius(42) * 1.3, 0.025, PBR.pipeSupply, move(xs, top + 0.04, -BACK), pipeRadius(42) * 1.3, false, 8);
  kit.unionStub(pipeRadius(42), 0.04, PBR.pipeSupply, orient(v3(xs - 0.13, 0.1, -BACK), NX));
  for (let t = 0; t < tiers; t++) {
    const y = base + t * pitch + SUPPLY_Y;
    kit.pipe([v3(xs, y, -BACK), v3(half - 0.05, y, -BACK)], rs, PBR.pipeSupply);
    kit.cyl(rs * 1.3, 0.02, PBR.pipeSupply, orient(v3(half - 0.05, y, -BACK), X), rs * 1.3, false, 8);
    kit.ballValve(rs, orient(v3(xs + 0.055, y, -BACK), X, v3(0, 0, -1)));
  }

  kit.part("ong-thu");
  kit.pipe(
    [v3(xr, base + (tiers - 1) * pitch + DRAIN_Y + 0.03, -BACK), v3(xr, 0.1, -BACK), v3(xr + 0.17, 0.1, -BACK)],
    pipeRadius(60),
    PBR.pipeReturn,
  );
  kit.cyl(
    pipeRadius(60) * 1.5,
    0.04,
    PBR.pipeReturn,
    orient(v3(xr + 0.13, 0.1, -BACK), X),
    pipeRadius(60) * 1.5,
    false,
    8,
  );
  for (let t = 0; t < tiers; t++) {
    const y = base + t * pitch + DRAIN_Y;
    kit.pipe([v3(-half + 0.03, y, -BACK), v3(xr, y, -BACK)], rd, PBR.pipeReturn);
    kit.cyl(rd * 1.3, 0.02, PBR.pipeReturn, orient(v3(-half + 0.03, y, -BACK), NX), rd * 1.3, false, 8);
  }

  const root = kit.build();
  const positions: THREE.Vector3[] = [];
  for (let t = 0; t < tiers; t++)
    for (let c = 0; c < cols; c++) positions.push(v3(-half + px / 2 + c * px, base + t * pitch, 0));
  const boxes = crabBoxes(positions, detail);
  boxes.lamps.removeFromParent(); // trang thiết bị không cần đèn trạng thái từng hộp
  boxes.lamps.geometry.dispose();
  (boxes.lamps.material as THREE.Material).dispose();
  root.add(boxes.group);

  return finish(
    root,
    [
      port("vao", "nuoc-vao", v3(xs - 0.17, 0.1, -BACK), NX, 42),
      port("ra", "nuoc-ra", v3(xr + 0.17, 0.1, -BACK), X, 60),
    ],
    undefined,
    boxes.water,
  );
}
