/*
 * Sân khấu dùng chung cho các cảnh 3D: môi trường phản xạ, ánh sáng, sàn (docs/chuan-mo-hinh-3d.md).
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { PBR } from "./materials";

/** Môi trường phản xạ cho vật liệu PBR. Người gọi tự dispose texture trả về. */
export function createEnvironment(renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.04).texture;
  room.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  pmrem.dispose();
  return texture;
}

/** Thiết lập kết xuất chung: sRGB, ACES, bóng mềm. */
export function configureRenderer(renderer: THREE.WebGLRenderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

/** Đèn và sàn cho cảnh xem một thiết bị; radius là bán kính vùng cần chiếu (m). */
export function addStage(scene: THREE.Scene, radius = 2) {
  scene.background = new THREE.Color(0x0f1d24);
  scene.add(new THREE.HemisphereLight(0xdff2f8, 0x1c2a2e, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(radius * 1.2, radius * 2.6, radius * 1.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, {
    left: -radius * 1.5,
    right: radius * 1.5,
    top: radius * 1.5,
    bottom: -radius * 1.5,
    near: 0.1,
    far: radius * 8,
  });
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(radius * 3, 48), PBR.concrete);
  floor.name = "san";
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(Math.ceil(radius * 4), Math.ceil(radius * 4), 0x2a4048, 0x1f3239);
  grid.position.y = 0.002;
  scene.add(grid);
}
