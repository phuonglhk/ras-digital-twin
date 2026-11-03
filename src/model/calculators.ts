import { biofilterKinetics, defaultParams, describe, loads, makeupWater, passChain, stripCO2 } from "./process";
import { freeAmmoniaFraction, solvePH } from "./chemistry";

export type Values = Record<string, number>;
export interface Result {
  label: string;
  value: number;
  unit: string;
  formula: string;
  source: string;
}
const result = (label: string, value: number, unit: string, formula: string, source: string): Result => ({
  label,
  value,
  unit,
  formula,
  source,
});
const mass = "Cân bằng khối lượng; Timmons & Ebeling (2010)";
export function calculate(id: string, v: Values): Result[] {
  const q = v.q ?? 10,
    p = defaultParams();
  switch (id) {
    case "loc-trong":
      return [
        result("Cặn giữ lại", ((v.load ?? 10) * (v.eff ?? 75)) / 100, "kg/ngày", "Tải TSS × hiệu suất", mass),
        result("Nước rửa ngược", q * 24 * 0.004, "m³/ngày", "Q × 24 × 0,004", "Giả định thiết kế T1: 0,4% lưu lượng"),
      ];
    case "tach-dam": {
      p.skimmer.bypass = (v.branch ?? 20) / 100;
      p.skimmer.ozone = !!v.ozone;
      const input = { ...makeupWater(p), dom: v.dom ?? 10, no2: v.no2 ?? 2 };
      const output = passChain(input, p).find((step) => step.id === "skimmer")!.out;
      return [
        result("Lưu lượng nhánh", q * p.skimmer.bypass, "m³/giờ", "Q × tỉ lệ nhánh", "Cân bằng lưu lượng"),
        result(
          "DOM đầu ra",
          output.dom,
          "mg COD/L",
          "DOM vào × [1 − tỉ lệ nhánh × hiệu suất]",
          "Giả định mô hình T1: 40% hoặc 70% khi có ozone",
        ),
        result(
          "NO₂⁻-N bị ôxy hoá",
          input.no2 - output.no2,
          "mg N/L",
          "NO₂-N vào × tỉ lệ nhánh × 20% khi có ozone",
          "Giả định mô hình T1",
        ),
      ];
    }
    case "mbbr": {
      p.temp = v.temp ?? 25;
      p.salinity = v.salt ?? 0;
      p.biofilter.ssa = v.ssa ?? 500;
      p.biofilter.media = 1;
      const rate = biofilterKinetics(p, 1, 24).rate;
      const area = (v.load ?? 1000) / Math.max(rate, 0.001),
        volume = area / p.biofilter.ssa;
      return [
        result(
          "Diện tích giá thể",
          area,
          "m²",
          "Tải TAN / tốc độ bề mặt tại TAN 1 mg/L",
          "Rusten và cộng sự (2006); động học T1",
        ),
        result("Thể tích giá thể", volume, "m³", "Diện tích / diện tích riêng", "Rusten và cộng sự (2006)"),
        result(
          "Gió khuấy tối thiểu",
          10 * volume,
          "m³/giờ",
          "5 × thể tích bể; bể = giá thể / 0,5",
          "Giả định khuấy trộn T1",
        ),
      ];
    }
    case "thap-khu-co2": {
      const gl = v.gl ?? 8,
        co2 = v.co2 ?? 20;
      p.temp = v.temp ?? 25;
      p.salinity = v.salt ?? 0;
      const w = { ...makeupWater(p), co2, alk: v.alk ?? 120 };
      stripCO2(w, co2 * Math.min(0.9, 0.2 + 0.09 * gl), p);
      return [
        result("Lưu lượng gió", q * gl, "m³/giờ", "Q × G:L", "Cân bằng lưu lượng"),
        result(
          "CO₂ sau tháp",
          w.co2,
          "mg/L",
          "Giảm DIC theo hiệu suất, giữ kiềm",
          "Dickson và cộng sự (2007); mô hình T1",
        ),
        result(
          "pH sau tháp",
          solvePH(w.alk, w.co2, p.temp, p.salinity),
          "",
          "Cân bằng carbonat tại kiềm và CO₂ sau tháp",
          "Dickson và cộng sự (2007); mô hình T1",
        ),
      ];
    }
    case "bom-tuan-hoan": {
      const power = (((1000 * 9.81 * q) / 3600) * (v.head ?? 7)) / Math.max((v.eff ?? 60) / 100, 0.01) / 1000;
      return [
        result("Công suất trục", power, "kW", "ρgQH / η", "Phương trình công suất thuỷ lực"),
        result("Điện năng mỗi năm", power * 8760, "kWh/năm", "Công suất × 8.760 giờ", "Giả định chạy liên tục"),
      ];
    }
    case "den-uv": {
      // q40 là giả định kiểu catalogue tại 30 mJ/cm², UVT 90%; 90/UVT chỉ là hiệu chỉnh gần đúng.
      // UVT, lưu lượng và hình học buồng ảnh hưởng liều; đối chiếu thiết bị đã kiểm định:
      // https://www.ontario.ca/page/ultraviolet-disinfection-technical-bulletin
      const lamps = Math.ceil(
        (q * ((v.dose ?? 40) / 30) * (90 / Math.max(v.uvt ?? 90, 1))) / Math.max(v.q40 ?? 2.5, 0.01),
      );
      return [
        result(
          "Số đèn ước tính",
          lamps,
          "đèn 40 W",
          "Làm tròn lên [Q × (liều / 30) × (90 / UVT) / q40]",
          "q40 giả định kiểu catalogue tại 30 mJ/cm² và UVT 90%; 90/UVT gần đúng, cần đối chiếu nhà cung cấp",
        ),
      ];
    }
    case "con-oxy": {
      const input = v.input ?? 6,
        output = v.output ?? 10;
      p.temp = v.temp ?? 25;
      p.salinity = v.salt ?? 0;
      const w = { ...makeupWater(p), do: output };
      return [
        result(
          "Ôxy hoà tan bổ sung",
          (q * 24 * Math.max(0, output - input)) / 1000,
          "kg/ngày",
          "Q × 24 × (DO ra − DO vào) / 1.000",
          mass,
        ),
        result(
          "TGP đầu ra ước tính",
          describe(w, p).tgp,
          "%",
          "100 × [1 + 0,2095 × (DO / DO bão hoà − 1)]",
          "Định luật Dalton; Benson & Krause (1984); giả định khí khác bão hoà",
        ),
      ];
    }
    case "khu-nitrat": {
      const removed = (q * 24 * Math.max(0, (v.input ?? 50) - (v.output ?? 10))) / 1000;
      return [
        result("Methanol", removed * 2.47, "kg/ngày", "NO₃-N khử × 2,47", "Timmons & Ebeling (2010); tỉ lượng T1"),
        result(
          "Kiềm hồi lại",
          removed * 3.57,
          "kg CaCO₃/ngày",
          "NO₃-N khử × 3,57",
          "Timmons & Ebeling (2010); tỉ lượng T1",
        ),
      ];
    }
    case "may-thoi-khi":
      return [
        result(
          "Công suất khí lý tưởng",
          (q * (v.pressure ?? 30)) / 3600 / Math.max((v.eff ?? 60) / 100, 0.01),
          "kW",
          "Q × ΔP / (3.600 × η)",
          "Công suất lưu chất; xấp xỉ không nén",
        ),
      ];
    case "ho-nuoi-cua":
      return [
        result(
          "Thể tích nuôi",
          (v.count ?? 100) * (v.volume ?? 0.02),
          "m³",
          "Số hộp × thể tích mỗi hộp",
          "Hình học; giả định thể tích hữu dụng",
        ),
      ];
    case "be-tron":
      return [
        result(
          "Thể tích nuôi",
          ((Math.PI * (v.diameter ?? 3) ** 2) / 4) * (v.depth ?? 1),
          "m³",
          "π × đường kính² / 4 × mực nước",
          "Hình học hình trụ",
        ),
      ];
    case "nh3-tu-do": {
      const tan = v.tan ?? 1,
        f = freeAmmoniaFraction(v.ph ?? 8, v.temp ?? 25, v.salt ?? 0);
      return [
        result(
          "NH₃ tự do",
          100 * f,
          "% TAN",
          "100 / (1 + 10^(pKa − pH))",
          "Emerson và cộng sự (1975); Khoo và cộng sự (1977)",
        ),
        result("NH₃-N", tan * f, "mg N/L", "TAN × phần NH₃", "Emerson và cộng sự (1975)"),
        result("NH₄⁺-N", tan * (1 - f), "mg N/L", "TAN − NH₃-N", "Cân bằng nitơ"),
      ];
    }
    case "doi-don-vi": {
      const x = v.value ?? 1;
      const factor = v.factor ?? 1;
      return [
        result(
          "Giá trị quy đổi",
          x * factor,
          "",
          "Giá trị × hệ số",
          "Khối lượng mol: N 14,007; NH₃ 17,031; NH₄ 18,039; NO₂ 46,005; NO₃ 62,004; CaCO₃ 100,09 g/mol",
        ),
      ];
    }
    case "tai-thuc-an": {
      p.units = 1;
      p.perUnit = 1;
      p.avgWeight = (v.biomass ?? 100) * 1000;
      p.feedRate = v.feed ?? 2;
      p.protein = (v.protein ?? 35) / 100;
      const l = loads(p);
      return (
        [
          ["TAN", l.tan],
          ["TSS", l.tss],
          ["Ôxy", l.o2],
          ["CO₂", l.co2],
        ] as const
      ).flatMap(([label, n]) => [
        result(
          label + " mỗi ngày",
          n / 1000,
          "kg/ngày",
          "Tải theo thức ăn và hệ số loài",
          "Timmons & Ebeling (2010); mô hình T1",
        ),
        result(
          label + " giờ cao điểm",
          ((n / 1000) * (v.peak ?? 1.5)) / 24,
          "kg/giờ",
          "Tải ngày / 24 × hệ số cao điểm",
          "Giả định hệ số cao điểm T1",
        ),
      ]);
    }
    case "dong-chay": {
      const flow = (v.volume ?? 10) * (v.turnover ?? 1.5),
        diameter = (v.diameter ?? 100) / 1000;
      return [
        result("Lưu lượng tuần hoàn", flow, "m³/giờ", "Thể tích × số vòng/giờ", "Cân bằng thể tích"),
        result(
          "Vận tốc trong ống",
          q / 3600 / ((Math.PI * diameter ** 2) / 4),
          "m/giây",
          "Q / diện tích tiết diện",
          "Liên tục dòng chảy; tham khảo GB 50013",
        ),
      ];
    }
    default:
      return [];
  }
}
