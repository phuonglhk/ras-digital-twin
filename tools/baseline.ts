import { writeFileSync } from "node:fs";
import { runCases } from "../src/model/selftest";

writeFileSync(new URL("../src/model/baseline.json", import.meta.url), JSON.stringify(runCases(), null, 2) + "\n");
console.log("Đã ghi bảng chuẩn mô hình.");
