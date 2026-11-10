/*
 * Thiết bị RAS dựng theo chuẩn mô hình 3D (docs/chuan-mo-hinh-3d.md).
 * Kích thước là cỡ điển hình cho hệ 10–30 m³/giờ, chỉ để minh hoạ; không sao chép mô hình của hãng nào.
 * Gốc toạ độ ở tâm đáy; cửa nước vào phía -X, cửa ra phía +X.
 */
import * as THREE from "three";

import type { Equipment } from "./equipment";
import { glowMaterial, PBR, waterMaterial } from "./materials";
import { attach, bubbles, Kit, orient, pipeRadius, v3, type Detail, type Port, type PortKind } from "./parts";

export interface StandardEquipment extends Equipment {
  ports: Port[];
  /** Kích thước khung bao (m), không tính đèn trạng thái. */
  size: THREE.Vector3;
}

export const X = v3(1, 0, 0);
export const NX = v3(-1, 0, 0);
export const Y = v3(0, 1, 0);
export const NY = v3(0, -1, 0);
export const Z = v3(0, 0, 1);
export const move = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);

export const port = (
  name: string,
  kind: PortKind,
  position: THREE.Vector3,
  direction: THREE.Vector3,
  dn: number,
): Port => ({
  name,
  kind,
  position,
  direction,
  dn,
});

/**
 * Đưa tâm đáy về gốc, gắn đèn trạng thái và hoàn thiện giao diện Equipment.
 * `main` là tên hai cổng chính (vào, ra) khi thiết bị không có cổng nước, ví dụ máy thổi khí.
 */
export function finish(
  root: THREE.Group,
  ports: Port[],
  animate?: (time: number, running: boolean) => void,
  water?: THREE.Mesh,
  main?: [string, string],
): StandardEquipment {
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const offset = v3(-(bounds.min.x + bounds.max.x) / 2, -bounds.min.y, -(bounds.min.z + bounds.max.z) / 2);
  root.position.copy(offset);
  for (const p of ports) p.position.add(offset);
  const group = new THREE.Group();
  group.add(root);
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x5b6b5e }),
  );
  lamp.name = "den-trang-thai";
  lamp.position.set(0, size.y + 0.3, 0);
  group.add(lamp);
  const find = (kind: PortKind, name?: string) =>
    ports.find((p) => (name ? p.name === name : p.kind === kind))!.position.clone();
  return {
    group,
    ports,
    size,
    inlet: find("nuoc-vao", main?.[0]),
    outlet: find("nuoc-ra", main?.[1]),
    height: size.y,
    lamp,
    water,
    animate,
  };
}

/** Bơm ly tâm trục ngang hút dọc trục, đẩy lên trên, động cơ và bơm chung bệ. */
export function pump(detail: Detail = "high"): StandardEquipment {
  const kit = new Kit(detail);
  const yc = 0.3; // cao độ trục
  const rs = pipeRadius(80); // cửa hút DN80
  const rd = pipeRadius(65); // cửa đẩy DN65

  kit.part("be");
  kit.skid(1.0, 0.36, 0.08, PBR.steelBlue, 0.04);
  kit.box(0.36, 0.055, 0.26, PBR.steelBlue, orient(v3(0.31, 0.08, 0)));
  if (kit.high)
    for (const x of [-0.4, 0.48])
      for (const z of [-0.15, 0.15]) kit.cyl(0.008, 0.02, PBR.inox, orient(v3(x, 0.08, z)), 0.008, false, 6);

  kit.part("than-bom");
  kit.cyl(0.17, 0.11, PBR.castIron, orient(v3(-0.375, yc, 0), X));
  kit.ring(0.15, 0.046, PBR.castIron, orient(v3(-0.32, yc, 0), X));
  kit.cyl(0.12, 0.03, PBR.castIron, orient(v3(-0.265, yc, 0), X), 0.075);
  kit.nozzle(rs, 0.125, PBR.castIron, orient(v3(-0.375, yc, 0), NX));
  kit.nozzle(rd, 0.2, PBR.castIron, orient(v3(-0.32, yc + 0.12, 0)));
  kit.box(0.1, yc - 0.15 - 0.08, 0.2, PBR.castIron, orient(v3(-0.32, 0.08, 0)));
  if (kit.high) kit.cyl(0.012, 0.02, PBR.brass, orient(v3(-0.32, yc - 0.19, 0), NY), 0.012, false, 6); // nút xả

  kit.part("truc-bom");
  kit.cyl(0.065, 0.175, PBR.castIron, orient(v3(-0.235, yc, 0), X));
  kit.box(0.09, yc - 0.06 - 0.08, 0.14, PBR.castIron, orient(v3(-0.15, 0.08, 0)));
  const guard = new THREE.CylinderGeometry(0.078, 0.078, 0.16, kit.seg, 1, true, -Math.PI / 2, Math.PI);
  guard.translate(0, 0.08, 0);
  kit.add(guard, PBR.steelYellow, orient(v3(-0.06, yc, 0), X, Y));
  kit.box(0.16, 0.012, 0.02, PBR.steelYellow, orient(v3(0.02, yc - 0.01, 0.078)));
  kit.box(0.16, 0.012, 0.02, PBR.steelYellow, orient(v3(0.02, yc - 0.01, -0.078)));

  kit.part("dong-co");
  kit.motor(0.12, 0.42, orient(v3(0.1, yc, 0), X, Y));

  kit.part("dong-ho");
  kit.gauge(orient(v3(-0.44, yc + rs, 0)));
  kit.gauge(orient(v3(-0.32, yc + 0.135, 0.1)));

  const root = kit.build();

  // Trục và khớp nối quay, nhìn thấy dưới chắn bảo vệ.
  const rotor = new Kit(detail);
  rotor.cyl(0.018, 0.16, PBR.inox, orient(v3(0, 0, 0), X));
  rotor.cyl(0.05, 0.035, PBR.castIron, orient(v3(0.035, 0, 0), X));
  rotor.cyl(0.05, 0.035, PBR.castIron, orient(v3(0.078, 0, 0), X));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    rotor.cyl(0.007, 0.09, PBR.inox, orient(v3(0.03, Math.cos(a) * 0.036, Math.sin(a) * 0.036), X), 0.007, false, 6);
  }
  const spin = rotor.build();
  spin.position.set(-0.06, yc, 0);
  attach(root, "truc-bom", spin);

  return finish(
    root,
    [port("hut", "nuoc-vao", v3(-0.5, yc, 0), NX, 80), port("day", "nuoc-ra", v3(-0.32, yc + 0.32, 0), Y, 65)],
    (t, on) => {
      spin.rotation.x = on ? t * 12 : 0;
    },
  );
}

/** Thiết bị tách đạm (protein skimmer): cột trong suốt, cổ côn, cốc bọt, bơm venturi, ống ra có van cổng. */
export function skimmer(detail: Detail = "high"): StandardEquipment {
  const kit = new Kit(detail);
  const rb = 0.2; // bán kính cột
  const rp = pipeRadius(50);

  kit.part("cot-tiep-xuc");
  kit.cyl(0.27, 0.03, PBR.pp);
  kit.cyl(0.235, 0.03, PBR.pvc, move(0, 0.03, 0));
  kit.cyl(rb, 1.2, PBR.clear, move(0, 0.06, 0), rb, true);
  kit.cyl(0.235, 0.03, PBR.pvc, move(0, 1.26, 0));
  if (kit.high)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      kit.cyl(0.006, 1.26, PBR.inox, move(Math.cos(a) * 0.222, 0.03, Math.sin(a) * 0.222), 0.006, false, 6);
    }

  kit.part("coc-bot");
  kit.cyl(rb, 0.2, PBR.pp, move(0, 1.29, 0), 0.085, true);
  kit.cyl(0.085, 0.23, PBR.clear, move(0, 1.49, 0), 0.085, true);
  kit.cyl(0.245, 0.012, PBR.pp, move(0, 1.6, 0));
  kit.cyl(0.24, 0.32, PBR.clear, move(0, 1.612, 0), 0.24, true);
  kit.cyl(0.252, 0.02, PBR.pp, move(0, 1.932, 0));
  kit.cyl(0.03, 0.03, PBR.pp, move(0, 1.952, 0), 0.02);
  const rdr = pipeRadius(20);
  kit.pipe([v3(0.235, 1.64, 0), v3(0.4, 1.64, 0), v3(0.4, 1.25, 0)], rdr, PBR.pvc);
  kit.ballValve(rdr, orient(v3(0.315, 1.64, 0), X));

  kit.part("cap-khi");
  kit.box(0.34, 0.012, 0.16, PBR.pp, orient(v3(0.1, 0, 0.36)));
  kit.cyl(0.075, 0.06, PBR.black, orient(v3(0.0, 0.12, 0.36), X));
  kit.motor(0.06, 0.2, orient(v3(0.06, 0.12, 0.36), X, Y));
  kit.pipe([v3(0.03, 0.18, 0.36), v3(0.03, 0.32, 0.36), v3(0.03, 0.32, 0.19)], pipeRadius(25), PBR.pvc);
  kit.pipe([v3(0.0, 0.12, 0.36), v3(-0.12, 0.12, 0.36), v3(-0.12, 0.12, 0.16)], pipeRadius(32), PBR.pvc);
  kit.cyl(0.02, 0.05, PBR.pvc, orient(v3(-0.09, 0.12, 0.36), Y), 0.012, false, 8); // họng venturi
  kit.pipe([v3(-0.09, 0.17, 0.36), v3(-0.09, 0.95, 0.36)], 0.006, PBR.black);
  kit.rotameter(move(-0.09, 0.95, 0.36), 0.2);
  kit.cyl(0.018, 0.04, PBR.black, move(-0.09, 1.15, 0.36), 0.018, false, 8); // giảm thanh
  kit.box(0.03, 0.012, 0.17, PBR.pvc, orient(v3(-0.09, 1.0, 0.285)));

  kit.part("cua-vao");
  kit.unionStub(rp, 0.14, PBR.pvc, orient(v3(-rb + 0.005, 0.85, 0), NX));

  kit.part("cua-ra");
  kit.pipe([v3(rb - 0.01, 0.14, 0), v3(0.38, 0.14, 0), v3(0.38, 1.05, 0), v3(0.56, 1.05, 0)], rp, PBR.pvc);
  kit.gateValve(rp, orient(v3(0.38, 0.6, 0)));
  kit.cyl(rp * 1.5, rp * 1.1, PBR.pvc, orient(v3(0.56 - rp * 1.1, 1.05, 0), X), rp * 1.5, false, 8);

  const root = kit.build();

  const water = new THREE.Mesh(new THREE.CylinderGeometry(rb - 0.012, rb - 0.012, 1.14, kit.seg), waterMaterial());
  water.position.set(0, 0.07 + 0.57, 0);
  attach(root, "cot-tiep-xuc", water);
  const air = bubbles(detail === "high" ? 90 : 40, 0.26, 1.1, 0.26, 0.1);
  attach(root, "cot-tiep-xuc", air.pts);
  const foamNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 1, kit.seg), PBR.foam);
  const foamCup = new THREE.Mesh(new THREE.CylinderGeometry(0.228, 0.228, 1, kit.seg), PBR.foam);
  attach(root, "coc-bot", foamNeck);
  attach(root, "coc-bot", foamCup);
  const animate = (t: number, on: boolean) => {
    air.tick(t, on);
    const neck = on ? 0.2 + Math.sin(t * 1.3) * 0.025 : 0.04;
    foamNeck.scale.y = neck;
    foamNeck.position.y = 1.4 + neck / 2 + (on ? 0.1 : 0);
    const cup = on ? 0.07 + Math.sin(t * 0.7) * 0.01 : 0.03;
    foamCup.scale.y = cup;
    foamCup.position.y = 1.614 + cup / 2;
  };
  animate(0, false);

  return finish(
    root,
    [
      port("vao", "nuoc-vao", v3(-rb + 0.005 - 0.14, 0.85, 0), NX, 50),
      port("ra", "nuoc-ra", v3(0.56, 1.05, 0), X, 50),
      port("xa-bot", "bun", v3(0.4, 1.25, 0), NY, 20),
    ],
    animate,
  );
}

/** Đèn UV kín: buồng inox nằm ngang, cửa vào/ra mặt bích lệch hai đầu, tủ ballast. */
export function uvReactor(detail: Detail = "high"): StandardEquipment {
  const kit = new Kit(detail);
  const yc = 0.5;
  const rc = 0.09; // bán kính buồng
  const rn = pipeRadius(65);
  const glow = glowMaterial(0x9b7bff);
  glow.userData.animated = true;
  const lampOn = glowMaterial(0x4bd37b);
  lampOn.userData.animated = true;

  kit.part("buong-chieu");
  kit.cyl(rc, 1.0, PBR.inox, orient(v3(-0.5, yc, 0), X));
  const t = kit.flange(rc, PBR.inox, orient(v3(-0.5, yc, 0), NX));
  kit.dome(rc, 0.05, PBR.inox, orient(v3(-0.5 - t, yc, 0), NX));
  kit.flange(rc, PBR.inox, orient(v3(0.5, yc, 0), X));
  kit.pipe([v3(-0.36, yc - 0.06, 0), v3(-0.36, 0.22, 0), v3(-0.62, 0.22, 0)], rn, PBR.inox);
  kit.flange(rn, PBR.inox, orient(v3(-0.62, 0.22, 0), X));
  kit.pipe([v3(0.36, yc + 0.06, 0), v3(0.36, 0.8, 0), v3(0.62, 0.8, 0)], rn, PBR.inox);
  kit.flange(rn, PBR.inox, orient(v3(0.62, 0.8, 0), NX));
  for (const x of [-0.2, 0.2]) {
    kit.leg(x, 0, yc - rc - 0.015, 0.05);
    kit.box(0.07, 0.015, 0.16, PBR.steelGrey, orient(v3(x, yc - rc - 0.015, 0)));
    kit.ring(rc + 0.004, 0.007, PBR.steelGrey, orient(v3(x, yc, 0), X));
  }
  if (kit.high) kit.box(0.12, 0.05, 0.002, PBR.white, orient(v3(-0.05, yc - 0.025, rc * 0.995))); // biển tên

  kit.part("den-uv");
  kit.cyl(0.07, 0.06, PBR.black, orient(v3(0.5 + t, yc, 0), X));
  for (const z of [-0.03, 0.03]) {
    kit.cyl(0.012, 0.03, PBR.brass, orient(v3(0.56 + t, yc, z), X), 0.012, false, 8);
    kit.cyl(0.016, 0.96, PBR.clear, orient(v3(-0.47, yc, z), X), 0.016, false, 12);
    kit.cyl(0.009, 0.92, glow, orient(v3(-0.45, yc, z), X), 0.009, false, 8);
  }
  kit.pipe([v3(0.59 + t, yc, 0), v3(0.72, yc, 0), v3(0.72, 0.62, -0.32), v3(0.17, 0.62, -0.32)], 0.009, PBR.black);
  // Kính quan sát phát sáng khi đèn bật.
  kit.cyl(0.03, 0.04, PBR.inox, orient(v3(0, yc, rc - 0.005), Z));
  kit.cyl(0.022, 0.004, glow, orient(v3(0, yc, rc + 0.035), Z));

  kit.part("cam-bien");
  kit.cyl(0.014, 0.05, PBR.inox, orient(v3(0.12, yc + rc - 0.005, 0)), 0.014, false, 8);
  kit.cyl(0.02, 0.03, PBR.black, orient(v3(0.12, yc + rc + 0.045, 0)), 0.02, false, 8);
  kit.pipe([v3(0.12, yc + rc + 0.075, 0), v3(0.12, 0.72, 0), v3(0.12, 0.72, -0.25)], 0.005, PBR.black);

  kit.part("tu-dien");
  kit.leg(0, -0.32, 0.5, 0.05);
  kit.cabinet(0.34, 0.44, 0.14, move(0, 0.5, -0.32));
  kit.cyl(0.012, 0.006, lampOn, orient(v3(-0.1, 0.66, -0.243), Z), 0.012, false, 8);
  kit.cyl(0.012, 0.006, PBR.red, orient(v3(-0.06, 0.66, -0.243), Z), 0.012, false, 8);

  const root = kit.build();
  return finish(
    root,
    [port("vao", "nuoc-vao", v3(-0.62, 0.22, 0), NX, 65), port("ra", "nuoc-ra", v3(0.62, 0.8, 0), X, 65)],
    (time, on) => {
      glow.emissiveIntensity = on ? 1.6 + Math.sin(time * 8) * 0.25 : 0;
      lampOn.emissiveIntensity = on ? 1.4 : 0;
    },
  );
}

/** Côn ôxy (Speece): nước vào đỉnh côn, ra ở đáy; ôxy từ bình qua bộ giảm áp và lưu lượng kế. */
export function oxygenCone(detail: Detail = "high"): StandardEquipment {
  const kit = new Kit(detail);
  const rIn = pipeRadius(100);
  const rOut = pipeRadius(80);
  const coneAt = (y: number) => 0.36 - ((y - 0.5) / 1.25) * 0.29; // bán kính côn theo cao độ

  kit.part("con-tiep-xuc");
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI;
    kit.leg(Math.cos(a) * 0.33, Math.sin(a) * 0.33, 0.52, 0.045);
  }
  kit.dome(0.36, 0.14, PBR.inox, orient(v3(0, 0.5, 0), NY));
  kit.cyl(0.36, 1.25, PBR.inox, move(0, 0.5, 0), 0.07);
  kit.ring(0.362, 0.012, PBR.inox, move(0, 0.5, 0));
  kit.nozzle(0.07, 0.1, PBR.inox, move(0, 1.75, 0));
  const rdr = pipeRadius(20);
  kit.cyl(rdr, 0.1, PBR.inox, orient(v3(0, 0.37, 0), NY));
  kit.ballValve(rdr, orient(v3(0, 0.3, 0), NY), PBR.brass);
  if (kit.high) kit.box(0.14, 0.07, 0.002, PBR.white, orient(v3(0, 0.95, coneAt(0.985) + 0.002), Y)); // biển tên

  kit.part("cua-vao");
  kit.flange(0.07, PBR.inox, move(0, 1.85, 0));
  kit.pipe([v3(0, 1.85, 0), v3(0, 2.02, 0), v3(-0.5, 2.02, 0)], rIn, PBR.inox);
  kit.flange(rIn, PBR.inox, orient(v3(-0.5, 2.02, 0), X));

  kit.part("duong-ra");
  kit.nozzle(rOut, 0.55 - coneAt(0.62) + 0.03, PBR.inox, orient(v3(coneAt(0.62) - 0.03, 0.62, 0), X));

  kit.part("dong-ho");
  kit.gauge(orient(v3(-0.2, 2.02 + rIn, 0)));

  kit.part("duong-oxy");
  kit.cyl(0.012, 0.07, PBR.brass, orient(v3(0, 1.5, coneAt(1.5) - 0.01), Z), 0.012, false, 8);
  kit.pipe([v3(0, 1.5, coneAt(1.5) + 0.06), v3(0, 1.5, 0.46), v3(0, 1.24, 0.46)], 0.007, PBR.oxygenLine);
  kit.leg(0, 0.42, 1.3, 0.03);
  kit.box(0.14, 0.36, 0.008, PBR.steelGrey, orient(v3(0, 0.92, 0.44)));
  kit.rotameter(move(0, 1.04, 0.46), 0.2);
  kit.cyl(0.014, 0.04, PBR.brass, move(0, 1.0, 0.46), 0.014, false, 8); // van kim
  kit.pipe(
    [v3(0, 1.0, 0.46), v3(0, 0.85, 0.46), v3(-0.25, 0.85, 0.5), v3(-0.25, 1.44, 0.5), v3(-0.375, 1.44, 0.5)],
    0.007,
    PBR.oxygenLine,
  );

  kit.part("binh-oxy");
  const bx = -0.5;
  const bz = 0.5;
  kit.cyl(0.118, 0.03, PBR.black, move(bx, 0, bz));
  kit.cyl(0.115, 1.2, PBR.oxygen, move(bx, 0.03, bz));
  kit.dome(0.115, 0.12, PBR.white, move(bx, 1.23, bz));
  kit.cyl(0.03, 0.06, PBR.brass, move(bx, 1.34, bz), 0.03, false, 12);
  kit.box(0.05, 0.08, 0.05, PBR.brass, move(bx, 1.4, bz));
  kit.ring(0.035, 0.007, PBR.black, move(bx, 1.5, bz));
  kit.cyl(0.006, 0.03, PBR.brass, move(bx, 1.47, bz), 0.006, false, 6);
  kit.cyl(0.026, 0.1, PBR.brass, orient(v3(bx + 0.025, 1.44, bz), X), 0.026, false, 12);
  kit.gauge(orient(v3(bx + 0.055, 1.46, bz)), 0.024);
  kit.gauge(orient(v3(bx + 0.105, 1.46, bz)), 0.024);
  kit.leg(bx, bz + 0.16, 1.1, 0.035);
  kit.ring(0.122, 0.006, PBR.inox, move(bx, 0.9, bz));
  kit.box(0.035, 0.02, 0.06, PBR.steelGrey, orient(v3(bx, 0.89, bz + 0.13)));

  const root = kit.build();
  const air = bubbles(detail === "high" ? 60 : 30, 0.14, 1.0, 0.14, 0.55);
  attach(root, "con-tiep-xuc", air.pts);

  return finish(
    root,
    [
      port("vao", "nuoc-vao", v3(-0.5, 2.02, 0), NX, 100),
      port("ra", "nuoc-ra", v3(0.55, 0.62, 0), X, 80),
      port("oxy", "oxy", v3(-0.375, 1.44, 0.5), X, 8),
    ],
    (time, on) => air.tick(time, on),
  );
}
