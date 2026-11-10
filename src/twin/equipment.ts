/*
 * Giao diện chung của thiết bị trong cảnh 3D và điểm xuất các hàm dựng thiết bị.
 * Mọi thiết bị dựng theo chuẩn mô hình 3D (docs/chuan-mo-hinh-3d.md): đơn vị mét, gốc toạ độ ở tâm đáy.
 */
import * as THREE from "three";

export interface Equipment {
  group: THREE.Group;
  inlet: THREE.Vector3; // toạ độ cục bộ
  outlet: THREE.Vector3;
  height: number;
  water?: THREE.Mesh; // khối nước để tô màu theo chất lượng
  lamp: THREE.Mesh;
  animate?: (time: number, running: boolean) => void;
}

/** Gắn nhãn theo tên bộ phận. Mỗi nhãn ứng với một hoặc nhiều nhóm có tên. */
export function labelEquipmentByName(equipment: Equipment, labels: string[], names: string[][]): Equipment {
  names.forEach((group, index) => {
    for (const name of group) {
      const part = equipment.group.getObjectByName(name);
      if (part) part.userData.part = labels[index];
    }
  });
  return equipment;
}

export { oxygenCone, pump, skimmer, uvReactor } from "./devices";
export { CRAB_BOX, crabBoxes, crabRack } from "./devicesCulture";
export { blower, degasser, denitrification, drumFilter, mbbr, roundTank } from "./devicesProcess";
