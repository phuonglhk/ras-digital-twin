import { defaultParams, describe, steadyState } from "../model/process";
import type { RackDesign } from "./types";
export const dns = [21, 27, 34, 42, 49, 60, 90, 114];
// Đường kính trong giả định từ OD trừ hai lần bề dày ống uPVC PN10; cần xác nhận bảng nhà sản xuất khi mua.
// ISO 1452-2: https://www.iso.org/standard/75825.html
export const inner: Record<number, number> = {
  21: 16.8,
  27: 21.6,
  34: 27.2,
  42: 33.6,
  49: 39.2,
  60: 48,
  90: 72,
  114: 91.2,
};
// Liên tục Q=VA; Q L/phút, đường kính mm, kết quả m/s.
export function velocity(q: number, dn: number): number {
  return q / 60000 / ((Math.PI * (inner[dn] / 1000) ** 2) / 4);
}
// Tiết diện ống nửa đầy bằng một nửa tiết diện tròn: Q = A·v; PPI handbook, Manning.
export function halfPipeVelocity(q: number, dn: number): number {
  return 2 * velocity(q, dn);
}
// Hazen–Williams SI, Q m³/s, D m, L m, C=150 PVC: PPI handbook
// https://plasticpipe.org/common/Uploaded%20files/Technical/PPI%20PEHandbook2022.pdf
export function hazenWilliams(length: number, q: number, diameter: number, c = 150): number {
  return (10.67 * length * q ** 1.852) / (c ** 1.852 * diameter ** 4.8704);
}
// Manning n=0,009 PVC; nửa ống: A=πD²/8, R=D/4. Nguồn PPI handbook trên.
export function gravityCapacity(dn: number, slope: number): number {
  const d = inner[dn] / 1000;
  return ((((Math.PI * d * d) / 8) * (d / 4) ** (2 / 3) * Math.sqrt(slope)) / 0.009) * 60000;
}
export function choosePressureDn(q: number): number {
  return dns.find((d) => velocity(q, d) <= 1.5) ?? 114;
}
export function chooseGravityDn(q: number, slope: number): number {
  return dns.find((d) => gravityCapacity(d, slope) >= q) ?? 114;
}
// Phương trình lỗ q∝√h và tổn thất dọc ống nhiều cửa; quy tắc 10 lần cột áp vận tốc
// là xấp xỉ, không bảo đảm 5% khi ma sát lớn. ASCE: https://doi.org/10.1061/(ASCE)0733-9437(2008)134:3(341)
export function uniformity(length: number, q: number, dn: number, head: number): number {
  const v = velocity(q, dn),
    loss = hazenWilliams(length, q / 60000, inner[dn] / 1000) / 2.85 + (v * v) / (2 * 9.81);
  return 100 / Math.sqrt(1 + loss / Math.max(0.001, head));
}
export function hydraulics(d: RackDesign) {
  const boxes = d.cols * d.tiers * d.racks,
    q = boxes * d.flow,
    span = d.cols * (d.length + d.gap),
    rackQ = d.cols * d.tiers * d.flow;
  const mainDn = choosePressureDn(q),
    riserDn = choosePressureDn(rackQ),
    gravityDn = chooseGravityDn(rackQ, d.slope);
  const height = d.bottomHeight + (d.tiers - 1) * d.tierSpacing + d.height;
  const vh = velocity(d.cols * d.flow, d.headerDn);
  // Tổn thất cục bộ K=2 giả định cho co, tê và van; Darcy–Weisbach h=K v²/2g.
  const loss =
    hazenWilliams(d.filterDistance, q / 60000, inner[mainDn] / 1000) +
    hazenWilliams(height, rackQ / 60000, inner[riserDn] / 1000) +
    hazenWilliams(span, (d.cols * d.flow) / 60000, inner[d.headerDn] / 1000) / 2.85 +
    (2 * vh * vh) / (2 * 9.81);
  // Sea Grant: 3 US gal/phút cho khay 3×8 ft² và sump tối thiểu 5 phút lưu lượng bơm.
  // https://repository.library.noaa.gov/view/noaa/39465/noaa_39465_DS1.pdf
  const minimum = (d.length * d.width * (3 * 3.785411784)) / (3 * 8 * 0.3048 ** 2),
    sump = q * 5;
  const volume = d.length * d.width * d.overflowHeight * 1000,
    turnover = volume / d.flow,
    uniform = uniformity(span, d.cols * d.flow, d.headerDn, d.residualHead);
  const p = defaultParams("mud-crab");
  p.units = boxes;
  p.perUnit = 1;
  p.unitVolume = volume / 1000;
  p.flow = q * 0.06;
  const water = describe(steadyState(p), p);
  const warnings: string[] = [];
  // Manning cho ống góp nửa đầy; xả rửa gián đoạn không cộng vào Q liên tục.
  const headerDn = chooseGravityDn(d.cols * d.flow * (d.layout === "quay lưng" && d.racks > 1 ? 2 : 1), d.slope);
  const headerCapacity = gravityCapacity(headerDn, d.slope),
    flushCapacity = gravityCapacity(34, d.slope);
  const clearance = d.tierSpacing - d.height - (0.025 + d.slope * (span + 0.08) + 0.017);
  if (d.flushEnabled && d.tiers > 1 && clearance < 0)
    warnings.push("Khoảng hở giữa tầng không đủ cho ống thu xả rửa và độ dốc đã chọn.");
  if (d.flushEnabled && d.bottomHeight - 0.025 - d.slope * (span + 0.08) - 0.017 < 0)
    warnings.push("Ống thu xả rửa tầng thấp nhất thấp hơn mặt sàn.");
  if (d.flushEnabled && d.cols * d.flushFlow * (d.layout === "quay lưng" && d.racks > 1 ? 2 : 1) > flushCapacity)
    warnings.push("Lưu lượng xả rửa đồng thời vượt sức tải nửa ống DN34; giảm lưu lượng hoặc xả lần lượt.");
  if (d.flushEnabled && d.bottomHeight - 0.025 - d.slope * (span + 0.08) - 0.002 <= 0)
    warnings.push(
      "Ống thu xả rửa thấp hơn chân ống đứng, đoạn nối sẽ đi lên; cần tăng cao độ tầng thấp nhất hoặc giảm độ dốc/chiều dài.",
    );
  if (d.bottomHeight + d.overflowHeight - 0.02 - d.slope * (span + 0.08) - 0.002 <= 0)
    warnings.push("Ống góp tràn thấp hơn chân ống đứng; cần điều chỉnh cao độ để thoát xuống.");
  if (d.overflowHeight <= 0.02) warnings.push("Ống góp tràn không thấp hơn mực nước trong hộp.");
  if (turnover > 15) warnings.push("Thời gian thay nước vượt 15 phút (ngưỡng minh hoạ).");
  if (uniform < 90) warnings.push("Độ đồng đều dưới 90%: tăng cỡ ống góp, cấp hai đầu hoặc dùng van từng hộp.");
  if (d.flow < minimum) warnings.push("Lưu lượng thấp hơn mức tham khảo theo diện tích của Louisiana Sea Grant.");
  if (velocity(q, mainDn) < 0.6 || velocity(q, mainDn) > 1.5)
    warnings.push("Vận tốc ống chính cấp ngoài khoảng tham khảo 0,6–1,5 m/s.");
  const gv = gravityCapacity(gravityDn, d.slope) / 60000 / ((Math.PI * (inner[gravityDn] / 1000) ** 2) / 8);
  if (gv < 0.6 || gv > 1) warnings.push("Vận tốc tự chảy nửa ống ngoài khoảng tự làm sạch tham khảo 0,6–1 m/s.");
  if (gravityCapacity(gravityDn, d.slope) < rackQ)
    warnings.push("Ống đứng thoát vượt khả năng nửa ống tính theo Manning.");
  return {
    boxes,
    q,
    minimum,
    sump,
    volume,
    turnover,
    uniform,
    mainDn,
    riserDn,
    gravityDn,
    height,
    loss,
    pumpHead: height + loss + d.residualHead,
    water,
    warnings,
    gravityVelocity: gv,
    headerDn,
    headerCapacity,
    flushCapacity,
    clearance,
  };
}
