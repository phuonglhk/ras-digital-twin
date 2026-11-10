import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  blower,
  crabRack,
  degasser,
  denitrification,
  drumFilter,
  labelEquipmentByName,
  mbbr,
  oxygenCone,
  pump,
  roundTank,
  skimmer,
  uvReactor,
  type Equipment,
} from "../twin/equipment";
import { addStage, configureRenderer, createEnvironment } from "../twin/stage";
import type { Entry } from "./catalog";

function build(entry: Entry): Equipment {
  switch (entry.id) {
    case "loc-trong":
      return drumFilter("high");
    case "tach-dam":
      return skimmer("high");
    case "mbbr":
      return mbbr(0.5, "high");
    case "thap-khu-co2":
      return degasser("high");
    case "bom-tuan-hoan":
      return pump("high");
    case "den-uv":
      return uvReactor("high");
    case "con-oxy":
      return oxygenCone("high");
    case "khu-nitrat":
      return denitrification("high");
    case "may-thoi-khi":
      return blower("high");
    case "ho-nuoi-cua":
      return crabRack("high");
    case "be-tron":
      return roundTank(4, "high");
    default:
      return pump("high");
  }
}
function make(entry: Entry): Equipment {
  // Nhãn tra theo tên bộ phận (docs/chuan-mo-hinh-3d.md), theo đúng thứ tự `parts` trong catalog.
  const names: Record<string, string[][]> = {
    "loc-trong": [["luoi-loc"], ["phun-rua"], ["mang-can"], ["dong-co"]],
    "tach-dam": [["cot-tiep-xuc", "cua-vao", "cua-ra"], ["coc-bot"], ["cap-khi"]],
    mbbr: [["gia-the"], ["be-phan-ung", "cua-vao", "cua-ra", "luoi-chan"], ["ong-khi"]],
    "thap-khu-co2": [["lop-dem", "than-thap"], ["quat"], ["be-day"]],
    "khu-nitrat": [["be-phan-ung", "cua-vao", "cua-ra"], ["may-khuay"], ["cap-cacbon"]],
    "may-thoi-khi": [["dong-co"], ["buong-nen"], ["duong-khi-ra"]],
    "be-tron": [["thanh-be", "cua-vao"], ["ong-dung"], ["nuoc"]],
    "ho-nuoi-cua": [["hop-cua"], ["de-ke"], ["ong-cap"], ["ong-thu"]],
    "bom-tuan-hoan": [["than-bom", "dong-ho"], ["truc-bom"], ["dong-co"]],
    "den-uv": [["buong-chieu"], ["den-uv"], ["tu-dien", "cam-bien"]],
    "con-oxy": [["con-tiep-xuc", "cua-vao", "dong-ho"], ["binh-oxy", "duong-oxy"], ["duong-ra"]],
  };
  return labelEquipmentByName(build(entry), entry.parts, names[entry.id] ?? []);
}
function setup(entry: Entry) {
  const scene = new THREE.Scene();
  const eq = make(entry);
  scene.add(eq.group);
  eq.lamp.removeFromParent();
  const bounds = new THREE.Box3().setFromObject(eq.group),
    center = bounds.getCenter(new THREE.Vector3()),
    radius = Math.max(bounds.getSize(new THREE.Vector3()).length() / 2, 0.4);
  addStage(scene, radius);
  // Camera bao trọn thiết bị: khoảng cách theo bán kính khung bao và góc nhìn.
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
  const distance = (radius / Math.sin(THREE.MathUtils.degToRad(20))) * 1.08;
  camera.position.copy(center).add(new THREE.Vector3(1, 0.55, 1).normalize().multiplyScalar(distance));
  camera.lookAt(center);
  return { scene, eq, camera, center };
}
function materialsOf(root: THREE.Object3D) {
  const found = new Set<THREE.Material>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m: THREE.Material) => found.add(m));
    }
  });
  return found;
}
function dispose(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Points) o.geometry.dispose();
  });
  for (const m of materialsOf(scene)) {
    m.clippingPlanes = null; // vật liệu dùng chung: trả về trạng thái không cắt lớp
    m.dispose();
  }
  scene.environment?.dispose();
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
    Promise.resolve()
      .then(() => {
        if (dead || !canvas.current) return;
        const host = canvas.current,
          el = document.createElement("canvas");
        host.appendChild(el);
        el.setAttribute("aria-label", `Mô hình 3D ${entry.name}. Kéo để xoay, cuộn để phóng to.`);
        const { scene, eq, camera, center } = setup(entry);
        const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true });
        renderer.localClippingEnabled = true;
        configureRenderer(renderer);
        scene.environment = createEnvironment(renderer);
        const materials = materialsOf(eq.group);
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
          // Một nhãn có thể gồm nhiều bộ phận: khung chọn bao tất cả.
          highlight.box.makeEmpty();
          eq.group.traverse((object) => {
            if (object.userData.part === name) highlight.box.union(new THREE.Box3().setFromObject(object));
          });
          highlight.visible = !highlight.box.isEmpty();
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
          // Chỉ cắt thiết bị, không cắt sàn.
          const planes = cutRef.current ? [plane] : null;
          for (const m of materials) m.clippingPlanes = planes;
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
    Promise.resolve()
      .then(() => {
        if (dead) return;
        const scenes = entries
          .filter((entry) => !thumbnails.has(entry.id))
          .map((entry) => ({
            entry,
            ...setup(entry),
          }));
        if (!dead && scenes.some(({ entry }) => !thumbnails.has(entry.id))) {
          const canvas = document.createElement("canvas");
          const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
          renderer.setSize(320, 180);
          configureRenderer(renderer);
          const environment = createEnvironment(renderer);
          for (const { entry, scene, eq, camera } of scenes) {
            if (thumbnails.has(entry.id)) continue;
            camera.aspect = 320 / 180;
            camera.updateProjectionMatrix();
            eq.animate?.(1, true);
            scene.environment = environment;
            renderer.render(scene, camera);
            scene.environment = null;
            thumbnails.set(entry.id, canvas.toDataURL());
          }
          environment.dispose();
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
