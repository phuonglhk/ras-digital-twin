/*
 * Cảnh 3D của Digital Twin. Bố cục theo thứ tự công nghệ iRAS:
 * khu nuôi bên trái, tuyến xử lý chạy dọc trục x, ống hồi đi trên cao về khu nuôi,
 * nhánh khử nitrat đặt cạnh khu nuôi.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { Level, Params, Point, UnitId } from "../model/process";
import type { BbLibrary } from "./bbmodel";
import { PBR } from "./materials";
import { configureRenderer, createEnvironment } from "./stage";
import {
  AssetKit,
  denitrification,
  crabBoxes,
  degasser,
  drumFilter,
  mbbr,
  oxygenCone,
  pump,
  rackFrame,
  roundTank,
  skimmer,
  uvReactor,
  type Equipment,
} from "./equipment";

export type SceneUnit = UnitId | "denit";

export interface SceneView {
  points: Partial<Record<UnitId, Point>>;
  levels: Partial<Record<SceneUnit, Level>>;
  labels: Partial<Record<SceneUnit, string>>;
  params: Params;
  selected: SceneUnit | null;
}

const LEVEL_HEX: Record<Level, number> = { ok: 0x4ade80, warn: 0xfbbf24, bad: 0xf87171 };
const WATER_CLEAN = new THREE.Color(0x4fb7e6);
const WATER_TURBID = new THREE.Color(0x8a7f3a);

const TITLES: Record<SceneUnit, string> = {
  culture: "Bể nuôi",
  rdf: "Lọc trống",
  skimmer: "Tách đạm",
  biofilter: "MBBR",
  degasser: "Khử CO₂",
  pump: "Bơm",
  uv: "UV",
  oxygen: "Côn ôxy",
  denit: "Khử nitrat",
};

function labelSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 112;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.scale.set(1.55, 0.45, 1);
  sprite.renderOrder = 20;
  let last = "";
  const draw = (title: string, sub: string, accent: string, selected: boolean) => {
    const key = title + sub + accent + selected;
    if (key === last) return;
    last = key;
    ctx.clearRect(0, 0, 384, 112);
    ctx.fillStyle = "rgba(10,20,26,0.9)";
    ctx.strokeStyle = selected ? "#f4c542" : accent;
    ctx.lineWidth = selected ? 6 : 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, 376, 104, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#eef4f6";
    ctx.font = "600 34px 'IBM Plex Sans', system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(title, 18, 36);
    ctx.fillStyle = accent;
    ctx.font = "500 28px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillText(sub, 18, 80);
    texture.needsUpdate = true;
  };
  return { sprite, draw };
}

interface Placed {
  id: SceneUnit;
  eq: Equipment;
  label: ReturnType<typeof labelSprite>;
}

interface Flow {
  curve: THREE.CurvePath<THREE.Vector3>;
  points: THREE.Points;
  count: number;
  speed: number;
  main: boolean;
}

function polyline(pts: THREE.Vector3[]) {
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i].distanceTo(pts[i + 1]) > 1e-4) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  }
  return path;
}

export class TwinScene {
  private renderer: THREE.WebGLRenderer;
  private environment: THREE.Texture;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);
  private controls: OrbitControls;
  private kit: AssetKit;
  private world = new THREE.Group();
  private units = new Map<SceneUnit, Placed>();
  private flows: Flow[] = [];
  private pickables: THREE.Object3D[] = [];
  private crabLamps: THREE.InstancedMesh | null = null;
  private ring: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private layoutKey = "";
  private view: SceneView | null = null;
  private frameId = 0;
  private clock = new THREE.Clock();
  private reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private downAt: { x: number; y: number } | null = null;
  onPick?: (id: SceneUnit | null) => void;
  onHover?: (id: SceneUnit | null, x: number, y: number) => void;

  constructor(
    private canvas: HTMLCanvasElement,
    lib: BbLibrary,
  ) {
    this.kit = new AssetKit(lib);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    configureRenderer(this.renderer);
    this.environment = createEnvironment(this.renderer);
    this.scene.environment = this.environment;

    this.scene.background = new THREE.Color(0x0b1418);
    this.scene.fog = new THREE.Fog(0x0b1418, 35, 80);
    this.scene.add(new THREE.HemisphereLight(0xdbeef2, 0x0e1a1e, 2.0));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(6, 16, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 14, bottom: -14, near: 1, far: 50 });
    this.scene.add(sun);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshLambertMaterial({ color: 0x132026 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const grid = new THREE.GridHelper(60, 60, 0x1f3239, 0x172a30);
    grid.position.y = 0.003;
    this.scene.add(grid);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.05, 40),
      new THREE.MeshBasicMaterial({ color: 0xf4c542, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.01;
    this.ring.visible = false;
    this.scene.add(this.ring);

    this.scene.add(this.world);
    this.camera.position.set(4, 11, 17);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 0.8, 0);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 45;

    canvas.addEventListener("pointerdown", this.handleDown);
    canvas.addEventListener("pointerup", this.handleUp);
    canvas.addEventListener("pointermove", this.handleMove);
    canvas.addEventListener("pointerleave", this.handleLeave);
    this.loop();
  }

  /* ---------------- bố cục ---------------- */

  private layout(p: Params) {
    const key = [p.speciesId, p.units, p.unitVolume, p.biofilter.media].join("|");
    if (key === this.layoutKey) return;
    this.layoutKey = key;

    this.world.traverse((o) => {
      if ((o as THREE.Mesh).geometry && !(o as THREE.InstancedMesh).isInstancedMesh)
        (o as THREE.Mesh).geometry.dispose();
    });
    this.world.clear();
    this.units.clear();
    this.flows = [];
    this.pickables = [];
    this.crabLamps = null;

    const cultureEnd = -2.6; // mép phải khu nuôi
    const culture = this.buildCulture(p, cultureEnd);

    // Tuyến xử lý theo thứ tự iRAS.
    const line: [SceneUnit, Equipment, number][] = [
      ["rdf", drumFilter("low"), 0],
      ["skimmer", skimmer("low"), 0],
      ["biofilter", mbbr(p.biofilter.media, "low"), 0],
      ["degasser", degasser("low"), 0],
      ["pump", pump("low"), 0],
      ["oxygen", oxygenCone("low"), 0],
      ["uv", uvReactor("low"), 0],
    ];
    let cursor = 0;
    for (const [id, eq, width] of line) {
      const w = width || new THREE.Box3().setFromObject(eq.group).getSize(new THREE.Vector3()).x;
      eq.group.position.set(cursor + w / 2, 0, 0);
      cursor += w + 1.0;
      this.addUnit(id, eq);
    }

    const denit = denitrification("low");
    denit.group.position.set(cultureEnd + 1.1, 0, -2.6);
    this.addUnit("denit", denit);

    this.buildPipes(culture);

    const span = cursor - culture.minX;
    this.controls.target.set((culture.minX + cursor) / 2, 0.8, -0.5);
    this.camera.position.set((culture.minX + cursor) / 2 + 2, span * 0.55, span * 0.75);
    this.controls.update();
  }

  private addUnit(id: SceneUnit, eq: Equipment) {
    const label = labelSprite();
    label.sprite.position.set(0, eq.height + 0.85, 0);
    eq.group.add(label.sprite);
    eq.group.traverse((o) => {
      o.userData.unit = id;
      if ((o as THREE.Mesh).isMesh) this.pickables.push(o);
    });
    this.world.add(eq.group);
    this.units.set(id, { id, eq, label });
  }

  private buildCulture(p: Params, endX: number) {
    const group = new THREE.Group();
    let inlet: THREE.Vector3;
    let outlet: THREE.Vector3;
    let minX: number;
    let height: number;
    let water: THREE.Mesh | undefined;
    let center: THREE.Vector3;

    if (p.speciesId === "mud-crab") {
      const cols = 10;
      const tiers = 4;
      const perRack = cols * tiers;
      const racks = Math.max(1, Math.ceil(p.units / perRack));
      const boxSize = new THREE.Vector3(0.44, 0.24, 0.4);
      const pitch = 0.5;
      const tierH = 0.34;
      const rowGap = 1.35;
      const length = cols * pitch;
      const x0 = endX - length / 2;
      const zs = Array.from({ length: racks }, (_, r) => (r - (racks - 1) / 2) * rowGap);
      const positions: THREE.Vector3[] = [];
      zs.forEach((z) => {
        const frame = rackFrame(length + 0.1, tiers, 0.5, tierH);
        frame.position.set(x0, 0, z);
        group.add(frame);
      });
      for (let i = 0; i < p.units; i++) {
        const r = Math.floor(i / perRack);
        const k = i % perRack;
        const t = Math.floor(k / cols);
        const c = k % cols;
        positions.push(new THREE.Vector3(x0 - length / 2 + pitch / 2 + c * pitch, 0.1 + t * tierH, zs[r]));
      }
      const boxes = crabBoxes(this.kit, positions, boxSize);
      group.add(boxes.group);
      this.crabLamps = boxes.lamps;
      minX = x0 - length / 2;
      height = tiers * tierH + 0.2;
      inlet = new THREE.Vector3(x0, height + 0.5, 0);
      outlet = new THREE.Vector3(endX + 0.2, 0.1, 0);
      center = new THREE.Vector3(x0, 0, 0);
      // Ống cấp chạy dọc nóc từng kệ.
      for (const z of zs) {
        const f = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, length, 8),
          new THREE.MeshLambertMaterial({ color: 0xd9ded9 }),
        );
        f.rotation.z = Math.PI / 2;
        f.position.set(x0, height + 0.05, z - 0.2);
        group.add(f);
      }
    } else {
      const n = Math.max(1, p.units);
      const sample = roundTank(p.unitVolume, "low");
      const d = new THREE.Box3().setFromObject(sample.group).getSize(new THREE.Vector3()).x;
      const cols = Math.min(2, n);
      const rows = Math.ceil(n / cols);
      const gap = d + 1.0;
      minX = endX - cols * gap;
      for (let i = 0; i < n; i++) {
        const t = i === 0 ? sample : roundTank(p.unitVolume, "low");
        const c = i % cols;
        const r = Math.floor(i / cols);
        t.group.position.set(endX - gap / 2 - c * gap, 0, (r - (rows - 1) / 2) * gap);
        group.add(t.group);
        if (i === 0) water = t.water;
        else (t.water!.material as THREE.MeshPhysicalMaterial).dispose();
        if (i > 0) t.water!.material = sample.water!.material; // tô màu chung
        t.lamp.visible = false;
      }
      sample.lamp.visible = false;
      height = sample.height;
      inlet = new THREE.Vector3(endX - (cols * gap) / 2, height + 0.9, 0);
      outlet = new THREE.Vector3(endX + 0.2, 0.15, 0);
      center = new THREE.Vector3(endX - (cols * gap) / 2, 0, 0);
    }

    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x5b6b5e }),
    );
    lamp.position.set(center.x, height + 1.1, center.z);
    group.add(lamp);
    const eq: Equipment = { group, inlet, outlet, height: height + 0.8, lamp, water };
    // Nhãn khu nuôi đặt giữa khu, không theo gốc nhóm.
    const label = labelSprite();
    label.sprite.position.set(center.x, height + 1.75, center.z);
    group.add(label.sprite);
    group.traverse((o) => {
      o.userData.unit = "culture";
      if ((o as THREE.Mesh).isMesh || (o as THREE.InstancedMesh).isInstancedMesh) this.pickables.push(o);
    });
    this.world.add(group);
    this.units.set("culture", { id: "culture", eq, label });
    return { inlet, outlet, minX, center };
  }

  private buildPipes(culture: { inlet: THREE.Vector3; outlet: THREE.Vector3 }) {
    const world = (id: SceneUnit, which: "inlet" | "outlet") => {
      const u = this.units.get(id)!;
      u.eq.group.updateMatrixWorld(true);
      return u.eq.group.localToWorld(u.eq[which].clone());
    };
    const main = (pts: THREE.Vector3[], radius = 0.055) => this.addPipe(pts, radius, true);

    // Khu nuôi → lọc trống: ống tràn chung sát sàn.
    const rdfIn = world("rdf", "inlet");
    main([
      culture.outlet,
      new THREE.Vector3(rdfIn.x - 0.35, culture.outlet.y, 0),
      new THREE.Vector3(rdfIn.x - 0.35, rdfIn.y, 0),
      rdfIn,
    ]);

    const order: SceneUnit[] = ["rdf", "skimmer", "biofilter", "degasser", "pump", "oxygen", "uv"];
    for (let i = 0; i < order.length - 1; i++) {
      const a = world(order[i], "outlet");
      const b = world(order[i + 1], "inlet");
      const midX = (a.x + b.x) / 2;
      main([a, new THREE.Vector3(midX, a.y, a.z), new THREE.Vector3(midX, b.y, b.z), b]);
    }

    // Hồi về khu nuôi trên cao.
    const o2 = world("uv", "outlet");
    const top = 3.4;
    main([
      o2,
      new THREE.Vector3(o2.x + 0.5, o2.y, 0),
      new THREE.Vector3(o2.x + 0.5, top, 0),
      new THREE.Vector3(o2.x + 0.5, top, 1.4),
      new THREE.Vector3(culture.inlet.x, top, 1.4),
      new THREE.Vector3(culture.inlet.x, top, culture.inlet.z),
      culture.inlet,
    ]);

    // Nhánh khử nitrat: lấy từ ống tràn, trả về ống tràn phía sau.
    const dIn = world("denit", "inlet");
    const dOut = world("denit", "outlet");
    const tapX = culture.outlet.x + 0.4;
    this.addPipe(
      [
        new THREE.Vector3(tapX, culture.outlet.y, 0),
        new THREE.Vector3(tapX, culture.outlet.y, dIn.z),
        new THREE.Vector3(dIn.x - 0.3, culture.outlet.y, dIn.z),
        new THREE.Vector3(dIn.x - 0.3, dIn.y, dIn.z),
        dIn,
      ],
      0.03,
      false,
    );
    this.addPipe(
      [
        dOut,
        new THREE.Vector3(dOut.x + 0.3, dOut.y, dOut.z),
        new THREE.Vector3(dOut.x + 0.3, culture.outlet.y + 0.05, dOut.z),
        new THREE.Vector3(tapX + 0.6, culture.outlet.y + 0.05, dOut.z),
        new THREE.Vector3(tapX + 0.6, culture.outlet.y + 0.05, 0),
      ],
      0.03,
      false,
    );
  }

  private addPipe(pts: THREE.Vector3[], radius: number, main: boolean) {
    const curve = polyline(pts);
    const length = curve.getLength();
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.max(16, Math.round(length * 12)), radius, 8, false),
      main ? PBR.pp : PBR.pvc,
    );
    tube.castShadow = true;
    this.world.add(tube);
    const count = Math.max(6, Math.round(length * 3.5));
    const positions = new Float32Array(count * 3);
    const points = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3)),
      new THREE.PointsMaterial({
        color: main ? 0x7fd6ff : 0xc4a7ff,
        size: main ? 0.11 : 0.08,
        transparent: true,
        depthTest: false,
      }),
    );
    points.renderOrder = 10;
    this.world.add(points);
    this.flows.push({ curve, points, count, speed: 0.6 / Math.max(length, 1), main });
  }

  /* ---------------- cập nhật dữ liệu ---------------- */

  update(view: SceneView) {
    this.layout(view.params);
    this.view = view;
    const p = view.params;
    const on: Record<SceneUnit, boolean> = {
      culture: true,
      rdf: p.rdf.on && p.pumpOn,
      skimmer: p.skimmer.on && p.pumpOn,
      biofilter: p.biofilter.on,
      degasser: p.degasser.on,
      pump: p.pumpOn,
      uv: p.uv.on && p.pumpOn,
      oxygen: p.oxygen.on && p.pumpOn,
      denit: p.denit.on && p.pumpOn,
    };

    for (const [id, u] of this.units) {
      const level = view.levels[id] ?? "ok";
      const accent = !on[id] ? "#8a9aa0" : level === "bad" ? "#f87171" : level === "warn" ? "#fbbf24" : "#7fe3a8";
      (u.eq.lamp.material as THREE.MeshBasicMaterial).color.setHex(!on[id] ? 0x5b6b5e : LEVEL_HEX[level]);
      u.label.draw(TITLES[id], on[id] ? (view.labels[id] ?? "") : "TẮT", accent, view.selected === id);
      if (u.eq.water) {
        const c = WATER_CLEAN.clone().lerp(WATER_TURBID, level === "bad" ? 0.65 : level === "warn" ? 0.3 : 0);
        (u.eq.water.material as THREE.MeshPhysicalMaterial).color.copy(c);
      }
      u.eq.group.userData.running = on[id];
    }

    if (this.crabLamps) {
      const hex = LEVEL_HEX[view.levels.culture ?? "ok"];
      const color = new THREE.Color(hex);
      for (let i = 0; i < this.crabLamps.count; i++) this.crabLamps.setColorAt(i, color);
      if (this.crabLamps.instanceColor) this.crabLamps.instanceColor.needsUpdate = true;
    }

    const sel = view.selected ? this.units.get(view.selected) : null;
    this.ring.visible = !!sel;
    if (sel) {
      const b = new THREE.Box3().setFromObject(sel.eq.group);
      const c = b.getCenter(new THREE.Vector3());
      const s = b.getSize(new THREE.Vector3());
      this.ring.position.set(c.x, 0.01, c.z);
      this.ring.scale.setScalar(Math.max(0.6, Math.max(s.x, s.z) * 0.6));
    }
  }

  focus(id: SceneUnit) {
    const u = this.units.get(id);
    if (!u) return;
    const b = new THREE.Box3().setFromObject(u.eq.group);
    const c = b.getCenter(new THREE.Vector3());
    const r = Math.max(2.5, b.getSize(new THREE.Vector3()).length() * 1.1);
    this.controls.target.copy(c);
    this.camera.position.set(c.x + r * 0.6, c.y + r * 0.7, c.z + r);
    this.controls.update();
  }

  overview() {
    this.layoutKey = "";
    if (this.view) this.update(this.view);
  }

  /* ---------------- vòng lặp & tương tác ---------------- */

  private loop = () => {
    this.frameId = requestAnimationFrame(this.loop);
    const t = this.clock.getElapsedTime();
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (
      w &&
      h &&
      (this.canvas.width !== Math.floor(w * this.renderer.getPixelRatio()) ||
        this.canvas.height !== Math.floor(h * this.renderer.getPixelRatio()))
    ) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    const p = this.view?.params;
    const flowFactor = p ? Math.min(2.5, Math.max(0.3, p.flow / 6)) : 1;
    for (const f of this.flows) {
      const running = !!p && p.pumpOn && (f.main || p.denit.on);
      f.points.visible = running;
      if (!running) continue;
      const arr = f.points.geometry.attributes.position.array as Float32Array;
      const time = this.reduceMotion ? 0 : t;
      for (let i = 0; i < f.count; i++) {
        const u = (i / f.count + time * f.speed * flowFactor) % 1;
        const pt = f.curve.getPointAt(u);
        arr[i * 3] = pt.x;
        arr[i * 3 + 1] = pt.y;
        arr[i * 3 + 2] = pt.z;
      }
      f.points.geometry.attributes.position.needsUpdate = true;
    }
    if (!this.reduceMotion) for (const u of this.units.values()) u.eq.animate?.(t, !!u.eq.group.userData.running);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private hit(e: PointerEvent): SceneUnit | null {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const h = this.raycaster.intersectObjects(this.pickables, false)[0];
    return (h?.object.userData.unit as SceneUnit) ?? null;
  }

  private handleDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY };
  };
  private handleUp = (e: PointerEvent) => {
    if (this.downAt && Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) < 6) this.onPick?.(this.hit(e));
    this.downAt = null;
  };
  private handleMove = (e: PointerEvent) => {
    if (e.buttons) return;
    const id = this.hit(e);
    this.canvas.style.cursor = id ? "pointer" : "";
    const r = this.canvas.getBoundingClientRect();
    this.onHover?.(id, e.clientX - r.left, e.clientY - r.top);
  };
  private handleLeave = () => this.onHover?.(null, 0, 0);

  dispose() {
    cancelAnimationFrame(this.frameId);
    this.canvas.removeEventListener("pointerdown", this.handleDown);
    this.canvas.removeEventListener("pointerup", this.handleUp);
    this.canvas.removeEventListener("pointermove", this.handleMove);
    this.canvas.removeEventListener("pointerleave", this.handleLeave);
    this.controls.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
