import type { Values } from "../model/calculators";
export interface Field {
  key: string;
  label: string;
  value: number;
  min?: number;
}
export interface Entry {
  id: string;
  name: string;
  group: string;
  unit: string;
  description: string;
  fields: Field[];
  parts: string[];
}
const f = (key: string, label: string, value: number, min = 0): Field => ({ key, label, value, min });
const q = f("q", "Lưu lượng nước (m³/giờ)", 10),
  temp = f("temp", "Nhiệt độ (°C)", 25),
  salt = f("salt", "Độ mặn (‰)", 0),
  eff = f("eff", "Hiệu suất (%)", 60);
export const equipment: Entry[] = [
  {
    id: "loc-trong",
    name: "Lọc trống RDF",
    group: "Cơ học",
    unit: "rdf",
    description: "Lưới lọc giữ chất rắn trước khi nước đi vào xử lý sinh học.",
    fields: [f("load", "Tải TSS (kg/ngày)", 10), f("eff", "Hiệu suất giữ cặn (%)", 75), q],
    parts: [
      "Lưới lọc 60 µm: giữ cặn lơ lửng",
      "Ống phun rửa: làm sạch lưới",
      "Máng gom cặn: đưa cặn ra ngoài",
      "Động cơ: quay trống",
    ],
  },
  {
    id: "tach-dam",
    name: "Thiết bị tách đạm",
    group: "Cơ học",
    unit: "skimmer",
    description: "Bọt khí kéo các chất hữu cơ hoạt động bề mặt lên cốc thu.",
    fields: [
      q,
      f("branch", "Tỉ lệ nhánh (%)", 20),
      f("dom", "DOM đầu vào (mg COD/L)", 10),
      f("no2", "NO₂⁻-N đầu vào (mg N/L)", 2),
    ],
    parts: ["Cột tiếp xúc: tạo tiếp xúc giữa nước và khí", "Cốc bọt: thu chất hữu cơ", "Đầu cấp khí: tạo bọt mịn"],
  },
  {
    id: "mbbr",
    name: "Bể vi sinh MBBR",
    group: "Sinh học",
    unit: "biofilter",
    description: "Màng vi sinh trên giá thể chuyển hoá amoni và nitrit.",
    fields: [f("load", "Tải TAN (g N/ngày)", 1000), temp, salt, f("ssa", "Diện tích riêng K1/K3/K5 (m²/m³)", 500)],
    parts: ["Giá thể: mang màng vi sinh", "Bể phản ứng: chứa nước và giá thể", "Ống khí: khuấy trộn và cấp ôxy"],
  },
  {
    id: "thap-khu-co2",
    name: "Tháp khử CO₂",
    group: "Khí",
    unit: "degasser",
    description: "Nước tiếp xúc không khí qua lớp đệm để giải phóng CO₂.",
    fields: [
      q,
      f("gl", "Tỉ lệ khí : nước", 8),
      f("co2", "CO₂ đầu vào (mg/L)", 20),
      f("alk", "Kiềm (mg/L CaCO₃)", 120),
      temp,
      salt,
    ],
    parts: ["Lớp đệm: tăng diện tích tiếp xúc", "Quạt: đưa không khí qua tháp", "Bể đáy: thu nước sau xử lý"],
  },
  {
    id: "bom-tuan-hoan",
    name: "Bơm tuần hoàn",
    group: "Vận chuyển nước",
    unit: "pump",
    description: "Bơm tạo lưu lượng và cột áp đưa nước qua tuyến.",
    fields: [q, f("head", "Cột áp (m)", 7), eff],
    parts: ["Thân bơm: dẫn nước", "Trục bơm: truyền chuyển động", "Động cơ: cấp công suất"],
  },
  {
    id: "den-uv",
    name: "Đèn UV",
    group: "Khử trùng",
    unit: "uv",
    description: "Bức xạ UV xử lý vi sinh vật trong dòng nước.",
    fields: [q, f("dose", "Liều UV (mJ/cm²)", 40), f("uvt", "Độ truyền UVT (%)", 90)],
    parts: ["Buồng chiếu: chứa dòng nước", "Đèn UV: phát bức xạ", "Tủ điện: cấp nguồn"],
  },
  {
    id: "con-oxy",
    name: "Côn ôxy",
    group: "Khí",
    unit: "oxygen",
    description: "Khí ôxy tiếp xúc nước trong côn để tăng ôxy hoà tan.",
    fields: [q, f("input", "DO vào (mg/L)", 6), f("output", "DO ra (mg/L)", 10), temp, salt],
    parts: ["Côn tiếp xúc: hoà tan ôxy", "Bình ôxy: cấp khí", "Đường ra: dẫn nước về bể"],
  },
  {
    id: "khu-nitrat",
    name: "Bể khử nitrat",
    group: "Sinh học",
    unit: "denit",
    description: "Vi sinh thiếu khí chuyển nitrat thành khí nitơ.",
    fields: [q, f("input", "NO₃⁻-N vào (mg/L)", 50), f("output", "NO₃⁻-N ra (mg/L)", 10)],
    parts: [
      "Bể phản ứng: tạo môi trường thiếu khí",
      "Máy khuấy: giữ đều nước trong bể",
      "Đường cấp cacbon: nuôi vi sinh",
    ],
  },
  {
    id: "may-thoi-khi",
    name: "Máy thổi khí",
    group: "Khí",
    unit: "biofilter",
    description: "Máy thổi cấp khí cho bể vi sinh và các thiết bị tiếp xúc.",
    fields: [f("q", "Lưu lượng khí (m³/giờ)", 100), f("pressure", "Chênh áp (kPa)", 30), eff],
    parts: ["Động cơ: truyền công suất", "Buồng nén: tăng áp khí", "Đường khí ra: dẫn khí đến bể"],
  },
  {
    id: "ho-nuoi-cua",
    name: "Kệ hộp nuôi cua",
    group: "Nuôi",
    unit: "culture",
    description: "Các hộp riêng giữ cua tách biệt và nhận nước tuần hoàn.",
    fields: [f("count", "Số hộp", 100), f("volume", "Thể tích hữu dụng mỗi hộp (m³)", 0.02)],
    parts: ["Hộp cua: giữ từng cá thể", "Khung kệ: đỡ các tầng hộp", "Ống thu nước: đưa nước về xử lý"],
  },
  {
    id: "be-tron",
    name: "Bể tròn cá và tôm",
    group: "Nuôi",
    unit: "culture",
    description: "Bể tròn tạo dòng xoáy giúp thu gom cặn về giữa.",
    fields: [f("diameter", "Đường kính (m)", 3), f("depth", "Mực nước (m)", 1)],
    parts: ["Thành bể: giữ nước", "Ống đứng: thu và điều chỉnh mực nước", "Nước nuôi: môi trường sống"],
  },
];
export const tools: Entry[] = [
  {
    id: "nh3-tu-do",
    name: "Amoniac tự do",
    group: "Công cụ",
    unit: "",
    description: "Tính phần amoniac không ion hoá theo điều kiện nước.",
    fields: [f("tan", "TAN (mg N/L)", 1), f("ph", "pH", 8), temp, salt],
    parts: [],
  },
  {
    id: "doi-don-vi",
    name: "Đổi đơn vị nước",
    group: "Công cụ",
    unit: "",
    description: "Quy đổi nồng độ theo nitơ, ion và độ kiềm.",
    fields: [f("value", "Giá trị đầu vào", 1), f("ph", "pH", 8), temp, salt],
    parts: [],
  },
  {
    id: "tai-thuc-an",
    name: "Tải từ thức ăn",
    group: "Công cụ",
    unit: "",
    description: "Ước tính tải thải từ sinh khối và khẩu phần.",
    fields: [
      f("biomass", "Sinh khối (kg)", 100),
      f("feed", "Cho ăn (% sinh khối/ngày)", 2),
      f("protein", "Đạm (%)", 35),
      f("peak", "Hệ số giờ cao điểm", 1.5),
    ],
    parts: [],
  },
  {
    id: "dong-chay",
    name: "Dòng chảy và vận tốc",
    group: "Công cụ",
    unit: "",
    description: "Tính lưu lượng tuần hoàn và vận tốc nước trong ống.",
    fields: [
      f("volume", "Thể tích nuôi (m³)", 10),
      f("turnover", "Số vòng mỗi giờ", 1.5),
      q,
      f("diameter", "Đường kính trong ống (mm)", 100),
    ],
    parts: [],
  },
];
export const initialValues = (entry: Entry): Values => Object.fromEntries(entry.fields.map((x) => [x.key, x.value]));
