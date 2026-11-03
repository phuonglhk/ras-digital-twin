import { expect, it } from "vitest";
import baseline from "./baseline.json";
import { metrics, runCases, tolerances, type Baseline } from "./selftest";

it("các ca cố định khớp bảng chuẩn", () => {
  const current = runCases();
  const expected: Baseline = baseline;
  expect(Object.keys(current)).toEqual(Object.keys(expected));
  for (const name of Object.keys(expected)) {
    for (const metric of metrics) {
      expect(Math.abs(current[name][metric] - expected[name][metric]), `${name}: ${metric}`).toBeLessThanOrEqual(
        tolerances[metric],
      );
    }
  }
});
