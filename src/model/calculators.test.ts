import { describe, expect, it } from "vitest";
import { calculate } from "./calculators";

describe("máy tính nhanh", () => {
  const cases: [string, Record<string, number>, number][] = [
    ["loc-trong", { load: 10, eff: 75 }, 7.5],
    ["tach-dam", { q: 10, branch: 20 }, 2],
    ["mbbr", { load: 1000, temp: 25, salt: 0, ssa: 500 }, 1000 / (0.58 * 1.09 ** 15)],
    ["thap-khu-co2", { q: 10, gl: 8 }, 80],
    ["bom-tuan-hoan", { q: 3600, head: 10, eff: 100 }, 98.1],
    ["den-uv", { q: 10, dose: 40, uvt: 100 }, 12],
    ["con-oxy", { q: 10, input: 6, output: 10 }, 0.96],
    ["khu-nitrat", { q: 10, input: 50, output: 10 }, 23.712],
    ["may-thoi-khi", { q: 3600, pressure: 30, eff: 100 }, 30],
    ["ho-nuoi-cua", { count: 100, volume: 0.02 }, 2],
    ["be-tron", { diameter: 2, depth: 1 }, Math.PI],
    ["nh3-tu-do", { tan: 1, ph: 8.02, temp: 12, salt: 0 }, 2.23],
    ["doi-don-vi", { value: 10, factor: 3 }, 30],
    ["tai-thuc-an", { biomass: 100, feed: 2, protein: 35 }, 0.0644],
    ["dong-chay", { volume: 10, turnover: 1.5 }, 15],
  ];
  it.each(cases)("%s cho kết quả đối chiếu", (id, v, expected) => {
    expect(calculate(id, v)[0].value).toBeCloseTo(expected, id === "nh3-tu-do" ? 1 : 3);
  });
  it("giá trị Emerson 1975: NH₃ ở pH 8,02 và 12 °C xấp xỉ 2,23%", () => {
    expect(calculate("nh3-tu-do", { tan: 1, ph: 8.02, temp: 12, salt: 0 })[0].value).toBeCloseTo(2.23, 1);
  });
});

it("ozone dùng các hiệu suất nhánh của mô hình xử lý", () => {
  const off = calculate("tach-dam", { q: 10, branch: 100, dom: 10, no2: 2, ozone: 0 });
  const on = calculate("tach-dam", { q: 10, branch: 100, dom: 10, no2: 2, ozone: 1 });
  expect(off[1].value).toBeCloseTo(6);
  expect(on[1].value).toBeCloseTo(3);
  expect(off[2].value).toBeCloseTo(0);
  expect(on[2].value).toBeCloseTo(0.4);
});
