import { defaultParams, describe, steadyState } from "../model/process";
import { blocks, floorArea, rimSlope, rowSpan, tierPitch, type RackDesign } from "./types";
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
/** Manning kênh chữ nhật: Q=A R^(2/3) √S/n; bê tông trát n=0,013.
 * USGS: https://pubs.usgs.gov/sir/2006/5108/pdf/sir20065108.pdf */
export function trenchCapacity(width: number, depth: number, slope: number): number {
  const area = width * depth,
    radius = area / (width + 2 * depth);
  return ((area * radius ** (2 / 3) * Math.sqrt(slope)) / 0.013) * 60000;
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
/** Ống góp đầy: Hazen–Williams C=150 và tổn thất tê K=0,6 giả định cho mỗi tê trên nửa tuyến.
 * Nguồn công thức và C: https://plasticpipe.org/common/Uploaded%20files/Technical/PPI%20PEHandbook2022.pdf
 * Lưu lượng đầu nửa tuyến dùng cho cả chiều dài là ước tính bảo thủ. */
export function fullFlowLoss(length: number, flowM3s: number, diameter: number, c = 150, localK = 0): number {
  const v = flowM3s / ((Math.PI * diameter * diameter) / 4);
  return hazenWilliams(length, flowM3s, diameter, c) + (localK * v * v) / (2 * 9.81);
}
export function fullHeaderLoss(dn: number, length: number, flowLpm: number, tees: number): number {
  return fullFlowLoss(length, flowLpm / 60000, inner[dn] / 1000, 150, tees * 0.6);
}
/** Tổn thất cộng từng đoạn sau mỗi cửa; khi xả một hộp, giả định bất lợi là
 * toàn bộ lưu lượng bổ sung đi về một đầu. K tê 0,6 và K van/rắc co 0,2 là giả định.
 * Công thức Hazen–Williams và h=Kv²/2g: PPI handbook dẫn ở trên. */
export function distributedHeaderLoss(
  dn: number,
  step: number,
  columns: number,
  boxesPerColumn: number,
  flowPerBox: number,
  extra: number,
  connector: number,
): number {
  let loss = 0,
    q = 0;
  for (let i = 0; i < columns; i++) {
    q += boxesPerColumn * flowPerBox + (i === 0 ? extra : 0);
    const v = velocity(q, dn);
    loss += hazenWilliams(step, q / 60000, inner[dn] / 1000) + (boxesPerColumn * 0.6 * v * v) / (2 * 9.81);
  }
  const v = velocity(q, dn);
  return loss + hazenWilliams(connector, q / 60000, inner[dn] / 1000) + (0.2 * v * v) / (2 * 9.81);
}
export function hydraulics(d: RackDesign) {
  const boxes = d.cols * d.tiers * d.racks,
    q = boxes * d.flow,
    maxBlock = Math.max(...blocks(d).map((b) => b.cols)),
    span = maxBlock * (d.length + d.gap);
  const supplyCols = d.supplyEnds === "hai" ? Math.ceil(maxBlock / 2) : maxBlock;
  const drainGroup = d.layout === "quay lưng" && d.racks > 1 ? 2 : 1;
  const drainCols = d.stacking === "xep-chong" && d.drainEnds === "hai" ? Math.ceil(maxBlock / 2) : maxBlock;
  const riserFlow = (d.plumbing === "ong-tren-cao" ? Math.min(d.dropEvery, maxBlock) : supplyCols) * d.tiers * d.flow,
    drainRiserFlow = drainCols * drainGroup * d.tiers * d.flow;
  const mainDn = choosePressureDn(q),
    riserDn = d.plumbing === "ong-tren-cao" ? d.headerDn : choosePressureDn(riserFlow),
    gravityDn = chooseGravityDn(drainRiserFlow, d.slope);
  const height = d.bottomHeight + (d.tiers - 1) * tierPitch(d) + d.height;
  const vh = velocity(supplyCols * d.flow, d.headerDn);
  // Tổn thất tê tại nhánh: K=0,3 là giả định sơ bộ; Darcy–Weisbach h=Kv²/(2g).
  const outletLoss = d.outletStyle === "te-ong" ? (0.3 * vh * vh) / (2 * 9.81) : 0;
  // Tổn thất cục bộ K=2 giả định cho co, tê và van; Darcy–Weisbach h=K v²/2g.
  const loss =
    hazenWilliams(
      d.filterDistance + (d.plumbing === "ong-tren-cao" ? rowSpan(d) * d.racks : 0),
      q / 60000,
      inner[mainDn] / 1000,
    ) +
    hazenWilliams(height, riserFlow / 60000, inner[riserDn] / 1000) +
    hazenWilliams(span / (d.supplyEnds === "hai" ? 2 : 1), (supplyCols * d.flow) / 60000, inner[d.headerDn] / 1000) /
      2.85 +
    (2 * vh * vh) / (2 * 9.81) +
    outletLoss;
  // Sea Grant: 3 US gal/phút cho khay 3×8 ft² và sump tối thiểu 5 phút lưu lượng bơm.
  // https://repository.library.noaa.gov/view/noaa/39465/noaa_39465_DS1.pdf
  const minimum = (d.length * d.width * (3 * 3.785411784)) / (3 * 8 * 0.3048 ** 2),
    sump = q * 5;
  // Lỗ khoan: q=C_d A √(2gh), C_d=0,62 giả định cho lỗ sắc cạnh; ISO 5167-2.
  const orificeArea = (Math.PI * (d.orificeDiameter / 1000) ** 2) / 4;
  const orificeHead = (d.flow / 60000 / (0.62 * orificeArea)) ** 2 / (2 * 9.81);
  const volume = d.length * d.width * d.overflowHeight * 1000,
    turnover = volume / d.flow,
    uniform =
      d.plumbing === "ong-tren-cao"
        ? uniformity(rowSpan(d) * d.racks, q, mainDn, d.residualHead)
        : uniformity(
            span / (d.supplyEnds === "hai" ? 2 : 1),
            supplyCols * d.flow,
            d.headerDn,
            d.outletStyle === "lo-khoan" ? orificeHead : d.residualHead,
          );
  const p = defaultParams("mud-crab");
  p.units = boxes;
  p.perUnit = 1;
  p.unitVolume = volume / 1000;
  p.flow = q * 0.06;
  const water = describe(steadyState(p), p);
  const warnings: string[] = [];
  if (d.outletStyle === "lo-khoan" && orificeHead > d.residualHead)
    warnings.push(
      "Cột áp dư nhỏ hơn cột áp cần qua lỗ định lượng; tăng áp cấp, tăng đường kính lỗ hoặc giảm lưu lượng mỗi hộp.",
    );
  // Manning cho ống góp nửa đầy; xả rửa gián đoạn không cộng vào Q liên tục.
  const perHeader = maxBlock * (d.layout === "quay lưng" && d.racks > 1 ? 2 : 1);
  const headerDn = d.stacking === "xep-chong" ? d.drainHeaderDn : chooseGravityDn(perHeader * d.flow, d.slope);
  const headerSlope = rimSlope(d);
  const ends = d.stacking === "xep-chong" && d.drainEnds === "hai" ? 2 : 1;
  const flushRequired = volume / d.drainDownMinutes + Math.max(0, perHeader - 1) * d.flow;
  const sideCols = ends === 2 ? Math.ceil(maxBlock / 2) : maxBlock;
  const groupCount = d.layout === "quay lưng" && d.racks > 1 ? 2 : 1;
  const boxesPerColumn = ends === 2 && maxBlock === 1 ? groupCount / 2 : groupCount;
  const step = d.length + d.gap + 0.08 / sideCols,
    connector = Math.abs(d.width - 0.105);
  const continuousHead = distributedHeaderLoss(headerDn, step, sideCols, boxesPerColumn, d.flow, 0, connector);
  const extra = (volume / d.drainDownMinutes - d.flow) * (ends === 2 && maxBlock === 1 ? 0.5 : 1);
  const flushHead = distributedHeaderLoss(
    headerDn,
    step,
    sideCols,
    boxesPerColumn,
    d.flow,
    Math.max(0, extra),
    connector,
  );
  let lo = 0,
    hi = 10000;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (
      distributedHeaderLoss(headerDn, step, sideCols, boxesPerColumn, mid / perHeader, 0, connector) <= d.availableHead
    )
      lo = mid;
    else hi = mid;
  }
  const headerCapacity = d.stacking === "xep-chong" ? lo : gravityCapacity(headerDn, headerSlope),
    flushCapacity = gravityCapacity(34, d.slope);
  const bottomLoad = d.boxWeight === null ? null : (d.tiers - 1) * (d.boxWeight + volume + d.crabWeight);
  const area = floorArea(d);
  const clearance = d.tierSpacing - d.height - (0.025 + d.slope * (span + 0.08) + 0.017);
  const tierHeight = Math.max(0, (d.tiers - 1) * tierPitch(d));
  const dropperLoss = hazenWilliams(tierHeight, riserFlow / 60000, inner[riserDn] / 1000) / 2.85;
  const bottomHead = Math.max(0.001, d.residualHead + tierHeight - dropperLoss);
  const tierDifference = 1 - Math.sqrt(Math.min(d.residualHead, bottomHead) / Math.max(d.residualHead, bottomHead));
  const trenchFlow = trenchCapacity(d.trenchWidth, d.trenchDepth, d.slope);
  if (d.stacking === "xep-chong") {
    if (height > d.maxStackHeight)
      warnings.push(
        `Chiều cao ${height.toFixed(2)} m vượt giới hạn giả định ${d.maxStackHeight.toFixed(2)} m; cần xác nhận với nhà sản xuất.`,
      );
    if (d.boxWeight === null) warnings.push("Nhập khối lượng hộp để tính tải lên hộp đáy.");
    if (d.headerDn / 1000 > d.slotWidth || d.drainHeaderDn / 1000 > d.slotWidth)
      warnings.push("Đường kính ngoài ống góp lớn hơn bề rộng rãnh; cần chọn ống nhỏ hơn hoặc rãnh rộng hơn.");
    if (continuousHead > d.availableHead)
      warnings.push(
        "Ống góp tràn vượt cột áp khả dụng khi chảy liên tục; giảm số cột mỗi khối, tăng chênh cao, mở rộng rãnh cho DN42 hoặc giảm lưu lượng.",
      );
    if (flushHead > d.availableHead)
      warnings.push(
        "Ống góp tràn vượt cột áp khả dụng khi xả một hộp; giảm số cột mỗi khối, tăng chênh cao, mở rộng rãnh cho DN42 hoặc giảm lưu lượng.",
      );
    if (d.overflowHeight + Math.max(0, flushHead - d.availableHead) > d.height - d.freeboard)
      warnings.push("Mực nước khi xả một hộp vượt cao độ dự phòng mép hộp.");
    if (d.overflowHeight - d.availableHead - d.drainHeaderDn / 2000 <= 0)
      warnings.push("Không đủ cao độ đặt ống góp tràn trong thành hộp và dưới mực nước.");
    if (d.availableHead <= 0.012 + Math.abs(d.width - 0.105) * d.slope + 0.002)
      warnings.push("Chênh cao cửa ra không đủ để nối nhánh tràn dốc xuống ống góp và ống đứng.");
  }
  if (d.plumbing === "ong-tren-cao" && tierDifference > 0.1)
    warnings.push("Chênh lệch lưu lượng giữa tầng trên và dưới vượt 10%; cân nhắc lỗ định lượng.");
  if (d.plumbing === "ong-tren-cao" && q > trenchFlow)
    warnings.push("Mương sàn không đủ sức tải lưu lượng tuần hoàn theo Manning.");
  if (d.plumbing === "ong-tren-cao" && blocks(d).length > 1) {
    const dropsPerSide = Math.ceil(Math.ceil(maxBlock / d.dropEvery) / 2);
    const requiredGap = 2 * (0.025 + Math.max(0, dropsPerSide - 1) * (d.headerDn / 1000 + 0.008) + d.headerDn / 2000);
    if (d.blockGap < requiredGap)
      warnings.push(
        `Khe giữa khối cần ít nhất ${requiredGap.toFixed(2)} m để bố trí các ống thả; tăng khe hoặc dùng một ống cho hai cột.`,
      );
  }
  if (d.stacking === "gia-do" && d.flushEnabled && d.tiers > 1 && clearance < 0)
    warnings.push("Khoảng hở giữa tầng không đủ cho ống thu xả rửa và độ dốc đã chọn.");
  if (d.stacking === "gia-do" && d.flushEnabled && d.bottomHeight - 0.025 - d.slope * (span + 0.08) - 0.017 < 0)
    warnings.push("Ống thu xả rửa tầng thấp nhất thấp hơn mặt sàn.");
  if (
    d.stacking === "gia-do" &&
    d.flushEnabled &&
    d.cols * d.flushFlow * (d.layout === "quay lưng" && d.racks > 1 ? 2 : 1) > flushCapacity
  )
    warnings.push("Lưu lượng xả rửa đồng thời vượt sức tải nửa ống DN34; giảm lưu lượng hoặc xả lần lượt.");
  if (d.stacking === "gia-do" && d.flushEnabled && d.bottomHeight - 0.025 - d.slope * (span + 0.08) - 0.002 <= 0)
    warnings.push(
      "Ống thu xả rửa thấp hơn chân ống đứng, đoạn nối sẽ đi lên; cần tăng cao độ tầng thấp nhất hoặc giảm độ dốc/chiều dài.",
    );
  if (d.bottomHeight + d.overflowHeight - 0.02 - headerSlope * (span + 0.08) - 0.002 <= 0)
    warnings.push("Ống góp tràn thấp hơn chân ống đứng; cần điều chỉnh cao độ để thoát xuống.");
  if (d.overflowHeight <= 0.02) warnings.push("Ống góp tràn không thấp hơn mực nước trong hộp.");
  if (turnover > 15) warnings.push("Thời gian thay nước vượt 15 phút (ngưỡng minh hoạ).");
  if (uniform < 90) warnings.push("Độ đồng đều dưới 90%: tăng cỡ ống góp, cấp hai đầu hoặc dùng van từng hộp.");
  if (d.flow < minimum) warnings.push("Lưu lượng thấp hơn mức tham khảo theo diện tích của Louisiana Sea Grant.");
  if (velocity(q, mainDn) < 0.6 || velocity(q, mainDn) > 1.5)
    warnings.push("Vận tốc ống chính cấp ngoài khoảng tham khảo 0,6–1,5 m/s.");
  const gv = gravityCapacity(gravityDn, d.slope) / 60000 / ((Math.PI * (inner[gravityDn] / 1000) ** 2) / 8);
  if (gv < 0.6 || gv > 1) warnings.push("Vận tốc tự chảy nửa ống ngoài khoảng tự làm sạch tham khảo 0,6–1 m/s.");
  if (gravityCapacity(gravityDn, d.slope) < drainRiserFlow)
    warnings.push("Ống đứng thoát vượt khả năng nửa ống tính theo Manning.");
  if (d.plumbing !== "ong-tren-cao" && gravityCapacity(chooseGravityDn(q, d.slope), d.slope) < q)
    warnings.push(
      "Ống chính thoát vượt khả năng nửa ống DN114; cần thiết kế nhiều tuyến hoặc tăng kích thước theo nhà cung cấp.",
    );
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
    bottomLoad,
    area,
    flushRequired,
    headerSlope,
    continuousHead,
    flushHead,
    maxBlock,
    tierDifference,
    trenchFlow,
  };
}
