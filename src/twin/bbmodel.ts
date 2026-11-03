/*
 * Đọc model khối Blockbench (đã rút gọn bởi tools/import-bbmodel.mjs) thành geometry three.js.
 * Mỗi texture một BufferGeometry; trả về danh sách { geometry, material } để dựng Mesh hoặc InstancedMesh.
 * Tỉ lệ: 16 đơn vị Blockbench = 1 m.
 */
import * as THREE from "three";

export interface BbCube {
  from: number[];
  to: number[];
  inflate: number;
  rotation: number[] | null;
  origin: number[];
  faces: Record<string, { uv: number[]; texture: number; rotation: number }>;
}
export interface BbModel {
  resolution: { width: number; height: number };
  textures: string[];
  cubes: BbCube[];
}
export type BbLibrary = Record<string, BbModel>;

export interface Part {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshLambertMaterial;
}

type V3 = [number, number, number];

// Bốn góc mỗi mặt theo thứ tự trên-trái, trên-phải, dưới-phải, dưới-trái khi nhìn từ ngoài vào.
const FACE: Record<string, { normal: V3; corners: (a: number[], b: number[]) => V3[] }> = {
  north: {
    normal: [0, 0, -1],
    corners: (a, b) => [
      [b[0], b[1], a[2]],
      [a[0], b[1], a[2]],
      [a[0], a[1], a[2]],
      [b[0], a[1], a[2]],
    ],
  },
  south: {
    normal: [0, 0, 1],
    corners: (a, b) => [
      [a[0], b[1], b[2]],
      [b[0], b[1], b[2]],
      [b[0], a[1], b[2]],
      [a[0], a[1], b[2]],
    ],
  },
  east: {
    normal: [1, 0, 0],
    corners: (a, b) => [
      [b[0], b[1], b[2]],
      [b[0], b[1], a[2]],
      [b[0], a[1], a[2]],
      [b[0], a[1], b[2]],
    ],
  },
  west: {
    normal: [-1, 0, 0],
    corners: (a, b) => [
      [a[0], b[1], a[2]],
      [a[0], b[1], b[2]],
      [a[0], a[1], b[2]],
      [a[0], a[1], a[2]],
    ],
  },
  up: {
    normal: [0, 1, 0],
    corners: (a, b) => [
      [a[0], b[1], a[2]],
      [b[0], b[1], a[2]],
      [b[0], b[1], b[2]],
      [a[0], b[1], b[2]],
    ],
  },
  down: {
    normal: [0, -1, 0],
    corners: (a, b) => [
      [a[0], a[1], b[2]],
      [b[0], a[1], b[2]],
      [b[0], a[1], a[2]],
      [a[0], a[1], a[2]],
    ],
  },
};

const textureCache = new Map<string, THREE.Texture>();
function pixelTexture(src: string) {
  let tex = textureCache.get(src);
  if (!tex) {
    let finish!: () => void;
    const ready = new Promise<void>((resolve) => {
      finish = resolve;
    });
    tex = new THREE.TextureLoader().load(src, finish, undefined, finish);
    tex.userData.ready = ready;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;
    textureCache.set(src, tex);
  }
  return tex;
}

export function buildParts(model: BbModel): Part[] {
  const W = model.resolution.width || 16;
  const H = model.resolution.height || 16;
  const buckets = model.textures.map(() => ({
    pos: [] as number[],
    nrm: [] as number[],
    uv: [] as number[],
    idx: [] as number[],
  }));
  const scale = 1 / 16;

  for (const cube of model.cubes) {
    const a = cube.from.map((v) => (v - cube.inflate) * scale);
    const b = cube.to.map((v) => (v + cube.inflate) * scale);
    let m: THREE.Matrix4 | null = null;
    if (cube.rotation) {
      const o = cube.origin.map((v) => v * scale);
      const r = cube.rotation.map(THREE.MathUtils.degToRad);
      m = new THREE.Matrix4()
        .makeTranslation(o[0], o[1], o[2])
        .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(r[0], r[1], r[2], "XYZ")))
        .multiply(new THREE.Matrix4().makeTranslation(-o[0], -o[1], -o[2]));
    }

    for (const [name, f] of Object.entries(cube.faces)) {
      const spec = FACE[name];
      const bucket = buckets[f.texture];
      if (!spec || !bucket) continue;
      const base = bucket.pos.length / 3;
      const uv: [number, number][] = [
        [f.uv[0] / W, f.uv[1] / H],
        [f.uv[2] / W, f.uv[1] / H],
        [f.uv[2] / W, f.uv[3] / H],
        [f.uv[0] / W, f.uv[3] / H],
      ];
      for (let k = 0; k < (f.rotation / 90) % 4; k++) uv.unshift(uv.pop()!);
      const n = new THREE.Vector3(...spec.normal);
      if (m) n.transformDirection(m);
      spec.corners(a, b).forEach((c, k) => {
        const v = new THREE.Vector3(...c);
        if (m) v.applyMatrix4(m);
        bucket.pos.push(v.x, v.y, v.z);
        bucket.nrm.push(n.x, n.y, n.z);
        bucket.uv.push(uv[k][0], uv[k][1]);
      });
      bucket.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  }

  return buckets.flatMap((bk, i) => {
    if (!bk.idx.length) return [];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(bk.pos, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(bk.nrm, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(bk.uv, 2));
    geometry.setIndex(bk.idx);
    geometry.computeBoundingBox();
    return [{ geometry, material: new THREE.MeshLambertMaterial({ map: pixelTexture(model.textures[i]) }) }];
  });
}

export function modelGroup(parts: Part[]): THREE.Group {
  const g = new THREE.Group();
  for (const p of parts) {
    const mesh = new THREE.Mesh(p.geometry, p.material);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
  }
  return g;
}

/** Kích thước hộp bao của một model (m). */
export function partsSize(parts: Part[]) {
  const box = new THREE.Box3();
  for (const p of parts) box.union(p.geometry.boundingBox!);
  return box.getSize(new THREE.Vector3());
}
