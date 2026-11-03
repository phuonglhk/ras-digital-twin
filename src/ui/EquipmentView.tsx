import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  AssetKit,
  blower,
  crabRack,
  degasser,
  denitrification,
  drumFilter,
  labelEquipmentParts,
  mbbr,
  oxygenCone,
  pump,
  roundTank,
  skimmer,
  uvReactor,
  type Equipment,
} from "../twin/equipment";
import type { BbLibrary } from "../twin/bbmodel";
import type { Entry } from "./catalog";

function build(entry: Entry, kit: AssetKit): Equipment {
  switch (entry.id) {
    case "loc-trong":
      return drumFilter(kit);
    case "tach-dam":
      return skimmer();
    case "mbbr":
      return mbbr(kit, 0.5);
    case "thap-khu-co2":
      return degasser();
    case "bom-tuan-hoan":
      return pump(kit);
    case "den-uv":
      return uvReactor();
    case "con-oxy":
      return oxygenCone();
    case "khu-nitrat":
      return denitrification(kit);
    case "may-thoi-khi":
      return blower();
    case "ho-nuoi-cua":
      return crabRack(kit);
    case "be-tron": {
      const eq = roundTank(4);
      eq.animate = (t, on) => {
        if (eq.water) eq.water.position.y = eq.water.scale.y / 2 + (on ? 0.015 * Math.sin(t * 2) : 0);
      };
      return eq;
    }
    default:
      return pump(kit);
  }
}
function make(entry: Entry, kit: AssetKit): Equipment {
  const indexes: Record<string, number[][]> = {
    "loc-trong": [[1], [3], [4], [5]],
    "tach-dam": [[1], [2, 3], [0]],
    mbbr: [[3], [0, 1], [4]],
    "thap-khu-co2": [[2, 3, 4, 5], [7], [0]],
    "bom-tuan-hoan": [[0], [1], [2]],
    "den-uv": [[2], [3], [4]],
    "con-oxy": [[0], [2, 3], [1]],
    "khu-nitrat": [[0, 1], [2], [3, 4]],
    "may-thoi-khi": [[1], [2], [3]],
    "ho-nuoi-cua": [[1], [0], [2]],
    "be-tron": [[0, 1, 2], [4], [3]],
  };
  return labelEquipmentParts(build(entry, kit), entry.parts, indexes[entry.id]);
}
function setup(entry: Entry, library: BbLibrary) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x142832);
  scene.add(new THREE.HemisphereLight(0xdff6ff, 0x4a4b39, 2));
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(3, 6, 5);
  scene.add(light);
  const eq = make(entry, new AssetKit(library));
  scene.add(eq.group);
  eq.lamp.visible = false;
  const bounds = new THREE.Box3().setFromObject(eq.group),
    center = bounds.getCenter(new THREE.Vector3()),
    size = bounds.getSize(new THREE.Vector3());
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
  const distance = Math.max(size.x, size.y, size.z, 1) * 2.6;
  camera.position.copy(center).add(new THREE.Vector3(distance, distance * 0.7, distance));
  camera.lookAt(center);
  return { scene, eq, camera, center };
}
function dispose(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose());
    }
  });
  renderer.dispose();
  renderer.forceContextLoss();
}
export function EquipmentView({ entry }: { entry: Entry }) {
  const canvas = useRef<HTMLDivElement>(null);
  const [cut, setCut] = useState(false);
  const cutRef = useRef(false);
  cutRef.current = cut;
  const [part, setPart] = useState(entry.parts[0]);
  const selectRef = useRef<(name: string) => void>(() => {});
  useEffect(() => {
    let dead = false,
      cleanup = () => {};
    fetch("/models.json")
      .then((r) => r.json())
      .then((library: BbLibrary) => {
        if (dead || !canvas.current) return;
        const host = canvas.current,
          el = document.createElement("canvas");
        host.appendChild(el);
        el.setAttribute("aria-label", `Mô hình 3D ${entry.name}. Kéo để xoay, cuộn để phóng to.`);
        const { scene, eq, camera, center } = setup(entry, library);
        const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true });
        renderer.localClippingEnabled = true;
        const controls = new OrbitControls(camera, el);
        controls.target.copy(center);
        controls.enableDamping = true;
        controls.update();
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
        const ray = new THREE.Raycaster(),
          pointer = new THREE.Vector2();
        let frame = 0;
        const highlight = new THREE.Box3Helper(new THREE.Box3(), 0xffbd59);
        scene.add(highlight);
        const select = (name: string) => {
          let target: THREE.Object3D | undefined;
          eq.group.traverse((object) => {
            if (!target && object.userData.part === name) target = object;
          });
          if (target) {
            highlight.box.setFromObject(target);
            highlight.visible = true;
          } else highlight.visible = false;
          setPart(name);
        };
        selectRef.current = select;
        select(entry.parts[0]);
        const click = (e: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
          ray.setFromCamera(pointer, camera);
          const hits = ray.intersectObject(eq.group, true);
          for (const hit of hits) {
            let object: THREE.Object3D | null = hit.object;
            while (object && object !== eq.group) {
              if (object.userData.part) {
                select(object.userData.part as string);
                return;
              }
              object = object.parent;
            }
          }
        };
        el.addEventListener("pointerup", click);
        const draw = (t: number) => {
          const w = el.clientWidth,
            h = el.clientHeight;
          if (el.width !== Math.floor(w * devicePixelRatio) || el.height !== Math.floor(h * devicePixelRatio)) {
            renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
          }
          renderer.clippingPlanes = cutRef.current ? [plane] : [];
          eq.animate?.(t / 1000, true);
          if (!eq.animate) eq.group.rotation.y = 0.12 * Math.sin(t / 1000);
          controls.update();
          renderer.render(scene, camera);
          frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
        cleanup = () => {
          cancelAnimationFrame(frame);
          el.removeEventListener("pointerup", click);
          controls.dispose();
          dispose(scene, renderer);
          el.remove();
        };
      })
      .catch(() => setPart("Không tải được mô hình 3D."));
    return () => {
      dead = true;
      cleanup();
    };
  }, [entry]);
  return (
    <>
      <div className="equipment-view">
        <div className="equipment-canvas-host" ref={canvas} />
        <button onClick={() => setCut(!cut)}>{cut ? "Bỏ cắt lớp" : "Cắt lớp"}</button>
      </div>
      <p className="part" aria-live="polite">
        <strong>Bộ phận:</strong> {part}
      </p>
      <div className="part-list">
        {entry.parts.map((p) => (
          <button key={p} onClick={() => selectRef.current(p)}>
            {p.split(":")[0]}
          </button>
        ))}
      </div>
    </>
  );
}
const thumbnails = new Map<string, string>();
export function useThumbnails(entries: Entry[]) {
  const [images, setImages] = useState<Record<string, string>>(() => Object.fromEntries(thumbnails));
  useEffect(() => {
    let dead = false;
    if (entries.every((e) => thumbnails.has(e.id))) return;
    fetch("/models.json")
      .then((response) => response.json())
      .then(async (library: BbLibrary) => {
        if (dead) return;
        const scenes = entries
          .filter((entry) => !thumbnails.has(entry.id))
          .map((entry) => ({
            entry,
            ...setup(entry, library),
          }));
        const loading: Promise<void>[] = [];
        for (const { scene } of scenes) {
          scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
              if (material instanceof THREE.MeshLambertMaterial && material.map?.userData.ready) {
                loading.push(material.map.userData.ready as Promise<void>);
              }
            }
          });
        }
        await Promise.all(loading);
        if (!dead && scenes.some(({ entry }) => !thumbnails.has(entry.id))) {
          const canvas = document.createElement("canvas");
          const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
          renderer.setSize(320, 180);
          for (const { entry, scene, eq, camera } of scenes) {
            if (thumbnails.has(entry.id)) continue;
            camera.aspect = 320 / 180;
            camera.updateProjectionMatrix();
            eq.animate?.(1, true);
            renderer.render(scene, camera);
            thumbnails.set(entry.id, canvas.toDataURL());
          }
          renderer.dispose();
          renderer.forceContextLoss();
        }
        for (const { scene } of scenes) {
          scene.traverse((object) => {
            if (object instanceof THREE.Mesh || object instanceof THREE.Points) object.geometry.dispose();
          });
        }
        if (!dead) setImages(Object.fromEntries(thumbnails));
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [entries]);
  return images;
}
