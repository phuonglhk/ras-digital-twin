/*
 * Thư viện chi tiết dùng chung để dựng thiết bị (xem docs/chuan-mo-hinh-3d.md).
 * Mọi chi tiết dựng dọc trục +Y cục bộ từ gốc, rồi đặt vào thiết bị bằng ma trận `at` (xem orient()).
 * Kit gom hình học theo (bộ phận, vật liệu) và gộp lại khi build() để giữ số draw call thấp.
 * Đơn vị: mét.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { PBR } from "./materials";

export type Detail = "high" | "low";
export type PortKind = "nuoc-vao" | "nuoc-ra" | "khi" | "oxy" | "bun" | "hoa-chat";

export interface Port {
  name: string;
  kind: PortKind;
  position: THREE.Vector3;
  direction: THREE.Vector3; // hướng ra ngoài thiết bị
  dn: number; // đường kính danh nghĩa, mm
}

const UP = new THREE.Vector3(0, 1, 0);
export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/**
 * Ma trận đặt chi tiết: +Y cục bộ trùng `dir`, gốc tại `pos`.
 * Có `up` thì +Z cục bộ hướng về phía `up` (dùng cho chi tiết có mặt trên như hộp đấu dây).
 */
export function orient(pos: THREE.Vector3Like, dir: THREE.Vector3Like = UP, up?: THREE.Vector3Like) {
  const y = new THREE.Vector3().copy(dir).normalize();
  const p = new THREE.Vector3().copy(pos);
  if (!up) {
    const q = new THREE.Quaternion().setFromUnitVectors(UP, y);
    return new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
  }
  const z = new THREE.Vector3().copy(up);
  z.addScaledVector(y, -z.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(p);
}

/** Bán kính ngoài ống uPVC theo DN (mm), gần đúng. */
export const pipeRadius = (dn: number) => (dn * 1.12 + 4) / 2000;

interface Item {
  part: string;
  material: THREE.Material;
  geometry: THREE.BufferGeometry;
}

export class Kit {
  private items: Item[] = [];
  private current = "than";
  /** Số cạnh của mặt trụ. */
  readonly seg: number;
  constructor(readonly detail: Detail) {
    this.seg = detail === "high" ? 32 : 16;
  }
  get high() {
    return this.detail === "high";
  }
  /** Chọn bộ phận nhận các chi tiết tiếp theo. */
  part(name: string) {
    this.current = name;
    return this;
  }
  add(geometry: THREE.BufferGeometry, material: THREE.Material, at?: THREE.Matrix4) {
    if (at) geometry.applyMatrix4(at);
    this.items.push({ part: this.current, material, geometry });
  }

  /* ---------------- hình cơ bản ---------------- */

  /** Trụ/côn đứng trên gốc, cao h. r2 là bán kính đỉnh. */
  cyl(r: number, h: number, material: THREE.Material, at?: THREE.Matrix4, r2 = r, open = false, seg = this.seg) {
    const g = new THREE.CylinderGeometry(r2, r, h, seg, 1, open);
    g.translate(0, h / 2, 0);
    this.add(g, material, at);
  }
  /** Hộp có đáy nằm trên gốc. */
  box(w: number, h: number, d: number, material: THREE.Material, at?: THREE.Matrix4) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
    this.add(g, material, at);
  }
  /** Chỏm cong (đáy/nắp bình) đáy tròn bán kính r tại gốc, lồi lên +Y một đoạn depth. */
  dome(r: number, depth: number, material: THREE.Material, at?: THREE.Matrix4) {
    const g = new THREE.SphereGeometry(r, this.seg, Math.max(4, this.seg / 4), 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, depth / r, 1);
    this.add(g, material, at);
  }
  /** Vành xuyến nằm ngang quanh trục Y tại gốc. */
  ring(r: number, tube: number, material: THREE.Material, at?: THREE.Matrix4) {
    const g = new THREE.TorusGeometry(r, tube, this.high ? 10 : 6, this.seg);
    g.rotateX(Math.PI / 2);
    this.add(g, material, at);
  }
  /** Ống đi qua các điểm, bo cong ở góc (toạ độ thiết bị, không dùng `at`). */
  pipe(points: THREE.Vector3[], r: number, material: THREE.Material) {
    if (points.length < 2) return;
    if (points.length === 2) {
      // Đoạn thẳng: trụ đơn, rẻ hơn ống uốn nhiều lần.
      const dir = points[1].clone().sub(points[0]);
      this.cyl(r, dir.length(), material, orient(points[0], dir), r, false, this.high ? 16 : 8);
      return;
    }
    const path = new THREE.CurvePath<THREE.Vector3>();
    const bend = r * 2.2;
    let from = points[0].clone();
    for (let i = 1; i < points.length; i++) {
      const corner = points[i];
      const next = points[i + 1];
      if (!next) {
        path.add(new THREE.LineCurve3(from, corner.clone()));
        break;
      }
      const a = corner.clone().sub(from);
      const b = next.clone().sub(corner);
      const cut = Math.min(bend, a.length() / 2, b.length() / 2);
      const before = corner.clone().addScaledVector(a.normalize(), -cut);
      const after = corner.clone().addScaledVector(b.normalize(), cut);
      path.add(new THREE.LineCurve3(from, before));
      path.add(new THREE.QuadraticBezierCurve3(before, corner.clone(), after));
      from = after;
    }
    const steps = Math.max(2, Math.round((path.getLength() / (r * 2)) * (this.high ? 1.2 : 0.6)));
    this.add(new THREE.TubeGeometry(path, Math.min(steps, 160), r, this.high ? 16 : 8, false), material);
  }

  /**
   * Bể chữ nhật hở nắp, đáy tại gốc: đáy, bốn thành dày t, vành mép và gân tăng cứng.
   * `front` là vật liệu thành trước (+Z), ví dụ kính quan sát.
   */
  openTank(
    w: number,
    h: number,
    d: number,
    t: number,
    material: THREE.Material,
    at = new THREE.Matrix4(),
    front: THREE.Material = material,
  ) {
    const m = (x: number, y: number, z: number) => at.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z));
    this.box(w, t, d, material, m(0, 0, 0));
    this.box(w, h, t, material, m(0, 0, -d / 2 + t / 2));
    this.box(w, h, t, front, m(0, 0, d / 2 - t / 2));
    for (const x of [-w / 2 + t / 2, w / 2 - t / 2]) this.box(t, h, d - t * 2, material, m(x, 0, 0));
    const rim = Math.max(0.03, t * 2.5);
    for (const z of [-d / 2, d / 2]) this.box(w + rim, 0.02, rim, material, m(0, h - 0.02, z));
    for (const x of [-w / 2, w / 2]) this.box(rim, 0.02, d + rim, material, m(x, h - 0.02, 0));
    if (this.high) {
      const n = Math.max(2, Math.round(w / 0.4));
      for (let i = 0; i <= n; i++) {
        const x = -w / 2 + (w * i) / n;
        this.box(0.025, h - 0.02, 0.02, material, m(x, 0, -d / 2 - 0.01));
        if (front === material) this.box(0.025, h - 0.02, 0.02, material, m(x, 0, d / 2 + 0.01));
      }
    }
  }

  /* ---------------- đường ống ---------------- */

  /** Mặt bích có bu lông, mặt dưới tại gốc. Trả về bề dày. */
  flange(r: number, material: THREE.Material, at = new THREE.Matrix4()) {
    const outer = r * 1.7 + 0.012;
    const t = Math.max(0.012, r * 0.3);
    this.cyl(outer, t, material, at.clone());
    if (this.high) {
      const n = r < 0.03 ? 4 : 8;
      const br = Math.max(0.004, r * 0.1);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const local = new THREE.Matrix4().makeTranslation(
          (Math.cos(a) * (r + outer)) / 2,
          -0.004,
          (Math.sin(a) * (r + outer)) / 2,
        );
        this.cyl(br, t + 0.008, PBR.inox, at.clone().multiply(local), br, false, 6);
      }
    }
    return t;
  }
  /** Ống cụt dài len, đầu ngoài có mặt bích (mặt bích kết thúc đúng tại len). */
  nozzle(r: number, len: number, material: THREE.Material, at = new THREE.Matrix4(), flangeMaterial = material) {
    this.cyl(r, len, material, at.clone());
    const t = Math.max(0.012, r * 0.3);
    this.flange(r, flangeMaterial, at.clone().multiply(new THREE.Matrix4().makeTranslation(0, len - t, 0)));
  }
  /** Ống cụt có rắc co ở đầu ngoài (dùng cho DN nhỏ). */
  unionStub(r: number, len: number, material: THREE.Material, at = new THREE.Matrix4()) {
    this.cyl(r, len, material, at.clone());
    const nut = r * 1.1;
    this.cyl(
      r * 1.5,
      nut,
      material,
      at.clone().multiply(new THREE.Matrix4().makeTranslation(0, len - nut, 0)),
      r * 1.5,
      false,
      8,
    );
  }
  /** Van bi tay gạt, tâm tại gốc, ống đi dọc +Y; tay gạt hướng +Z. Chiếm khoảng ±2r dọc ống. */
  ballValve(r: number, at = new THREE.Matrix4(), body: THREE.Material = PBR.pvc) {
    const m = (x: number, y: number, z: number) => at.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z));
    this.cyl(r * 1.55, r * 2.2, body, m(0, -r * 1.1, 0));
    this.cyl(r * 1.75, r * 0.7, body, m(0, -r * 2, 0), r * 1.75, false, 8);
    this.cyl(r * 1.75, r * 0.7, body, m(0, r * 1.3, 0), r * 1.75, false, 8);
    const stem = at.clone().multiply(orient(v3(0, 0, r * 1.4), v3(0, 0, 1)));
    this.cyl(r * 0.45, r * 0.9, body, stem, r * 0.45, false, 8);
    const handle = at.clone().multiply(new THREE.Matrix4().makeTranslation(0, -r * 0.6, r * 2.3));
    this.box(r * 0.7, r * 3.6, r * 0.28, PBR.red, handle);
  }
  /** Van cổng tay quay, tâm tại gốc, ống đi dọc +Y; ty van hướng +Z. */
  gateValve(r: number, at = new THREE.Matrix4(), body: THREE.Material = PBR.pvc) {
    const m = (x: number, y: number, z: number) => at.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z));
    this.cyl(r * 1.5, r * 2.4, body, m(0, -r * 1.2, 0));
    const bonnet = at.clone().multiply(orient(v3(0, 0, r), v3(0, 0, 1)));
    this.box(r * 2.2, r * 2.4, r * 1.6, body, bonnet);
    const stem = at.clone().multiply(orient(v3(0, 0, r * 3.4), v3(0, 0, 1)));
    this.cyl(r * 0.25, r * 2, PBR.inox, stem, r * 0.25, false, 8);
    const wheel = at.clone().multiply(orient(v3(0, 0, r * 5.4), v3(0, 0, 1)));
    this.ring(r * 1.5, r * 0.22, PBR.red, wheel);
    this.box(
      r * 3,
      r * 0.2,
      r * 0.3,
      PBR.red,
      wheel.clone().multiply(new THREE.Matrix4().makeTranslation(0, -r * 0.1, 0)),
    );
  }

  /* ---------------- đo và điều khiển ---------------- */

  /** Đồng hồ áp: cuống dọc +Y, mặt số quay về +Z. */
  gauge(at = new THREE.Matrix4(), r = 0.032) {
    this.cyl(r * 0.2, r * 1.2, PBR.brass, at.clone(), r * 0.2, false, 8);
    const face = at.clone().multiply(orient(v3(0, r * 2.1, -r * 0.35), v3(0, 0, 1)));
    this.cyl(r, r * 0.7, PBR.inox, face.clone());
    this.cyl(r * 0.85, r * 0.72, PBR.white, face);
  }
  /** Lưu lượng kế phao (rotameter) đứng trên gốc, cao h. */
  rotameter(at = new THREE.Matrix4(), h = 0.2, r = 0.014) {
    const m = (y: number) => at.clone().multiply(new THREE.Matrix4().makeTranslation(0, y, 0));
    this.cyl(r * 1.5, h * 0.12, PBR.black, m(0), r * 1.5, false, 8);
    this.cyl(r, h * 0.76, PBR.clear, m(h * 0.12), r * 1.25);
    this.cyl(r * 0.6, h * 0.06, PBR.red, m(h * 0.45), r * 0.3, false, 8);
    this.cyl(r * 1.5, h * 0.12, PBR.black, m(h * 0.88), r * 1.5, false, 8);
  }
  /** Tủ điện: mặt trước quay về +Z, đáy tại gốc. Đèn báo trả về để thiết bị tự điều khiển. */
  cabinet(w: number, h: number, d: number, at = new THREE.Matrix4()) {
    const m = (x: number, y: number, z: number) => at.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z));
    this.box(w, h, d, PBR.steelGrey, at.clone());
    this.box(w * 0.92, h * 0.92, 0.006, PBR.pp, m(0, h * 0.04, d / 2));
    this.box(w * 0.5, h * 0.2, 0.004, PBR.screen, m(0, h * 0.62, d / 2 + 0.006));
    this.box(0.012, h * 0.16, 0.014, PBR.black, m(w * 0.38, h * 0.42, d / 2 + 0.006));
  }

  /* ---------------- máy ---------------- */

  /**
   * Động cơ điện dọc +Y: đầu trục tại gốc, đuôi (nắp quạt) tại len. Hộp đấu dây ở +Z, chân đế ở -Z.
   */
  motor(r: number, len: number, at = new THREE.Matrix4(), feet = true) {
    const m = (x: number, y: number, z: number) => at.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z));
    const bell = len * 0.1;
    const fan = len * 0.2;
    const body = len - bell * 2 - fan;
    this.cyl(r * 0.92, bell, PBR.castIron, m(0, 0, 0), r);
    this.cyl(r * 0.94, body, PBR.aluminium, m(0, bell, 0));
    if (this.high) {
      const fins = 22;
      for (let i = 0; i < fins; i++) {
        const a = (i / fins) * Math.PI * 2;
        if (Math.abs(Math.sin(a) - 1) < 0.35 || Math.abs(Math.sin(a) + 1) < 0.2) continue; // chừa hộp điện, chân
        const fin = m(Math.cos(a) * r * 0.98, bell + body * 0.04, Math.sin(a) * r * 0.98).multiply(
          new THREE.Matrix4().makeRotationY(-a),
        );
        this.box(r * 0.16, body * 0.92, r * 0.035, PBR.aluminium, fin);
      }
    }
    this.cyl(r, bell, PBR.castIron, m(0, bell + body, 0), r * 0.92);
    this.cyl(r * 1.04, fan, PBR.black, m(0, bell * 2 + body, 0), r * 1.0);
    this.box(r * 0.9, body * 0.36, r * 0.5, PBR.castIron, m(0, bell + body * 0.3, r * 0.82));
    if (feet) {
      for (const y of [bell + body * 0.12, bell + body * 0.78])
        this.box(r * 1.9, body * 0.1, r * 0.35, PBR.castIron, m(0, y, -r * 1.2));
    }
  }

  /* ---------------- kết cấu ---------------- */

  /** Chân đỡ thép hộp từ sàn lên độ cao h tại (x, z), có bản đế. */
  leg(x: number, z: number, h: number, size = 0.04, material: THREE.Material = PBR.steelGrey) {
    this.box(size * 2.4, 0.008, size * 2.4, material, orient(v3(x, 0, z)));
    this.box(size, h, size, material, orient(v3(x, 0, z)));
  }
  /** Khung bệ thép chữ nhật nằm trên sàn, mặt trên ở độ cao h. */
  skid(w: number, d: number, h: number, material: THREE.Material = PBR.steelBlue, cx = 0, cz = 0) {
    const rail = Math.min(0.06, d * 0.18);
    for (const z of [-d / 2 + rail / 2, d / 2 - rail / 2]) this.box(w, h, rail, material, orient(v3(cx, 0, cz + z)));
    for (const x of [-w / 2 + rail / 2, 0, w / 2 - rail / 2])
      this.box(rail, h * 0.8, d - rail * 2, material, orient(v3(cx + x, 0, cz)));
    this.box(w, 0.008, d, material, orient(v3(cx, h - 0.008, cz)));
  }

  /* ---------------- xuất ---------------- */

  /** Gộp toàn bộ theo vật liệu, trả về hình học thô (dùng để dựng InstancedMesh). */
  merged() {
    const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const item of this.items) {
      if (!byMaterial.has(item.material)) byMaterial.set(item.material, []);
      byMaterial.get(item.material)!.push(item.geometry);
    }
    this.items = [];
    return [...byMaterial].map(([material, geometries]) => {
      const geometry = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
      if (geometries.length > 1) geometries.forEach((g) => g.dispose());
      return { material, geometry };
    });
  }

  /**
   * Gộp hình học. Mức cao: mỗi bộ phận là một Group có tên, mỗi vật liệu một mesh.
   * Mức thấp: gộp cả thiết bị theo vật liệu (nhóm "tat-ca") để giảm draw call.
   */
  build() {
    const root = new THREE.Group();
    const buckets = new Map<string, Map<THREE.Material, THREE.BufferGeometry[]>>();
    for (const item of this.items) {
      const key = this.high ? item.part : "tat-ca";
      if (!buckets.has(key)) buckets.set(key, new Map());
      const byMaterial = buckets.get(key)!;
      if (!byMaterial.has(item.material)) byMaterial.set(item.material, []);
      byMaterial.get(item.material)!.push(item.geometry);
    }
    for (const [name, byMaterial] of buckets) {
      const group = new THREE.Group();
      group.name = name;
      for (const [material, geometries] of byMaterial) {
        const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
        if (geometries.length > 1) geometries.forEach((g) => g.dispose());
        const mesh = new THREE.Mesh(merged, material);
        mesh.castShadow = mesh.receiveShadow = !material.transparent;
        group.add(mesh);
      }
      root.add(group);
    }
    this.items = [];
    return root;
  }
}

/** Gắn một vật thể có hoạt cảnh vào bộ phận có tên (mức thấp thì gắn thẳng vào gốc). */
export function attach(root: THREE.Group, part: string, object: THREE.Object3D) {
  let target = root.getObjectByName(part);
  if (!target && !root.getObjectByName("tat-ca")) {
    target = new THREE.Group();
    target.name = part;
    root.add(target);
  }
  (target ?? root).add(object);
  return object;
}

/** Bọt khí bốc lên trong một khối hộp. Vị trí là hàm của thời gian, không cộng dồn theo khung. */
export function bubbles(count: number, w: number, h: number, d: number, y0: number) {
  const pos = new Float32Array(count * 3);
  const seed = Array.from({ length: count }, (_, i) => {
    const rnd = (k: number) => {
      const s = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
      return s - Math.floor(s);
    };
    return [rnd(1) - 0.5, rnd(2), rnd(3) - 0.5, 0.4 + rnd(4) * 0.8];
  });
  const pts = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.8, depthWrite: false }),
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

/** Đếm tam giác và draw call của một cây vật thể (dùng trong test và báo cáo). */
export function measure(root: THREE.Object3D) {
  let triangles = 0;
  let drawCalls = 0;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const g = o.geometry as THREE.BufferGeometry;
      const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
      triangles += o instanceof THREE.InstancedMesh ? n * o.count : n;
      drawCalls++;
    } else if (o instanceof THREE.Points) drawCalls++;
  });
  return { triangles, drawCalls };
}
