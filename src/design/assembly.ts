import type { Component, RackDesign } from "./types";
// Trình tự tham khảo: https://www.youtube.com/watch?v=jXCRomdc_o4
// Bố trí trại: https://www.youtube.com/watch?v=jJqlI1b1gA8
export function assemblyCaptions(d: RackDesign): string[] {
  const captions = [d.baseStyle === "gach-soi" ? "Xếp gạch bê tông và lớp sỏi." : "Đổ bệ bê tông."];
  for (let t = 0; t < d.tiers; t++) {
    captions.push(`Hạ tầng hộp ${t + 1} vào vị trí.`);
    captions.push(
      `Lắp ống góp cấp và ${d.outletStyle === "te-ong" ? "tê cùng ống ngắn" : "lỗ định lượng"} của tầng ${t + 1}.`,
    );
  }
  captions.push(
    "Lắp ống đứng cấp và cụm van, rắc co.",
    "Lắp ống tràn, ống đứng thoát và đường về lọc.",
    "Lắp thiết bị phòng lọc.",
    "Gắn cửa hộp và mã ô.",
  );
  return captions;
}
export function assemblyStage(c: Component, d: RackDesign): number {
  const risers = 2 * d.tiers + 1,
    drain = risers + 1;
  if (c.system === "Phòng lọc") return drain + 1;
  if (c.type === "Hộp nuôi") return 1 + 2 * (c.tier ?? 0);
  if (c.system === "khung") return ["Sỏi đệm", "Gạch bê tông", "Bệ bê tông đổ", "Đế kê"].includes(c.type) ? 0 : risers;
  if (c.system === "cấp") {
    if (c.type === "Van chặn tầng" || c.type.startsWith("Rắc co tầng") || c.type === "Côn thu") return risers;
    return c.tier === undefined ? risers : 2 + 2 * c.tier;
  }
  if (c.network === "cấp" || c.system === "ống đứng cấp" || c.system === "ống chính trên cao" || c.system === "ống thả")
    return risers;
  return drain;
}
export function assembledComponents(parts: Component[], d: RackDesign, step: number): Component[] {
  return parts.filter((c) => assemblyStage(c, d) <= step);
}
