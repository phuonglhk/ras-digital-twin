import { useMemo } from "react";
import baseline from "../model/baseline.json";
import { metrics, runCases, tolerances, type Baseline, type Metric } from "../model/selftest";
import { fmt } from "./format";

const labels: Record<Metric, string> = {
  tan: "TAN (mg/L)",
  no2: "NO₂⁻ (mg/L)",
  no3: "NO₃⁻ (mg/L)",
  do: "DO (mg/L)",
  co2: "CO₂ (mg/L)",
  ph: "pH",
  nh3: "NH₃ tự do (µg/L)",
  omega: "Ω canxit",
};

export default function SelfTest() {
  const expected: Baseline = baseline;
  const current = useMemo(runCases, []);
  return (
    <section className="panel selftest">
      <h2>Tự kiểm mô hình</h2>
      <p>So sánh với bảng chuẩn; dung sai là độ lệch tuyệt đối tối đa.</p>
      <div className="selftest-scroll">
        <table>
          <thead>
            <tr>
              <th>Ca</th>
              <th>Chỉ số</th>
              <th>Giá trị chuẩn</th>
              <th>Hiện tại</th>
              <th>Độ lệch</th>
              <th>Dung sai</th>
              <th>Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(expected).flatMap((name) =>
              metrics.map((metric) => {
                const delta = Math.abs((current[name]?.[metric] ?? NaN) - expected[name][metric]);
                return (
                  <tr key={`${name}-${metric}`}>
                    <td>{name}</td>
                    <td>{labels[metric]}</td>
                    <td>{fmt(expected[name][metric], 5)}</td>
                    <td>{fmt(current[name]?.[metric] ?? NaN, 5)}</td>
                    <td>{fmt(delta, 5)}</td>
                    <td>{fmt(tolerances[metric], 5)}</td>
                    <td>{Number.isFinite(delta) && delta <= tolerances[metric] ? "ĐẠT" : "LỆCH"}</td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
