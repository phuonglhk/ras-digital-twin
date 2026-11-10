/*
 * Thiết bị xử lý và bể nuôi dựng theo chuẩn mô hình 3D (docs/chuan-mo-hinh-3d.md), đợt 2:
 * lọc trống, MBBR, tháp khử CO₂, máy thổi khí, bể khử nitrat, bể tròn.
 * Kích thước là cỡ điển hình, chỉ để minh hoạ.
 */
import * as THREE from "three";

import { finish, move, NX, NY, port, X, Y, Z, type StandardEquipment } from "./devices";
import { PBR, waterMaterial } from "./materials";
import { attach, bubbles, Kit, orient, pipeRadius, v3, type Detail } from "./parts";

/** Lọc trống: trống lưới quay trong bể inox, dàn phun rửa ngược, máng gom cặn, động cơ truyền xích. */
export function drumFilter(detail: Detail = "high"): StandardEquipment {
  const kit = new Kit(detail);
  const L = 1.3;
  const W = 0.9;
  const y0 = 0.15; // đáy bể
  const H = 0.65; // chiều cao thành bể
  const ya = 0.75; // cao độ trục trống
  const rd = 0.36; // bán kính trống
  const rn = pipeRadius(150);

  kit.part("be-vo");
  for (const x of [-L / 2 + 0.05, L / 2 - 0.05]) for (const z of [-W / 2 + 0.05, W / 2 - 0.05]) kit.leg(x, z, y0, 0.05);
  kit.openTank(L, H, W, 0.012, PBR.inox, move(0, y0, 0));
  // Con lăn đỡ vành trống.
  for (const x of [-0.5, 0.5])
    for (const z of [-0.2, 0.2]) kit.cyl(0.04, 0.04, PBR.black, orient(v3(x - 0.02, ya - rd - 0.03, z), X));
  kit.cyl(0.012, 0.3, PBR.inox, move(-0.55, 0.6, -0.3), 0.012, false, 8); // cảm biến mức
  kit.cyl(0.025, 0.05, PBR.black, move(-0.55, 0.9, -0.3), 0.025, false, 8);

  kit.part("cua-vao");
  kit.nozzle(rn, 0.17, PBR.inox, orient(v3(-L / 2 + 0.01, 0.6, 0), NX));
  kit.part("cua-ra");
  kit.nozzle(rn, 0.21, PBR.inox, orient(v3(L / 2 - 0.01, 0.38, 0), X));

  kit.part("mang-can");
  kit.box(1.25, 0.012, 0.16, PBR.pp, orient(v3(0.1, 0.9, 0)));
  for (const z of [-0.08, 0.08]) kit.box(1.25, 0.05, 0.01, PBR.pp, orient(v3(0.1, 0.9, z)));
  const rs = pipeRadius(50);
  kit.pipe([v3(0.7, 0.9, 0), v3(0.7, 0.9, -0.36), v3(0.7, 0.2, -0.36)], rs, PBR.pvc);

  kit.part("phun-rua");
  const zs = 0.14;
  kit.pipe([v3(-0.6, 0.8, zs), v3(-0.6, 1.2, zs), v3(0.6, 1.2, zs), v3(0.6, 0.8, zs)], 0.014, PBR.inox);
  const jets = kit.high ? 9 : 5;
  for (let i = 0; i < jets; i++)
    kit.cyl(0.004, 0.03, PBR.brass, move(-0.44 + (0.88 * i) / (jets - 1), 1.16, zs), 0.012, false, 8);
  kit.box(0.24, 0.012, 0.16, PBR.steelGrey, orient(v3(-0.77, 0.3, 0.3)));
  kit.cyl(0.055, 0.05, PBR.black, orient(v3(-0.66, 0.37, 0.3), NX));
  kit.motor(0.05, 0.17, orient(v3(-0.71, 0.37, 0.3), NX, Y));
  kit.pipe([v3(-0.685, 0.42, 0.3), v3(-0.685, 1.0, 0.3), v3(-0.6, 1.0, zs)], 0.012, PBR.pvc);

  kit.part("dong-co");
  kit.box(0.3, 0.012, 0.2, PBR.steelGrey, orient(v3(0.8, 0.265, 0.3)));
  kit.box(0.07, 0.13, 0.13, PBR.castIron, orient(v3(0.69, 0.28, 0.3)));
  kit.motor(0.065, 0.22, orient(v3(0.72, 0.345, 0.3), X, Y));
  const chain = v3(0, ya - 0.345, -0.3);
  const chainLength = chain.length();
  chain.normalize();
  kit.box(
    0.15,
    chainLength + 0.14,
    0.025,
    PBR.steelYellow,
    orient(v3(0.672, 0.345, 0.3).addScaledVector(chain, -0.07), chain, X),
  );

  kit.part("tu-dien");
  kit.cabinet(0.26, 0.32, 0.1, move(-0.25, 0.42, W / 2 + 0.05));

  const root = kit.build();

  const water = new THREE.Mesh(new THREE.BoxGeometry(L - 0.03, 0.42, W - 0.03), waterMaterial());
  water.position.set(0, y0 + 0.012 + 0.21, 0);
  attach(root, "be-vo", water);

  // Trống quay: lưới, vành, thanh dọc và vành răng truyền động.
  const drum = new Kit(detail);
  drum.cyl(rd, 1.0, PBR.mesh, orient(v3(-0.5, 0, 0), X), rd, true);
  for (const x of [-0.5, 0, 0.5]) drum.ring(rd, 0.015, PBR.inox, orient(v3(x, 0, 0), X));
  const bars = kit.high ? 12 : 6;
  for (let i = 0; i < bars; i++) {
    const a = (i / bars) * Math.PI * 2;
    drum.box(0.02, 1.0, 0.02, PBR.inox, orient(v3(-0.5, Math.cos(a) * rd, Math.sin(a) * rd), X));
  }
  drum.ring(rd - 0.05, 0.018, PBR.castIron, orient(v3(0.535, 0, 0), X));
  const spin = drum.build();
  spin.position.set(0, ya, 0);
  attach(root, "luoi-loc", spin);

  const spray = bubbles(detail === "high" ? 60 : 30, 0.9, -0.14, 0.03, 1.16);
  spray.pts.position.z = zs;
  attach(root, "phun-rua", spray.pts);

  return finish(
    root,
    [
      port("vao", "nuoc-vao", v3(-L / 2 + 0.01 - 0.17, 0.6, 0), NX, 150),
      port("ra", "nuoc-ra", v3(L / 2 - 0.01 + 0.21, 0.38, 0), X, 150),
      port("xa-can", "bun", v3(0.7, 0.2, -0.36), NY, 50),
    ],
    (t, on) => {
      spin.rotation.x = on ? t * 0.8 : 0;
      spray.tick(t, on);
    },
  );
}

/** Bể MBBR: bể chữ nhật có kính quan sát, giá thể trôi, lưới chắn ở cửa ra, dàn sục khí đáy. */
export function mbbr(mediaVolume = 0.5, detail: Detail = "high"): StandardEquipment {
  const kit = new Kit(detail);
  const reactor = Math.max(0.3, mediaVolume / 0.5);
  const h = 1.2;
  const w = Math.sqrt((reactor / h) * 1.4);
  const d = reactor / h / w;
  const y0 = 0.06;
  const rn = pipeRadius(100);
  const yIn = y0 + h * 0.84;
  const yOut = y0 + h * 0.72;

  kit.part("be-phan-ung");
  kit.skid(w + 0.1, d + 0.1, y0, PBR.steelGrey);
  kit.openTank(w, h, d, 0.015, PBR.pp, move(0, y0, 0), PBR.clear);

  kit.part("cua-vao");
  kit.nozzle(rn, 0.16, PBR.pvc, orient(v3(-w / 2 + 0.01, yIn, 0), NX));
  kit.part("cua-ra");
  kit.nozzle(rn, 0.16, PBR.pvc, orient(v3(w / 2 - 0.01, yOut, 0), X));

  kit.part("luoi-chan");
  kit.cyl(0.09, 0.3, PBR.mesh, orient(v3(w / 2 - 0.31, yOut, 0), X), 0.09, true);
  kit.cyl(0.092, 0.01, PBR.inox, orient(v3(w / 2 - 0.32, yOut, 0), X));

  kit.part("ong-khi");
  const ra = pipeRadius(40);
  const rdrop = pipeRadius(25);
  const yh = y0 + h + 0.12;
  const zb = -d / 2 - 0.07;
  kit.pipe([v3(-w / 2 - 0.16, yh, zb), v3(w / 2 - 0.08, yh, zb)], ra, PBR.pvc);
  kit.cyl(ra * 1.3, 0.03, PBR.pvc, orient(v3(w / 2 - 0.08, yh, zb), X), ra * 1.3, false, 8);
  kit.ballValve(ra, orient(v3(-w / 2 - 0.05, yh, zb), X, Y));
  kit.unionStub(ra, 0.04, PBR.pvc, orient(v3(-w / 2 - 0.12, yh, zb), NX));
  const drops = Math.max(2, Math.round(w / 0.4));
  for (let i = 0; i < drops; i++) {
    const x = -w * 0.36 + (w * 0.72 * i) / (drops - 1);
    const zi = -d / 2 + 0.07;
    kit.pipe([v3(x, yh, zb), v3(x, yh, zi), v3(x, y0 + 0.09, zi), v3(x, y0 + 0.09, d / 2 - 0.08)], rdrop, PBR.pvc);
  }

  const root = kit.build();

  const water = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, h * 0.84, d - 0.04), waterMaterial());
  water.name = "nuoc";
  water.position.set(0, y0 + 0.015 + (h * 0.84) / 2, 0);
  attach(root, "be-phan-ung", water);

  // Giá thể dạng bánh xe (K1), phóng to để nhìn được.
  const wheel = new Kit(detail);
  wheel.cyl(0.03, 0.018, PBR.media, undefined, 0.03, true, detail === "high" ? 10 : 6);
  wheel.box(0.058, 0.018, 0.004, PBR.media);
  wheel.box(0.004, 0.018, 0.058, PBR.media);
  const wheelMesh = wheel.build().getObjectByProperty("type", "Mesh") as THREE.Mesh;
  const count = detail === "high" ? 240 : 70;
  const chips = new THREE.InstancedMesh(wheelMesh.geometry, PBR.media, count);
  chips.name = "gia-the";
  const seeds = Array.from({ length: count }, (_, i) => {
    const rnd = (k: number) => {
      const s = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
      return s - Math.floor(s);
    };
    return [rnd(1) * Math.PI * 2, 0.08 + rnd(2) * 0.84, 0.25 + rnd(3) * 0.7, rnd(4)];
  });
  attach(root, "gia-the", chips);
  const air = bubbles(detail === "high" ? 140 : 50, w * 0.8, h * 0.72, d * 0.75, y0 + 0.1);
  attach(root, "ong-khi", air.pts);
  const m4 = new THREE.Matrix4();
  const tilt = new THREE.Matrix4();
  const animate = (time: number, on: boolean) => {
    seeds.forEach(([a, y, r, ph], i) => {
      const ang = a + (on ? time * (0.5 + ph) : 0);
      tilt.makeRotationX(ang * 2 + ph * 6);
      m4.makeRotationY(ang * 3)
        .multiply(tilt)
        .setPosition(
          Math.cos(ang) * r * (w / 2 - 0.08),
          y0 + 0.06 + y * h * 0.74 + (on ? Math.sin(time * 2 + ph * 6) * 0.03 : 0),
          Math.sin(ang) * r * (d / 2 - 0.08),
        );
      chips.setMatrixAt(i, m4);
    });
    chips.instanceMatrix.needsUpdate = true;
    chips.computeBoundingBox();
    air.tick(time, on);
  };
  animate(0, false);

  return finish(
    root,
    [
      port("vao", "nuoc-vao", v3(-w / 2 + 0.01 - 0.16, yIn, 0), NX, 100),
      port("ra", "nuoc-ra", v3(w / 2 - 0.01 + 0.16, yOut, 0), X, 100),
      port("khi", "khi", v3(-w / 2 - 0.16, yh, zb), NX, 40),
    ],
    animate,
    water,
  );
}

/** Tháp khử CO₂: nước rơi qua lớp đệm ngược chiều gió của quạt ly tâm, hộc chứa ở đáy. */
export function degasser(detail: Detail = "high"): StandardEquipment {
  const kit = new Kit(detail);
  const rt = 0.36; // bán kính tháp
  const ys = 0.45; // mặt trên hộc chứa
  const rn = pipeRadius(100);

  kit.part("be-day");
  kit.box(1.0, ys, 1.3, PBR.pp, move(0, 0, 0.2));
  kit.box(1.04, 0.03, 1.34, PBR.pp, move(0, ys - 0.03, 0.2));
  kit.nozzle(rn, 0.16, PBR.pvc, orient(v3(0.49, 0.2, 0), X));
  if (kit.high) {
    kit.cyl(0.012, 0.3, PBR.clear, move(0.3, 0.08, 0.86), 0.012, false, 8); // ống thuỷ
    kit.box(0.16, 0.08, 0.002, PBR.white, orient(v3(-0.25, 0.25, 0.851)));
  }

  kit.part("than-thap");
  kit.cyl(0.41, 0.02, PBR.pvc, move(0, ys, 0));
  kit.cyl(rt, 0.43, PBR.frp, move(0, ys + 0.02, 0), rt, true);
  kit.cyl(rt, 0.45, PBR.frp, move(0, 1.75, 0), rt, true);
  kit.cyl(rt, 0.2, PBR.frp, move(0, 2.2, 0), 0.15, true);
  kit.cyl(0.15, 0.12, PBR.pvc, move(0, 2.4, 0), 0.15, true);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    kit.cyl(0.008, 0.07, PBR.inox, move(Math.cos(a) * 0.14, 2.52, Math.sin(a) * 0.14), 0.008, false, 6);
  }
  kit.cyl(0.21, 0.02, PBR.pvc, move(0, 2.59, 0), 0.18); // nón chắn giọt
  kit.nozzle(rn, 0.17, PBR.pvc, orient(v3(-rt + 0.01, 2.0, 0), NX));

  kit.part("lop-dem");
  kit.cyl(rt, 0.85, PBR.clear, move(0, 0.9, 0), rt, true);
  for (const y of [0.9, 1.75]) kit.ring(rt + 0.004, 0.014, PBR.pvc, move(0, y, 0));
  for (let i = 0; i < 4; i++) kit.cyl(rt - 0.02, 0.17, PBR.packing, move(0, 0.94 + i * 0.2, 0));

  kit.part("quat");
  const yf = 0.67;
  const zf = 0.6;
  kit.box(0.24, 0.2, 0.32, PBR.steelBlue, move(0, yf - 0.1, 0.44));
  kit.cyl(0.2, 0.14, PBR.steelBlue, orient(v3(-0.07, yf, zf), X));
  kit.ring(0.1, 0.012, PBR.black, orient(v3(-0.072, yf, zf), X));
  kit.cyl(0.1, 0.004, PBR.black, orient(v3(-0.066, yf, zf), X));
  kit.box(0.22, 0.12, 0.22, PBR.steelGrey, move(0.19, ys, zf));
  kit.motor(0.07, 0.22, orient(v3(0.07, yf, zf), X, Y));

  const root = kit.build();

  const fan = new Kit(detail);
  fan.cyl(0.03, 0.02, PBR.inox, orient(v3(0, 0, 0), NX));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    fan.box(0.012, 0.085, 0.03, PBR.inox, orient(v3(-0.012, 0, 0), v3(0, Math.cos(a), Math.sin(a)), X));
  }
  const rotor = fan.build();
  rotor.position.set(-0.07, yf, zf);
  attach(root, "quat", rotor);
  const rain = bubbles(detail === "high" ? 70 : 30, 0.46, -0.8, 0.46, 1.72);
  attach(root, "lop-dem", rain.pts);

  return finish(
    root,
    [
      port("vao", "nuoc-vao", v3(-rt + 0.01 - 0.17, 2.0, 0), NX, 100),
      port("ra", "nuoc-ra", v3(0.49 + 0.16, 0.2, 0), X, 100),
    ],
    (t, on) => {
      rotor.rotation.x = on ? t * 10 : 0;
      rain.tick(t, on);
    },
  );
}

/** Máy thổi khí con sò (side channel): buồng nén vòng, lọc gió, giảm thanh, van an toàn. */
export function blower(detail: Detail = "high"): StandardEquipment {
  const kit = new Kit(detail);
  const yc = 0.33;
  const xh = -0.12; // tâm buồng nén
  const rp = pipeRadius(50);

  kit.part("be");
  kit.skid(0.72, 0.4, 0.05, PBR.steelGrey, 0.08);
  for (const x of [-0.2, 0.36]) for (const z of [-0.16, 0.16]) kit.cyl(0.03, 0.015, PBR.black, move(x, 0.05, z));

  kit.part("buong-nen");
  kit.cyl(0.2, 0.1, PBR.castIron, orient(v3(xh - 0.05, yc, 0), X));
  for (const x of [xh - 0.05, xh + 0.05]) kit.ring(0.15, 0.06, PBR.castIron, orient(v3(x, yc, 0), X));
  if (kit.high)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const radial = v3(0, Math.cos(a), Math.sin(a));
      kit.box(0.012, 0.03, 0.2, PBR.castIron, orient(v3(xh, yc, 0).addScaledVector(radial, 0.185), radial, X));
    }
  kit.box(0.16, 0.11, 0.3, PBR.castIron, move(xh, 0.065, 0));
  kit.box(0.1, 0.07, 0.26, PBR.castIron, move(xh, yc + 0.18, 0));
  // Đường hút: giảm thanh và lọc gió.
  kit.cyl(0.05, 0.3, PBR.black, move(xh, yc + 0.25, -0.07));
  kit.cyl(0.085, 0.1, PBR.pp, move(xh, yc + 0.55, -0.07));
  kit.cyl(0.09, 0.015, PBR.black, move(xh, yc + 0.65, -0.07));
  // Đường đẩy: giảm thanh.
  kit.cyl(0.05, 0.22, PBR.black, move(xh, yc + 0.25, 0.07));

  kit.part("duong-khi-ra");
  const yo = yc + 0.62;
  kit.pipe([v3(xh, yc + 0.47, 0.07), v3(xh, yo, 0.07), v3(0.44, yo, 0.07)], rp, PBR.inox);
  kit.cyl(rp + 0.006, 0.12, PBR.black, orient(v3(0.06, yo, 0.07), X)); // ống mềm chống rung
  kit.flange(rp, PBR.inox, orient(v3(0.44, yo, 0.07), NX));
  kit.cyl(0.018, 0.06, PBR.brass, move(0.26, yo + rp - 0.005, 0.07), 0.018, false, 8); // van an toàn
  kit.cyl(0.022, 0.015, PBR.red, move(0.26, yo + rp + 0.055, 0.07), 0.022, false, 8);
  kit.gauge(orient(v3(0.34, yo + rp - 0.005, 0.07)));

  kit.part("dong-co");
  kit.box(0.3, 0.135, 0.24, PBR.steelGrey, move(0.12, 0.05, 0));
  kit.motor(0.11, 0.34, orient(v3(xh + 0.05, yc, 0), X, Y));

  const root = kit.build();
  const hub = new Kit(detail);
  hub.cyl(0.05, 0.015, PBR.inox, orient(v3(0, 0, 0), NX));
  hub.box(0.016, 0.08, 0.008, PBR.black, orient(v3(-0.016, -0.04, 0)));
  const rotor = hub.build();
  rotor.position.set(xh - 0.11, yc, 0);
  attach(root, "buong-nen", rotor);

  return finish(
    root,
    [port("vao-khi", "khi", v3(xh, yc + 0.665, -0.07), Y, 50), port("ra-khi", "khi", v3(0.44, yo, 0.07), X, 50)],
    (t, on) => {
      rotor.rotation.x = on ? t * 14 : 0;
    },
    undefined,
    ["vao-khi", "ra-khi"],
  );
}

/** Bể khử nitrat: bể kín thiếu khí có máy khuấy, bơm định lượng nguồn cacbon, đầu dò ORP. */
export function denitrification(detail: Detail = "high"): StandardEquipment {
  const kit = new Kit(detail);
  const r = 0.45;
  const yb = 0.12; // đáy bể
  const hb = 1.2;
  const rn = pipeRadius(65);
  const domeAt = (rr: number) => yb + hb + 0.12 * Math.sqrt(Math.max(0, 1 - (rr / r) ** 2));

  kit.part("be-phan-ung");
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    kit.leg(Math.cos(a) * (r - 0.06), Math.sin(a) * (r - 0.06), yb, 0.05);
  }
  kit.cyl(r, 0.015, PBR.pp, move(0, yb, 0));
  kit.cyl(r, hb, PBR.translucent, move(0, yb, 0), r, true);
  kit.dome(r, 0.12, PBR.translucent, move(0, yb + hb, 0));
  for (const y of [0.5, 0.92]) kit.ring(r + 0.004, 0.012, PBR.pvc, move(0, y, 0));
  kit.cyl(0.13, 0.05, PBR.black, move(-0.2, domeAt(0.2) - 0.02, 0)); // cửa thăm
  const rv = pipeRadius(25);
  kit.pipe(
    [v3(0.25, domeAt(0.3) - 0.02, -0.15), v3(0.25, 1.62, -0.15), v3(0.34, 1.62, -0.15), v3(0.34, 1.54, -0.15)],
    rv,
    PBR.pvc,
  ); // ống thông hơi
  kit.cyl(0.012, 0.12, PBR.inox, move(0.2, domeAt(0.25) - 0.03, 0.15), 0.012, false, 8); // đầu dò ORP
  kit.cyl(0.02, 0.04, PBR.black, move(0.2, domeAt(0.25) + 0.09, 0.15), 0.02, false, 8);

  kit.part("cua-vao");
  kit.nozzle(rn, 0.15, PBR.pvc, orient(v3(-r + 0.01, 0.3, 0), NX));
  kit.part("cua-ra");
  kit.nozzle(rn, 0.15, PBR.pvc, orient(v3(r - 0.01, 1.1, 0), X));

  kit.part("may-khuay");
  const yt = yb + hb + 0.12;
  kit.box(0.2, 0.015, 0.2, PBR.steelGrey, move(0, yt - 0.005, 0));
  kit.cyl(0.06, 0.06, PBR.castIron, move(0, yt + 0.01, 0));
  kit.motor(0.07, 0.24, orient(v3(0, yt + 0.07, 0), Y), false);

  kit.part("cap-cacbon");
  const dx = -0.25;
  const dz = 0.72;
  kit.cyl(0.14, 0.42, PBR.steelBlue, move(dx, 0, dz));
  for (const y of [0.1, 0.3]) kit.ring(0.142, 0.008, PBR.steelBlue, move(dx, y, dz));
  kit.cyl(0.03, 0.02, PBR.black, move(dx, 0.42, dz), 0.03, false, 8);
  const px = 0.08;
  const pz = 0.76;
  kit.leg(px, pz - 0.03, 0.95, 0.035);
  kit.box(0.2, 0.26, 0.01, PBR.steelGrey, orient(v3(px, 0.68, pz)));
  kit.box(0.1, 0.13, 0.09, PBR.black, orient(v3(px, 0.73, pz + 0.05)));
  kit.cyl(0.032, 0.04, PBR.pp, orient(v3(px, 0.795, pz + 0.095), Z), 0.032, false, 12);
  kit.pipe(
    [v3(px, 0.765, pz + 0.12), v3(px, 0.55, pz + 0.12), v3(dx, 0.55, dz), v3(dx, 0.43, dz)],
    0.006,
    PBR.chemLine,
  );
  kit.pipe(
    [v3(px, 0.825, pz + 0.12), v3(px, 1.56, pz + 0.12), v3(px, 1.56, 0.3), v3(px, domeAt(0.31) - 0.01, 0.3)],
    0.006,
    PBR.chemLine,
  );

  const root = kit.build();

  const water = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.012, r - 0.012, 1.02, kit.seg), waterMaterial());
  water.name = "nuoc";
  water.position.set(0, yb + 0.02 + 0.51, 0);
  attach(root, "be-phan-ung", water);

  const mixer = new Kit(detail);
  mixer.cyl(0.012, 1.0, PBR.inox, move(0, 0, 0), 0.012, false, 8);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const blade = new THREE.Matrix4()
      .makeRotationY(a)
      .multiply(new THREE.Matrix4().makeTranslation(0.14, 0.02, 0))
      .multiply(new THREE.Matrix4().makeRotationX(0.5));
    mixer.box(0.24, 0.008, 0.07, PBR.inox, blade);
  }
  const rotor = mixer.build();
  rotor.position.set(0, 0.42, 0);
  attach(root, "may-khuay", rotor);

  return finish(
    root,
    [
      port("vao", "nuoc-vao", v3(-r + 0.01 - 0.15, 0.3, 0), NX, 65),
      port("ra", "nuoc-ra", v3(r - 0.01 + 0.15, 1.1, 0), X, 65),
      port("cacbon", "hoa-chat", v3(px, domeAt(0.31) - 0.01, 0.3), NY, 6),
    ],
    (t, on) => {
      rotor.rotation.y = on ? t * 2 : 0;
    },
    water,
  );
}

/** Bể tròn FRP cho cá, tôm: cấp nước tiếp tuyến, thoát đáy giữa bể, ống đứng ngoài chỉnh mực nước. */
export function roundTank(volume = 4, detail: Detail = "high"): StandardEquipment {
  const kit = new Kit(detail);
  const h = volume > 8 ? 1.4 : 1.0;
  const r = Math.sqrt(volume / (Math.PI * h * 0.85));
  const yb = 0.1;
  const ro = pipeRadius(100);
  const ri = pipeRadius(50);
  const yOut = yb + h * 0.78;
  const yIn = yb + h + 0.3;
  const zi = r * 0.35;

  kit.part("thanh-be");
  const legs = Math.max(6, Math.round(r * 5));
  for (let i = 0; i < legs; i++) {
    const a = (i / legs) * Math.PI * 2;
    kit.box(0.1, yb, 0.1, PBR.pvc, move(Math.cos(a) * r * 0.85, 0, Math.sin(a) * r * 0.85));
  }
  kit.box(0.14, yb, 0.14, PBR.pvc, move(0, 0, 0));
  kit.cyl(r, 0.02, PBR.frp, move(0, yb, 0));
  kit.cyl(r, h, PBR.frp, move(0, yb, 0), r, true);
  kit.ring(r, 0.03, PBR.frp, move(0, yb + h, 0));
  kit.ring(r + 0.005, 0.018, PBR.frp, move(0, yb + h * 0.5, 0));

  kit.part("ong-dung");
  kit.cyl(ro, h * 0.5, PBR.pvc, move(0, yb + 0.02, 0));
  kit.cyl(ro + 0.02, h * 0.36, PBR.mesh, move(0, yb + h * 0.5, 0), ro + 0.02, true);
  kit.cyl(ro + 0.022, 0.012, PBR.pvc, move(0, yb + h * 0.86, 0));
  kit.pipe([v3(r - 0.02, 0.24, 0), v3(r + 0.22, 0.24, 0), v3(r + 0.22, yOut, 0), v3(r + 0.46, yOut, 0)], ro, PBR.pvc);
  kit.cyl(ro * 1.3, 0.05, PBR.pvc, orient(v3(r + 0.41, yOut, 0), X), ro * 1.3, false, 8);

  kit.part("cua-vao");
  kit.pipe([v3(-r - 0.42, yIn, zi), v3(-r * 0.72, yIn, zi), v3(-r * 0.72, yb + h - 0.05, zi)], ri, PBR.pvc);
  kit.ballValve(ri, orient(v3(-r - 0.16, yIn, zi), X, Y));
  kit.cyl(ri * 1.5, ri * 1.1, PBR.pvc, orient(v3(-r - 0.42, yIn, zi), X), ri * 1.5, false, 8);

  const root = kit.build();

  const depth = h * 0.85;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.015, r - 0.015, depth, kit.seg), waterMaterial());
  water.name = "nuoc";
  const yw = yb + 0.02 + depth / 2;
  water.position.set(0, yw, 0);
  root.add(water);

  return finish(
    root,
    [port("vao", "nuoc-vao", v3(-r - 0.42, yIn, zi), NX, 50), port("ra", "nuoc-ra", v3(r + 0.46, yOut, 0), X, 100)],
    (t, on) => {
      water.position.y = yw + (on ? 0.012 * Math.sin(t * 2) : 0);
    },
    water,
  );
}
