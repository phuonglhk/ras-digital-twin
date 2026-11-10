/*
 * Bảng vật liệu PBR dùng chung cho mọi mô hình thiết bị (xem docs/chuan-mo-hinh-3d.md).
 * Thiết bị không tự tạo vật liệu rời, trừ vật liệu phát sáng có hoạt cảnh.
 */
import * as THREE from "three";

const std = (color: number, metalness: number, roughness: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

export const PBR = {
  /** Inox 304/316 xước nhẹ. */
  inox: std(0xc5ccd0, 1, 0.34),
  /** Thép sơn xanh công nghiệp (thân máy, bệ). */
  steelBlue: std(0x2a5f8e, 0.35, 0.5),
  /** Thép sơn xám (khung, chân đỡ, tủ điện). */
  steelGrey: std(0x6f7b82, 0.4, 0.55),
  /** Thép sơn vàng cảnh báo (chắn khớp nối). */
  steelYellow: std(0xe0a81c, 0.3, 0.55, { side: THREE.DoubleSide }),
  /** Gang đúc (buồng bơm, thân máy thổi). */
  castIron: std(0x39464e, 0.6, 0.62),
  /** Nhôm tản nhiệt (thân động cơ). */
  aluminium: std(0x9fa9ae, 0.85, 0.45),
  /** uPVC xám. */
  pvc: std(0x868f94, 0, 0.6),
  /** uPVC/PP trắng đục. */
  pp: std(0xe6eae6, 0, 0.55),
  /** HDPE đen, cao su. */
  black: std(0x1c2124, 0, 0.75),
  /** FRP xanh nhạt. */
  frp: std(0x7fb2b5, 0, 0.65),
  /** Acrylic/kính trong. */
  clear: std(0xd4eef6, 0, 0.08, { transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
  /** Đồng thau (van, đầu nối). */
  brass: std(0xb8923a, 1, 0.38),
  /** Tay van đỏ. */
  red: std(0xc5362c, 0.1, 0.5),
  /** Bình ôxy (xanh da trời theo thông lệ Việt Nam). */
  oxygen: std(0x3f8fd0, 0.5, 0.45),
  /** Ống mềm ôxy. */
  oxygenLine: std(0x3f9a5a, 0, 0.6),
  /** Mặt đồng hồ, biển tên. */
  white: std(0xf4f5f2, 0, 0.5),
  /** Màn hình tủ điện. */
  screen: std(0x0d1a1f, 0.2, 0.25),
  /** Bọt tách đạm. */
  foam: std(0xf1ead2, 0, 0.9),
  /** Bê tông sàn. */
  concrete: std(0x1b2a30, 0, 0.95),
};

export type PbrName = keyof typeof PBR;

/** Vật liệu thuộc bảng dùng chung hay không (dùng trong test). */
export function isShared(material: THREE.Material) {
  return (Object.values(PBR) as THREE.Material[]).includes(material);
}

/** Nước: tô màu theo chất lượng nước nên mỗi khối nước có vật liệu riêng. */
export function waterMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x4fb7e6,
    transparent: true,
    opacity: 0.6,
    roughness: 0.08,
    metalness: 0,
    clearcoat: 0.6,
    depthWrite: false,
  });
}

/** Vật liệu phát sáng có hoạt cảnh (đèn UV, đèn báo). */
export function glowMaterial(color: number) {
  return new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: 0, roughness: 0.4 });
}
