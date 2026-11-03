import { describe, expect, it } from "vitest";
import { convertUnit, compatibleUnits } from "./converter";
describe("đổi đơn vị", () => {
  it("đối chiếu khối lượng mol nitrat", () => {
    expect(convertUnit(1, "no3n", "no3", 8, 25, 0)).toBeCloseTo(4.427, 3);
  });
  it("đổi thuận nghịch toàn bộ các cặp đơn vị cùng nhóm", () => {
    for (const from of [
      "tan",
      "nh3n",
      "nh3",
      "nh4n",
      "nh4",
      "no2n",
      "no2",
      "no3n",
      "no3",
      "alk",
      "mmol",
      "dkh",
      "salinity",
      "density",
    ] as const) {
      for (const to of compatibleUnits(from)) {
        const value = from === "density" ? 1.02 : 10;
        const converted = convertUnit(value, from, to, 8, 25, 10);
        expect(convertUnit(converted, to, from, 8, 25, 10)).toBeCloseTo(value, 8);
      }
    }
  });
});
