import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { halfPipeVelocity, velocity } from "./hydraulics";
import { rimSlope, type Component, type RackDesign, type System } from "./types";
export type Layer = "hộp" | "khung" | "cấp" | "tràn" | "xả cặn" | "ống đứng" | "nước";
const color: Record<System, number> = {
  cấp: 0x168bdb,
  tràn: 0x36a461,
  "xả cặn": 0x95623b,
  "ống đứng cấp": 0x17578d,
  "ống đứng thoát": 0x315b40,
  "ống chính": 0x254961,
  "ống chính trên cao": 0x8d9699,
  "ống thả": 0xe7eae7,
  mương: 0x7d8581,
  "Phòng lọc": 0x7d8581,
  khung: 0x687681,
};
export class DesignScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
  private controls: OrbitControls;
  private root = new THREE.Group();
  private raf = 0;
  private resize: ResizeObserver;
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private meshes: THREE.InstancedMesh[] = [];
  private selected = new Set<string>();
  private layers = new Set<Layer>(["hộp", "khung", "cấp", "tràn", "xả cặn", "ống đứng", "nước"]);
  private exploded = false;
  private one = false;
  private design?: RackDesign;
  private components: Component[] = [];
  private doorOpen = false;
  private animation: ((seconds: number) => void)[] = [];
  private labels: { element: HTMLDivElement; line: SVGLineElement; point: THREE.Vector3 }[] = [];
  private overlay: HTMLDivElement;
  private lines: SVGSVGElement;
  private fpsLabel?: HTMLDivElement;
  private frameStart = 0;
  private frameCount = 0;
  private lowDetail = false;
  private flush = false;
  private showCodes = true;
  private showDoors = true;
  private assemblyTier: number | null = null;
  private codeAtlas?: THREE.CanvasTexture;
  private closedTier: { rack: number; tier: number; block: number } | null = null;
  onPick: (id: string) => void = () => {};
  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene.background = new THREE.Color(0x0b1418);
    const host = canvas.parentElement!;
    this.overlay = document.createElement("div");
    this.overlay.className = "design-overlay";
    this.lines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.lines.classList.add("design-label-lines");
    this.overlay.appendChild(this.lines);
    host.appendChild(this.overlay);
    if (new URLSearchParams(location.search).get("fps") === "1") {
      this.fpsLabel = document.createElement("div");
      this.fpsLabel.className = "design-fps";
      host.appendChild(this.fpsLabel);
    }
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x708090, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(4, 10, 5);
    this.scene.add(light, this.root);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.zoomToCursor = true;
    this.resize = new ResizeObserver(() => this.onResize());
    this.resize.observe(canvas.parentElement!);
    this.onResize();
    canvas.addEventListener("click", this.pick);
    const animate = (time = 0) => {
      this.raf = requestAnimationFrame(animate);
      for (const update of this.animation) update(time / 1000);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.updateLabels();
      if (!this.frameStart) this.frameStart = time;
      this.frameCount++;
      if (time - this.frameStart >= 3000) {
        const fps = (this.frameCount * 1000) / (time - this.frameStart);
        if (this.fpsLabel)
          this.fpsLabel.textContent = `${Math.round(fps)} khung hình/giây${this.lowDetail ? " · giảm chi tiết" : ""}`;
        if (
          fps < 30 &&
          !this.lowDetail &&
          this.design &&
          this.design.cols * this.design.tiers * this.design.racks > 300
        ) {
          this.lowDetail = true;
          this.rebuild();
        }
        this.frameStart = time;
        this.frameCount = 0;
      }
    };
    animate();
  }
  private onResize() {
    const w = this.canvas.parentElement?.clientWidth || 1,
      h = this.canvas.parentElement?.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.design) this.overview();
  }
  private pick = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, (-(e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
    const hit = this.ray.intersectObjects(this.meshes)[0];
    if (hit && hit.instanceId !== undefined) {
      const ids = hit.object.userData.ids as string[];
      this.onPick(ids[hit.instanceId]);
    }
  };
  private clear() {
    this.animation = [];
    this.root.clear();
    for (const label of this.labels) {
      label.element.remove();
      label.line.remove();
    }
    this.labels = [];
    for (const m of this.meshes) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      m.dispose();
    }
    this.meshes = [];
    this.codeAtlas?.dispose();
    this.codeAtlas = undefined;
  }
  setDoor(open: boolean) {
    this.doorOpen = open;
    this.rebuild();
  }
  setFlush(on: boolean) {
    this.flush = on;
    this.rebuild();
    if (this.one) this.overview();
  }
  setClosedTier(value: { rack: number; tier: number; block: number } | null) {
    this.closedTier = value;
    this.rebuild();
  }
  update(
    d: RackDesign,
    components: Component[],
    layers: Set<Layer>,
    exploded: boolean,
    one: boolean,
    selected: string[],
    showCodes = true,
    showDoors = true,
    assemblyTier: number | null = null,
  ) {
    const changed = this.design !== d;
    this.design = d;
    if (d.cols * d.tiers * d.racks <= 300) this.lowDetail = false;
    this.components = components;
    this.layers = layers;
    this.exploded = exploded;
    this.one = one;
    this.selected = new Set(selected);
    this.showCodes = showCodes;
    this.showDoors = showDoors;
    this.assemblyTier = assemblyTier;
    this.rebuild();
    if (changed) this.overview();
  }
  private rebuild() {
    this.clear();
    const d = this.design!;
    const items = this.one
      ? this.components.filter((c) => c.rack === 0 && c.tier === 0 && c.col === 0)
      : this.components;
    const boxes = items.filter((c) => c.type === "Hộp nuôi");
    const add = (
      geometry: THREE.BufferGeometry,
      material: THREE.MeshStandardMaterial,
      entries: { id: string; matrix: THREE.Matrix4 }[],
    ) => {
      if (!entries.length) {
        geometry.dispose();
        material.dispose();
        return;
      }
      const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
      mesh.userData.ids = entries.map((e) => e.id);
      entries.forEach((e, i) => {
        mesh.setMatrixAt(i, e.matrix);
        if (this.selected.has(e.id)) mesh.setColorAt(i, new THREE.Color(0xffb927));
      });
      mesh.instanceMatrix.needsUpdate = true;
      this.root.add(mesh);
      this.meshes.push(mesh);
      return mesh;
    };
    const mat = (c: number, transparent = false) =>
      new THREE.MeshStandardMaterial({
        color: c,
        transparent,
        opacity: transparent ? 0.38 : 1,
        roughness: 0.7,
        side: THREE.DoubleSide,
      });
    const matrix = (x: number, y: number, z: number, sx: number, sy: number, sz: number, rotation = 0) =>
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rotation)),
        new THREE.Vector3(sx, sy, sz),
      );
    if (this.layers.has("khung"))
      for (const name of ["Sỏi đệm", "Gạch bê tông", "Bệ bê tông đổ"]) {
        const pieces = items.filter((c) => c.type === name && c.size);
        add(
          new THREE.BoxGeometry(1, 1, 1),
          mat(name === "Sỏi đệm" ? 0x756b58 : 0x959894),
          pieces.map((c) => ({ id: c.id, matrix: matrix(...c.position, ...c.size!) })),
        );
      }
    if (this.layers.has("tràn")) {
      const sleeves = items.filter((c) => c.type === "Ống bọc khía chân");
      const sleeveMaterial = mat(0x74bca4, true);
      sleeveMaterial.opacity = 0.55;
      add(
        new THREE.CylinderGeometry(0.017, 0.017, 1, 12, 1, true),
        sleeveMaterial,
        sleeves.map((c) => ({
          id: c.id,
          matrix: matrix(
            c.position[0],
            c.position[1] + d.overflowHeight / 2 + 0.006,
            c.position[2],
            1,
            Math.max(0.01, d.overflowHeight - 0.012),
            1,
          ),
        })),
      );
      for (const dx of [-0.014, 0.014])
        add(
          new THREE.BoxGeometry(1, 1, 1),
          mat(0x74bca4),
          sleeves.map((c) => ({
            id: c.id,
            matrix: matrix(c.position[0] + dx, c.position[1] + 0.004, c.position[2], 0.004, 0.012, 0.006),
          })),
        );
      const screens = items.filter((c) => c.type === "Lưới chắn ống tràn");
      const meshMat = mat(0xc6e3d9);
      meshMat.wireframe = true;
      add(
        new THREE.CylinderGeometry(0.02, 0.02, 1, 10, 3, true),
        meshMat,
        screens.map((c) => ({
          id: c.id,
          matrix: matrix(c.position[0], c.position[1] + d.overflowHeight / 2, c.position[2], 1, d.overflowHeight, 1),
        })),
      );
    }
    if (this.layers.has("hộp")) {
      const part = (dx: number, dy: number, dz: number, sx: number, sy: number, sz: number, c: number, rot = 0) =>
        add(
          new THREE.BoxGeometry(1, 1, 1),
          mat(c),
          boxes.map((b) => ({
            id: b.id,
            matrix: matrix(
              b.position[0] + dx,
              b.position[1] + dy,
              b.position[2] + dz * (b.reversed ? -1 : 1),
              sx,
              sy,
              sz,
              rot,
            ),
          })),
        );
      const pitX = d.length * 0.3;
      const floorShape = new THREE.Shape();
      floorShape.moveTo(-d.length / 2, -d.width / 2);
      floorShape.lineTo(d.length / 2, -d.width / 2);
      floorShape.lineTo(d.length / 2, d.width / 2);
      floorShape.lineTo(-d.length / 2, d.width / 2);
      floorShape.closePath();
      const opening = new THREE.Path();
      opening.moveTo(pitX - 0.038, -d.width * 0.25 - 0.038);
      opening.lineTo(pitX - 0.038, -d.width * 0.25 + 0.038);
      opening.lineTo(pitX + 0.038, -d.width * 0.25 + 0.038);
      opening.lineTo(pitX + 0.038, -d.width * 0.25 - 0.038);
      opening.closePath();
      floorShape.holes.push(opening);
      const floorGeometry = new THREE.ShapeGeometry(floorShape);
      floorGeometry.rotateX(-Math.PI / 2);
      floorGeometry.rotateZ(-Math.atan(d.floorSlope));
      const reversedFloor = floorGeometry.clone();
      reversedFloor.scale(1, 1, -1);
      for (const [geometry, reversed] of [
        [floorGeometry, false],
        [reversedFloor, true],
      ] as const)
        add(
          geometry,
          mat(0x252b2d),
          boxes
            .filter((b) => !!b.reversed === reversed)
            .map((b) => ({
              id: b.id,
              matrix: matrix(
                b.position[0],
                b.position[1] + 0.02 + (d.floorSlope * d.length) / 2,
                b.position[2],
                1,
                1,
                1,
              ),
            })),
        );
      // Hai thành bên chia thành các mảng, để trống hai khe chữ U tới mép trên.
      const notchY = Math.max(
        0.002,
        Math.min(
          d.height - 0.045,
          d.overflowHeight - d.availableHead - d.drainHeaderDn / 2000 - rimSlope(d) * (d.length + d.gap),
        ),
      );
      const notchCenters = [-d.width / 2 + 0.08, d.width / 2];
      for (const side of [-1, 1]) {
        if (this.one && side === -1) continue;
        const x = side * (d.length / 2 - 0.008);
        part(x, notchY / 2, 0, 0.016, notchY, d.width, 0x252b2d);
        let start = -d.width / 2;
        for (const center of notchCenters) {
          const end = Math.max(start, Math.min(d.width / 2, center - d.slotWidth / 2));
          if (end > start)
            part(x, (notchY + d.height) / 2, (start + end) / 2, 0.016, d.height - notchY, end - start, 0x252b2d);
          start = Math.min(d.width / 2, center + d.slotWidth / 2);
        }
        if (start < d.width / 2)
          part(
            x,
            (notchY + d.height) / 2,
            (start + d.width / 2) / 2,
            0.016,
            d.height - notchY,
            d.width / 2 - start,
            0x252b2d,
          );
      }
      part(0, notchY / 2, d.width / 2 - 0.008, d.length, notchY, 0.016, 0x252b2d);
      // Cửa là tấm có các lỗ xuyên hình tròn, quay quanh bản lề bên trái.
      const dw = d.length * 0.7,
        dh = d.height * 0.75,
        doorShape = new THREE.Shape();
      doorShape.moveTo(0, 0);
      doorShape.lineTo(dw, 0);
      doorShape.lineTo(dw, dh);
      doorShape.lineTo(0, dh);
      doorShape.closePath();
      if (!this.lowDetail || this.one)
        for (let i = 0; i < 5; i++)
          for (let j = 0; j < 2; j++) {
            const hole = new THREE.Path();
            hole.absarc((dw * (i + 1)) / 6, (dh * (j + 1)) / 3, 0.009, 0, Math.PI * 2, true);
            doorShape.holes.push(hole);
          }
      const angle = this.doorOpen && d.doorStyle === "ban-le" ? -Math.PI * 0.48 : 0;
      if (this.showDoors)
        add(
          new THREE.ShapeGeometry(doorShape, 8),
          mat(d.doorStyle === "ngan-keo" ? 0xf4f5ef : 0xd7b333),
          boxes.map((b) => ({
            id: b.id,
            matrix: new THREE.Matrix4().compose(
              new THREE.Vector3(
                b.position[0] - dw / 2,
                b.position[1] + d.height * 0.125,
                b.position[2] +
                  (b.reversed ? d.width / 2 : -d.width / 2) +
                  (d.doorStyle === "ngan-keo" && this.doorOpen ? (b.reversed ? 0.1 : -0.1) : 0),
              ),
              new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle * (b.reversed ? -1 : 1)),
              new THREE.Vector3(1, 1, 1),
            ),
          })),
        );
      if (this.showDoors) part(-dw / 2, d.height / 2, -d.width / 2, 0.012, dh, 0.02, 0x909a9a);
      if (this.showCodes && this.showDoors && boxes.length) {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
          columns = 8,
          rows = Math.ceil(characters.length / columns),
          atlas = document.createElement("canvas");
        atlas.width = columns * 64;
        atlas.height = rows * 64;
        const ctx = atlas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, atlas.width, atlas.height);
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = "bold 48px sans-serif";
          [...characters].forEach((ch, i) =>
            ctx.fillText(ch, (i % columns) * 64 + 32, Math.floor(i / columns) * 64 + 34),
          );
          const texture = new THREE.CanvasTexture(atlas);
          texture.colorSpace = THREE.SRGBColorSpace;
          this.codeAtlas = texture;
          const codeMatrix = (
            b: Component,
            offset: number,
            width: number,
            height: number,
            depth: number,
            front: number,
          ) => {
            const sign = b.reversed ? 1 : -1,
              rotation = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0),
                angle * (b.reversed ? -1 : 1),
              );
            const origin = new THREE.Vector3(
              b.position[0] - dw / 2,
              b.position[1] + d.height * 0.125,
              b.position[2] + sign * (d.width / 2 + (d.doorStyle === "ngan-keo" && this.doorOpen ? 0.1 : 0)),
            );
            const point = new THREE.Vector3(dw / 2 + offset, d.height * (0.58 - 0.125), sign * front)
              .applyQuaternion(rotation)
              .add(origin);
            return new THREE.Matrix4().compose(point, rotation, new THREE.Vector3(width, height, depth));
          };
          add(
            new THREE.BoxGeometry(1, 1, 1),
            mat(0x10262b),
            boxes.map((b) => ({
              id: b.id,
              matrix: codeMatrix(b, 0, Math.min(d.length * 0.65, 0.18), 0.055, 0.008, 0.008),
            })),
          );
          for (let index = 0; index < characters.length; index++)
            for (const reversed of [false, true]) {
              const glyph = characters[index],
                placements = boxes
                  .filter((b) => Boolean(b.reversed) === reversed)
                  .flatMap((b) =>
                    [...(b.code ?? "")].flatMap((ch, k) =>
                      ch === glyph
                        ? [
                            {
                              id: b.id,
                              matrix: codeMatrix(
                                b,
                                (reversed ? 1 : -1) * (k - ((b.code?.length ?? 1) - 1) / 2) * 0.026,
                                0.026,
                                0.045,
                                1,
                                0.014,
                              ),
                            },
                          ]
                        : [],
                    ),
                  );
              if (!placements.length) continue;
              const geometry = new THREE.PlaneGeometry(1, 1),
                uv = geometry.attributes.uv,
                col = index % columns,
                row = Math.floor(index / columns);
              for (let i = 0; i < uv.count; i++) {
                const u = uv.getX(i),
                  v = uv.getY(i);
                uv.setXY(i, (col + u) / columns, 1 - (row + 1 - v) / rows);
              }
              if (!reversed) geometry.rotateY(Math.PI);
              const material = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false,
                emissive: 0x777777,
              });
              add(geometry, material, placements);
            }
        }
      }
      if (!this.lowDetail || this.one || d.stacking === "xep-chong")
        for (const x of [-0.4, 0.4])
          for (const z of [-0.38, 0.38])
            part(x * d.length, d.height + 0.008, z * d.width, 0.035, 0.016, 0.035, 0x11191a);
      part(pitX, 0.026, d.width * 0.25, 0.075, 0.008, 0.075, 0x10191b);
      if (!this.lowDetail || this.one)
        for (let i = -3; i <= 3; i++) {
          part(pitX + i * 0.01, 0.032, d.width * 0.25, 0.003, 0.005, 0.075, 0x9caaaa);
          part(pitX, 0.032, d.width * 0.25 + i * 0.01, 0.075, 0.005, 0.003, 0x9caaaa);
        }
      if (this.layers.has("nước")) {
        const water = add(
          new THREE.BoxGeometry(1, 1, 1),
          mat(0x44b5d0, !this.lowDetail),
          boxes.map((b) => ({
            id: b.id,
            matrix: matrix(
              b.position[0],
              b.position[1] + (this.lowDetail ? d.overflowHeight : d.overflowHeight / 2),
              b.position[2],
              d.length - 0.03,
              this.lowDetail ? 0.003 : d.overflowHeight,
              d.width - 0.03,
            ),
          })),
        );
        if (this.one && water)
          this.animation.push((t) => {
            const level =
              d.stacking === "xep-chong" && this.flush
                ? d.overflowHeight * Math.max(0.03, 1 - (t % 12) / 9)
                : d.overflowHeight * (0.12 + 0.88 * Math.min(1, (t % 12) / 8));
            boxes.forEach((b, i) =>
              water.setMatrixAt(
                i,
                matrix(b.position[0], b.position[1] + level / 2, b.position[2], d.length - 0.03, level, d.width - 0.03),
              ),
            );
            water.instanceMatrix.needsUpdate = true;
          });
        const drops = add(
          new THREE.SphereGeometry(0.008, 6, 4),
          mat(0x57c9ea),
          boxes.map((b) => ({ id: b.id, matrix: matrix(...b.position, 1, 1, 1) })),
        );
        if (drops)
          this.animation.push((t) => {
            boxes.forEach((b, i) => {
              const phase = (t * (0.7 + d.flow * 0.2) + i * 0.17) % 1;
              const stopped =
                !!this.closedTier &&
                b.rack === this.closedTier.rack &&
                b.tier === this.closedTier.tier &&
                b.block === this.closedTier.block;
              drops.setMatrixAt(
                i,
                matrix(
                  b.position[0],
                  b.position[1] + d.height - 0.02 - phase * (d.height - d.overflowHeight),
                  b.position[2] + (b.reversed ? 1 : -1) * (d.width / 2 - 0.08),
                  stopped ? 0 : 1,
                  stopped ? 0 : 1,
                  stopped ? 0 : 1,
                ),
              );
            });
            drops.instanceMatrix.needsUpdate = true;
          });
        if (this.one) {
          const grains = add(
            new THREE.SphereGeometry(0.007, 6, 4),
            mat(0x7b4c23),
            boxes.flatMap((b) =>
              Array.from({ length: 4 }, () => ({
                id: b.id,
                matrix: matrix(b.position[0], b.position[1] + 0.04, b.position[2], 1, 1, 1),
              })),
            ),
          );
          if (grains)
            this.animation.push((t) => {
              boxes.forEach((b, bi) => {
                for (let i = 0; i < 4; i++) {
                  const p = (t * 0.1 + i * 0.25) % 1;
                  grains.setMatrixAt(
                    bi * 4 + i,
                    matrix(
                      b.position[0] - d.length * 0.35 + p * d.length * 0.65,
                      b.position[1] + 0.04 + (1 - p) * d.floorSlope * d.length,
                      b.position[2] + d.width * 0.25,
                      1,
                      1,
                      1,
                    ),
                  );
                }
              });
              grains.instanceMatrix.needsUpdate = true;
            });
        }
      }
      if (this.one && boxes[0]) {
        const b = boxes[0];
        const addLabel = (caption: string, dx: number, dy: number, dz: number) => {
          const element = document.createElement("div");
          element.className = "design-part-label";
          element.textContent = caption;
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          this.overlay.appendChild(element);
          this.lines.appendChild(line);
          this.labels.push({
            element,
            line,
            point: new THREE.Vector3(b.position[0] + dx, b.position[1] + dy, b.position[2] + dz),
          });
        };
        addLabel("Cấp nước", 0, d.height + 0.07, -d.width / 2 + 0.08);
        addLabel("Xả cặn", d.length * 0.3, d.height + 0.05, d.width / 2);
        addLabel("Hố gom và lưới", d.length * 0.3, 0.06, d.width * 0.25);
        addLabel("Đáy dốc", -d.length * 0.2, 0.04, 0);
        addLabel("Ống tràn", d.length * 0.3, d.overflowHeight + 0.04, d.width / 2 - 0.1);
        addLabel("Cửa và bản lề", 0, d.height / 2, -d.width / 2 - 0.05);
        addLabel("Khoá xếp chồng", -d.length * 0.4, d.height + 0.04, -d.width * 0.38);
      }
    }
    for (const system of [
      "khung",
      "cấp",
      "tràn",
      "xả cặn",
      "ống đứng cấp",
      "ống đứng thoát",
      "ống chính",
      "ống chính trên cao",
      "ống thả",
      "mương",
    ] as System[]) {
      const layer: Layer = system.startsWith("ống") || system === "mương" ? "ống đứng" : (system as Layer);
      if (!this.layers.has(layer)) continue;
      const pipes = items.filter((c) => c.system === system && c.end && c.length && !c.virtual);
      if (system === "mương") {
        const trenchParts = (side: number) =>
          pipes.map((c) => {
            const a = new THREE.Vector3(...c.position),
              b = new THREE.Vector3(...c.end!),
              dx = b.x - a.x,
              dz = b.z - a.z;
            const yaw = -Math.atan2(dz, dx),
              length = Math.hypot(dx, dz),
              mid = a.clone().add(b).multiplyScalar(0.5);
            mid.x += Math.sin(yaw) * side * (d.trenchWidth / 2 - 0.01);
            mid.z += Math.cos(yaw) * side * (d.trenchWidth / 2 - 0.01);
            const height = side === 0 ? 0.02 : d.trenchDepth;
            return {
              id: c.id,
              matrix: new THREE.Matrix4().compose(
                mid,
                new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
                new THREE.Vector3(length, height, side === 0 ? d.trenchWidth : 0.02),
              ),
            };
          });
        for (const side of [-1, 0, 1]) add(new THREE.BoxGeometry(1, 1, 1), mat(0x858986), trenchParts(side));
        if (this.layers.has("nước")) {
          add(new THREE.BoxGeometry(1, 1, 1), mat(0x3c9eb5, true), trenchParts(0));
          const droplets = add(
            new THREE.SphereGeometry(0.018, 6, 4),
            mat(0xaffaff),
            pipes.map((c) => ({ id: c.id, matrix: matrix(...c.position, 1, 1, 1) })),
          );
          if (droplets)
            this.animation.push((t) => {
              pipes.forEach((c, i) => {
                const speed = (c.flow ?? 0) / 60000 / (d.trenchWidth * d.trenchDepth),
                  phase = ((t * speed) / (c.length ?? 1) + i * 0.13) % 1,
                  a = c.position,
                  b = c.end!;
                droplets.setMatrixAt(
                  i,
                  matrix(
                    a[0] + (b[0] - a[0]) * phase,
                    a[1] + (b[1] - a[1]) * phase + 0.015,
                    a[2] + (b[2] - a[2]) * phase,
                    1,
                    1,
                    1,
                  ),
                );
              });
              droplets.instanceMatrix.needsUpdate = true;
            });
        }
        continue;
      }
      const entries = pipes.map((c) => {
        const a = new THREE.Vector3(...c.position),
          b = new THREE.Vector3(...c.end!);
        if (this.exploded) {
          const offset = system === "cấp" ? -0.18 : system === "tràn" ? 0.18 : system === "xả cặn" ? 0.35 : 0.5;
          a.z += offset;
          b.z += offset;
        }
        const mid = a.clone().add(b).multiplyScalar(0.5),
          dir = b.clone().sub(a);
        const radius = system === "khung" ? 0.012 : (c.dn ?? 27) / 2000;
        return {
          id: c.id,
          matrix: new THREE.Matrix4().compose(
            mid,
            new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
            new THREE.Vector3(radius, dir.length(), radius),
          ),
        };
      });
      const systemColor =
        d.plumbing === "ong-tren-cao" && system === "ống đứng thoát"
          ? 0xe9eeee
          : d.plumbing === "ong-tren-cao" && system === "ống đứng cấp"
            ? 0x8d9699
            : color[system];
      const pipeMesh = add(new THREE.CylinderGeometry(1, 1, 1, this.lowDetail ? 5 : 8), mat(systemColor), entries);
      if (pipeMesh && this.one && this.flush && d.stacking === "xep-chong" && system === "tràn") {
        const moving = pipes.flatMap((c, i) => (c.dn === 21 && (c.source || !c.network) ? [i] : []));
        this.animation.push((t) => {
          const lift = (d.overflowHeight + 0.025) * Math.min(1, (t % 12) / 3);
          for (const i of moving) {
            const transform = entries[i].matrix.clone();
            transform.elements[13] += lift;
            pipeMesh.setMatrixAt(i, transform);
          }
          pipeMesh.instanceMatrix.needsUpdate = true;
        });
      }
      if (this.layers.has("nước") && system !== "khung") {
        const flowing = pipes.filter(
          (c) =>
            (c.flow ?? 0) + (this.flush ? (c.flushFlow ?? 0) : 0) > 0 &&
            c.dn &&
            !(
              this.closedTier &&
              c.rack === this.closedTier.rack &&
              c.tier === this.closedTier.tier &&
              c.block === this.closedTier.block &&
              (c.system === "cấp" || c.system === "tràn")
            ),
        );
        const particles = add(
          this.lowDetail ? new THREE.TetrahedronGeometry(0.012) : new THREE.SphereGeometry(0.012, 6, 4),
          mat(0xc9f6ff),
          flowing.map((c) => ({ id: c.id, matrix: matrix(...c.position, 1, 1, 1) })),
        );
        const offset = this.exploded
          ? system === "cấp"
            ? -0.18
            : system === "tràn"
              ? 0.18
              : system === "xả cặn"
                ? 0.35
                : 0.5
          : 0;
        const paths = flowing.map((c) => ({
          a: c.position,
          b: c.end!,
          speed:
            (c.network === "thoát" ? halfPipeVelocity : velocity)(
              (c.flow ?? 0) + (this.flush ? (c.flushFlow ?? 0) : 0),
              c.dn!,
            ) / c.length!,
          radius: (c.dn ?? 27) / 2000 + 0.008,
        }));
        const transform = new THREE.Matrix4();
        if (particles)
          this.animation.push((t) => {
            paths.forEach((path, i) => {
              const p = (t * path.speed + i * 0.137) % 1;
              transform.setPosition(
                path.a[0] + (path.b[0] - path.a[0]) * p,
                path.a[1] + (path.b[1] - path.a[1]) * p + path.radius,
                path.a[2] + (path.b[2] - path.a[2]) * p + offset,
              );
              particles.setMatrixAt(i, transform);
            });
            particles.instanceMatrix.needsUpdate = true;
          });
      }
      const valves = items.filter((c) => c.system === system && c.type.startsWith("Van"));
      add(
        new THREE.BoxGeometry(1, 1, 1),
        mat(system === "ống chính trên cao" ? 0xd63724 : 0xf39220),
        valves.map((c) => ({
          id: c.id,
          matrix: matrix(
            c.position[0],
            c.position[1] + 0.025,
            c.position[2] +
              (this.exploded
                ? system === "cấp"
                  ? -0.18
                  : system === "tràn"
                    ? 0.18
                    : system === "xả cặn"
                      ? 0.35
                      : 0.5
                : 0),
            0.07,
            0.012,
            0.025,
          ),
        })),
      );
      const fittings = items.filter(
        (c) =>
          c.system === system &&
          (["Tê", "Co 90°", "Co 45°", "Nút bịt", "Côn thu", "Lỗ định lượng"].includes(c.type) ||
            c.type.startsWith("Rắc co") ||
            c.type.startsWith("Tê ")),
      );
      add(
        new THREE.SphereGeometry(1, 6, 4),
        mat(color[system]),
        fittings.map((c) => ({
          id: c.id,
          matrix: matrix(
            c.position[0],
            c.position[1],
            c.position[2] +
              (this.exploded
                ? system === "cấp"
                  ? -0.18
                  : system === "tràn"
                    ? 0.18
                    : system === "xả cặn"
                      ? 0.35
                      : 0.5
                : 0),
            (c.dn ?? 12) / 1500,
            (c.dn ?? 12) / 1500,
            (c.dn ?? 12) / 1500,
          ),
        })),
      );
    }
    if (this.assemblyTier !== null) {
      const movingIds = new Set(boxes.filter((b) => b.tier === this.assemblyTier).map((b) => b.id));
      const groups = this.meshes
        .map((mesh) => {
          const ids = mesh.userData.ids as string[];
          return {
            mesh,
            instances: ids.flatMap((id, index) => {
              if (!movingIds.has(id)) return [];
              const original = new THREE.Matrix4();
              mesh.getMatrixAt(index, original);
              return [{ index, original }];
            }),
          };
        })
        .filter((g) => g.instances.length > 0);
      const start = performance.now() / 1000;
      let settled = false;
      this.animation.push((t) => {
        const remaining = Math.max(0, 1 - (t - start) / 1.2);
        if (settled) return;
        for (const group of groups) {
          for (const item of group.instances) {
            const m = item.original.clone();
            m.elements[13] += 0.22 * remaining;
            group.mesh.setMatrixAt(item.index, m);
          }
          group.mesh.instanceMatrix.needsUpdate = true;
        }
        if (!remaining) settled = true;
      });
    }
  }
  private updateLabels() {
    const width = this.canvas.clientWidth,
      height = this.canvas.clientHeight;
    this.lines.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.labels.forEach((label, i) => {
      const left = i % 2 === 0,
        row = Math.floor(i / 2),
        count = Math.ceil(this.labels.length / 2);
      const y = 10 + ((height - 42) * (row + 0.5)) / count;
      label.element.style.left = left ? "4px" : "auto";
      label.element.style.right = left ? "auto" : "4px";
      label.element.style.top = `${y - 10}px`;
      const p = label.point.clone().project(this.camera);
      const px = ((p.x + 1) * width) / 2,
        py = ((1 - p.y) * height) / 2;
      label.line.setAttribute(
        "x1",
        String(
          left
            ? Math.min(width / 2, label.element.offsetWidth + 4)
            : Math.max(width / 2, width - label.element.offsetWidth - 4),
        ),
      );
      label.line.setAttribute("y1", String(y));
      label.line.setAttribute("x2", String(px));
      label.line.setAttribute("y2", String(py));
    });
  }
  overview(includeMain = false) {
    if (!this.design) return;
    const b = new THREE.Box3();
    if (includeMain) b.setFromObject(this.root);
    else {
      const allowed = new Set(
        this.components
          .filter((c) => c.system !== "ống chính" && c.system !== "Phòng lọc" && c.system !== "mương")
          .map((c) => c.id),
      );
      const transform = new THREE.Matrix4();
      for (const mesh of this.meshes) {
        mesh.geometry.computeBoundingBox();
        const geometryBox = mesh.geometry.boundingBox;
        if (!geometryBox) continue;
        const ids = mesh.userData.ids as string[];
        ids.forEach((id, i) => {
          if (!allowed.has(id)) return;
          mesh.getMatrixAt(i, transform);
          b.union(geometryBox.clone().applyMatrix4(transform));
        });
      }
      if (b.isEmpty()) b.setFromObject(this.root);
    }
    if (b.isEmpty()) return;
    if (this.one && this.design.stacking === "xep-chong") b.max.y += this.design.overflowHeight + 0.025;
    const center = b.getCenter(new THREE.Vector3());
    const direction = new THREE.Vector3(1, 0.8, -1).normalize();
    this.controls.target.copy(center);
    this.camera.position.copy(center).add(direction);
    this.camera.lookAt(center);
    this.camera.updateMatrixWorld();
    const inverse = this.camera.quaternion.clone().invert(),
      tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2),
      tanH = tanV * this.camera.aspect;
    let distance = 0;
    for (const x of [b.min.x, b.max.x])
      for (const y of [b.min.y, b.max.y])
        for (const z of [b.min.z, b.max.z]) {
          const p = new THREE.Vector3(x, y, z).sub(center).applyQuaternion(inverse);
          distance = Math.max(distance, p.z + Math.max(Math.abs(p.x) / tanH, Math.abs(p.y) / tanV));
        }
    distance = Math.max(0.1, distance * 1.1);
    this.camera.position.copy(center).addScaledVector(direction, distance);
    this.camera.near = Math.max(0.001, distance / 1000);
    this.camera.far = distance * 20 + 10;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    this.resize.disconnect();
    this.canvas.removeEventListener("click", this.pick);
    this.controls.dispose();
    this.clear();
    this.overlay.remove();
    this.fpsLabel?.remove();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
