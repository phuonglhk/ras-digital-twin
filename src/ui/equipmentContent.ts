import { equipment } from "./catalog";

export interface EquipmentContent {
  principles: string[];
  flow: string[];
  parameters: { name: string; value: string; source: string; url: string }[];
}
const guide =
  "https://aquaculture.mgcafe.uky.edu/sites/aquaculture.ca.uky.edu/files/srac_453_recirculating_aquaculture_tank_production_systems_a_review_of_component_options.pdf";
const media =
  "https://freshwater-aquaculture.extension.org/wp-content/uploads/2019/08/Proceedings_2nd_International_Conference_on_Recirculating_Aq.pdf";
const uv = "https://agris.fao.org/search/en/records/65dec0d97c7033e84bebb10a";
const reference = (name: string, value: string, source: string, url: string) => ({ name, value, source, url });
export const equipmentContent: Record<string, EquipmentContent> = {
  "loc-trong": {
    principles: [
      "Nước mang cặn đi vào trong trống; nước qua lưới còn chất rắn được giữ lại.",
      "Chọn kích thước lưới và diện tích lọc theo tải cặn và lưu lượng thiết kế.",
      "Lưới bít làm chênh lệch mực nước tăng; vòi phun rửa ngược đưa cặn vào máng.",
      "Kiểm tra vòi phun, lưới và cơ cấu quay định kỳ, thay lưới rách.",
    ],
    flow: ["Nước có cặn → trong trống → qua lưới → nước sạch", "Nước rửa ngược → lưới → máng gom → cặn xả"],
    parameters: [
      reference(
        "Lỗ lưới lọc",
        "20–100 µm",
        "FAO, A Guide to Recirculation Aquaculture, ấn bản 3",
        "https://thienphucthinh.com/wp-content/uploads/2023/03/A-guide-to-recirculation-aquaculture-3rd-edition-EN.pdf",
      ),
    ],
  },
  "tach-dam": {
    principles: [
      "Bọt khí mịn hấp phụ chất hữu cơ hoạt động bề mặt khi đi lên cột tiếp xúc.",
      "Thời gian tiếp xúc, kích thước bọt và độ mặn ảnh hưởng hiệu quả tách.",
      "Bọt mang chất bẩn tràn vào cốc; ozone tùy chọn phải được loại bỏ trước khi nước về bể.",
      "Vệ sinh cốc và đầu tạo bọt; kiểm tra ozone dư và thông gió khi vận hành.",
    ],
    flow: ["Nước nhánh + khí → cột tiếp xúc → nước xử lý", "Bọt bẩn → cốc thu → chất thải"],
    parameters: [
      reference(
        "Liều ozone trong một nghiên cứu RAS",
        "0,33–0,39 mg/L",
        "Gupta và cộng sự, Aquaculture Research (2024)",
        "https://onlinelibrary.wiley.com/doi/10.1155/are/6096671",
      ),
    ],
  },
  mbbr: {
    principles: [
      "Giá thể chuyển động mang màng vi sinh chuyển amoni thành nitrit rồi nitrat.",
      "Diện tích hữu dụng, nhiệt độ, độ mặn và ôxy chi phối khả năng xử lý.",
      "Thiếu khí hoặc quá tải làm nitrit tăng; bể mới cần thời gian phát triển màng.",
      "Theo dõi TAN, nitrit và DO; kiểm tra lưới giữ giá thể và bộ phân phối khí.",
    ],
    flow: ["Nước chứa TAN → bể giá thể → nước chứa nitrat", "Khí sục → khuấy giá thể → khí thoát"],
    parameters: [
      reference(
        "Tỉ lệ nạp trong một nghiên cứu",
        "67% thể tích bể",
        "Balter và cộng sự, hội nghị nuôi tuần hoàn lần 2",
        media,
      ),
    ],
  },
  "thap-khu-co2": {
    principles: [
      "Nước được phân phối trên đỉnh và chảy thành màng qua lớp đệm.",
      "Không khí đi ngược chiều mang CO₂ ra ngoài; lưu lượng khí cần đủ lớn.",
      "Đệm đóng cặn hoặc thông gió kém làm khả năng khử khí giảm.",
      "Rửa đệm, kiểm tra quạt và bảo đảm khí thải không tích tụ trong nhà.",
    ],
    flow: ["Nước giàu CO₂ → đỉnh tháp → lớp đệm → nước ra đáy", "Không khí vào đáy → qua đệm → khí giàu CO₂ ra đỉnh"],
    parameters: [
      reference(
        "Tỉ lệ thể tích khí : nước tối thiểu",
        "5 : 1",
        "SRAC 453, Recirculating Aquaculture Tank Production Systems",
        guide,
      ),
    ],
  },
  "bom-tuan-hoan": {
    principles: [
      "Cánh bơm truyền năng lượng cho nước để thắng tổn thất và chênh cao.",
      "Chọn điểm làm việc theo đường đặc tính bơm và cột áp toàn tuyến.",
      "Tắc đầu hút, thiếu nước hoặc xâm thực làm lưu lượng giảm và gây rung.",
      "Vệ sinh lưới hút, kiểm tra phớt và chuẩn bị nguồn điện dự phòng.",
    ],
    flow: ["Nước bể chứa → cửa hút → cánh bơm → đường đẩy"],
    parameters: [
      reference(
        "Cột áp tuần hoàn trong thiết kế RAS",
        "Khoảng 3–8 m",
        "SRAC 453, A Review of Current Design Practice",
        "https://agrilife.org/fisheries/files/2013/09/SRAC-Publication-No.-453-Recirculating-Aquaculture-Tank-Production-Systems-A-Review-of-Current-Design-Practice.pdf",
      ),
    ],
  },
  "den-uv": {
    principles: [
      "Nước chảy qua buồng chiếu, tia UV tác động lên vật chất di truyền của vi sinh vật.",
      "Liều phụ thuộc cường độ, thời gian tiếp xúc và độ truyền qua của nước.",
      "Cặn che chắn hoặc ống thạch anh bẩn làm liều thực tế giảm.",
      "Làm sạch ống thạch anh và thay đèn theo tuổi thọ nhà sản xuất.",
    ],
    flow: ["Nước đã lọc → buồng đèn UV → nước được chiếu xạ"],
    parameters: [
      reference(
        "Liều thường được khuyến nghị trong nuôi thủy sản",
        "30 mJ/cm²",
        "Summerfelt và cộng sự, nghiên cứu UV trong RAS",
        uv,
      ),
    ],
  },
  "con-oxy": {
    principles: [
      "Nước và ôxy đi vào đỉnh côn; tiết diện tăng làm bọt lưu lại trong dòng nước.",
      "Áp suất, lưu lượng và thời gian tiếp xúc quyết định truyền ôxy.",
      "Quá bão hòa khí gần đầu ra có thể gây nguy cơ bệnh bọt khí cho vật nuôi.",
      "Kiểm tra nguồn ôxy, van và áp suất; theo dõi DO và áp suất khí tổng.",
    ],
    flow: ["Nước + ôxy tinh khiết → đỉnh côn → vùng tiếp xúc → nước giàu ôxy ra đáy", "Khí dư → van xả khí"],
    parameters: [
      reference(
        "Hiệu suất hấp thụ trong mô tả thiết bị",
        "Gần 100%",
        "SRAC 453, Recirculating Aquaculture Tank Production Systems",
        guide,
      ),
    ],
  },
  "khu-nitrat": {
    principles: [
      "Trong điều kiện thiếu khí, vi sinh dùng nitrat làm chất nhận điện tử và tạo khí nitơ.",
      "Nhánh xử lý cần nguồn cacbon và thời gian lưu phù hợp với tải nitrat.",
      "Dư methanol hoặc thiếu khuấy gây chất lượng nước đầu ra không ổn định.",
      "Theo dõi nitrat, ôxy và bơm định lượng; bảo trì máy khuấy và đường châm.",
    ],
    flow: ["Nước chứa nitrat + methanol → bể thiếu khí → nước giảm nitrat", "Khí nitơ → thoát ra ngoài"],
    parameters: [
      reference(
        "Tỉ lệ methanol lý thuyết",
        "2,47 g/g NO₃-N",
        "US EPA, Nitrogen Control Manual",
        "https://nepis.epa.gov/Exe/ZyPDF.cgi/30004MI0.PDF?Dockey=30004MI0.PDF",
      ),
    ],
  },
  "may-thoi-khi": {
    principles: [
      "Máy thổi tạo chênh áp để đưa không khí qua đường ống và bộ phân phối.",
      "Chọn lưu lượng tại áp suất làm việc gồm độ sâu nước và tổn thất đường ống.",
      "Lọc hút bẩn hoặc áp suất quá cao làm máy nóng và giảm lưu lượng.",
      "Làm sạch lọc khí, kiểm tra nhiệt, rung và van một chiều.",
    ],
    flow: ["Không khí → lọc hút → máy thổi → ống khí → bộ phân phối"],
    parameters: [
      reference(
        "Lưu lượng khí trong nghiên cứu hai bể MBBR",
        "20,4 L/s",
        "Balter và cộng sự, hội nghị nuôi tuần hoàn lần 2",
        media,
      ),
    ],
  },
  "ho-nuoi-cua": {
    principles: [
      "Mỗi hộp giữ riêng một cá thể, giảm tiếp xúc trực tiếp giữa các con.",
      "Lưu lượng từng hộp phải đủ trao đổi nước và đưa cặn tới ống thu.",
      "Vòi nhỏ bị tắc làm hộp thiếu ôxy; ống tràn bị nghẽn có thể gây tràn nước.",
      "Kiểm tra dòng cấp từng hộp, làm sạch cặn và kiểm tra khung kệ hằng ngày.",
    ],
    flow: ["Nước cấp → vòi nhỏ từng hộp → hộp nuôi → ống tràn chung"],
    parameters: [
      reference(
        "Nhiệt độ nuôi cua bùn",
        "27–32 °C",
        "Tổng quan nuôi cua bùn giống, 2021",
        "https://pmc.ncbi.nlm.nih.gov/articles/PMC8300130/",
      ),
    ],
  },
  "be-tron": {
    principles: [
      "Nước vào tiếp tuyến tạo dòng xoáy, đưa cặn lắng về cửa xả trung tâm.",
      "Đường kính, độ sâu và lưu lượng cần phù hợp loài nuôi và khả năng tự làm sạch.",
      "Dòng quá yếu tích cặn; dòng quá mạnh làm vật nuôi tiêu tốn năng lượng.",
      "Quan sát phân bố dòng, làm sạch cửa xả và kiểm tra mực nước mỗi ngày.",
    ],
    flow: ["Nước hồi → cửa cấp tiếp tuyến → bể tròn → cửa xả trung tâm → xử lý"],
    parameters: [
      reference(
        "Tỉ lệ đường kính : độ sâu",
        "3 : 1 đến 10 : 1",
        "Timmons và cộng sự (1998), Review of circular tank technology and management",
        "https://freshwater-aquaculture.extension.org/wp-content/uploads/2019/08/Review_of_circular_tank_technology_and_management.pdf",
      ),
    ],
  },
};

// Các đầu vào mẫu được ghi rõ là giả định của máy tính, không phải thông số thiết kế khuyến nghị.
for (const entry of equipment) {
  for (const field of entry.fields.slice(0, 2)) {
    equipmentContent[entry.id].parameters.push(
      reference(
        `${field.label} · ví dụ`,
        String(field.value).replace(".", ","),
        "Giá trị đầu vào mẫu của máy tính trên trang này",
        `/thiet-bi/${entry.id}`,
      ),
    );
  }
}
