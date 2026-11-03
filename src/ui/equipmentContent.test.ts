import { describe, expect, it } from "vitest";
import { equipment } from "./catalog";
import { equipmentContent } from "./equipmentContent";

describe("nội dung thiết bị", () => {
  it("có từ ba đến năm đoạn riêng cho từng thiết bị", () => {
    const paragraphs: string[] = [];
    for (const item of equipment) {
      const content = equipmentContent[item.id];
      expect(content.principles.length).toBeGreaterThanOrEqual(3);
      expect(content.principles.length).toBeLessThanOrEqual(5);
      paragraphs.push(...content.principles);
    }
    expect(new Set(paragraphs).size).toBe(paragraphs.length);
  });
  it("mọi thông số có nguồn tài liệu", () => {
    for (const item of equipment) {
      expect(equipmentContent[item.id].parameters.length).toBeGreaterThan(0);
      for (const row of equipmentContent[item.id].parameters) {
        expect(row.source.trim()).not.toBe("");
        expect(row.source).not.toContain("T1");
        expect(row.url).toMatch(/^https:\/\//);
      }
    }
  });
});
