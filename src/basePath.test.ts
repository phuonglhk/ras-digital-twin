import { describe, expect, it } from "vitest";
import { prefixBase, stripBase } from "./basePath";

describe("đường dẫn gốc", () => {
  it.each(["/", "/quy-trinh", "/thiet-ke", "/thiet-bi", "/thiet-bi/den-uv", "/cong-cu/nh3-tu-do", "/gioi-thieu"])(
    "thêm và bỏ tiền tố cho %s",
    (route) => {
      expect(stripBase(prefixBase(route, "/ras-digital-twin/"), "/ras-digital-twin/")).toBe(route);
      expect(stripBase(prefixBase(route, "/"), "/")).toBe(route);
    },
  );
  it("giữ truy vấn, neo và không cắt tiền tố trùng một phần", () => {
    expect(prefixBase("/quy-trinh?selftest=1#bang", "/ras-digital-twin/")).toBe(
      "/ras-digital-twin/quy-trinh?selftest=1#bang",
    );
    expect(stripBase("/ras-digital-twin", "/ras-digital-twin/")).toBe("/");
    expect(stripBase("/ras-digital-twin-khac/quy-trinh", "/ras-digital-twin/")).toBe(
      "/ras-digital-twin-khac/quy-trinh",
    );
  });
});
