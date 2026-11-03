# T2 · Website: khung trang và thư viện thiết bị 3D

Người giao: Claude (giám sát). Người làm: Codex. Làm sau khi T1 đã được nghiệm thu và commit.

## Mục tiêu sản phẩm

Đây là một website Digital Twin minh hoạ các quy trình RAS (nuôi tuần hoàn) cùng các thiết bị và máy xử lý nước, mỗi thứ có mô hình 3D.

Tham khảo:
- iRAS (https://iras.cn) cho mô hình công nghệ.
- waterkit (https://waterkit.cn, https://github.com/chengsunmail/waterkit) cho cách tổ chức website: nhiều trang công cụ, mỗi trang ghi rõ công thức và nguồn, nhập số là có kết quả ngay, chạy hoàn toàn ở trình duyệt.

## Ràng buộc
- iRAS và waterkit đều dùng giấy phép **AGPL-3.0**. **Không chép code, HTML hay CSS** của hai dự án. Chỉ học cách tổ chức nội dung và dùng công thức khoa học có trích dẫn.
- Toàn bộ chữ hiển thị là tiếng Việt có dấu.
- TypeScript strict. Không thêm thư viện runtime mới. Tự viết router nhỏ dựa trên `history.pushState` và `popstate`.
- Dùng lại mô hình trong `src/model/` và các builder 3D trong `src/twin/equipment.ts`. Không viết công thức trùng lặp.
- Giữ nguyên trang twin hiện có, chuyển nó thành route `/quy-trinh`.

## Cấu trúc trang

| Đường dẫn | Nội dung |
|---|---|
| `/` | Trang chủ: giới thiệu ngắn, sơ đồ khối quy trình RAS (bấm từng khối thì mở trang thiết bị), lưới thẻ thiết bị, lưới thẻ công cụ |
| `/quy-trinh` | Twin toàn hệ (App hiện tại) |
| `/thiet-bi` | Danh sách thiết bị, lọc theo nhóm: cơ học, sinh học, khí, khử trùng, vận chuyển nước, nuôi |
| `/thiet-bi/:id` | Trang một thiết bị (mô tả bên dưới) |
| `/cong-cu/:id` | Trang một công cụ tính |
| `/gioi-thieu` | Nguồn mô hình, trích dẫn, giới hạn, giấy phép |

Dùng chung một thanh điều hướng trên cùng và một chân trang. Mỗi route có `document.title` riêng bằng tiếng Việt. Vite cần trả `index.html` cho mọi đường dẫn khi chạy dev và preview.

## Trang thiết bị `/thiet-bi/:id`

Thiết bị cần có: `loc-trong` (lọc trống RDF), `tach-dam` (protein skimmer, có tuỳ chọn ozone), `mbbr`, `thap-khu-co2`, `bom-tuan-hoan`, `den-uv`, `con-oxy`, `khu-nitrat`, `may-thoi-khi` (mới), `ho-nuoi-cua` (kệ hộp cua), `be-tron` (bể tròn cá/tôm).

Mỗi trang gồm:

1. **Khung 3D riêng của thiết bị.** Xoay và zoom được. Có nút "Cắt lớp" hoặc "Tách rời" (exploded view) để thấy cấu tạo bên trong. Có hình động thể hiện nguyên lý, ví dụ:
   - Trống quay và tia rửa ngược phun ra.
   - Bọt dâng lên cốc trong tách đạm.
   - Giá thể MBBR xoay vòng và bọt khí.
   - Nước rơi qua lớp đệm, khí đi ngược chiều trong tháp khử CO₂.
   - Đèn UV phát sáng.
   - Ôxy hoà tan dần trong côn ôxy.
   
   Dùng asset Blockbench khi có (`drum_filter`, `pump`, `tank`, `crab_box`, `rack`). Thiết bị chưa có asset thì mở rộng builder trong `equipment.ts`, giữ phong cách khối vuông.
2. **Nhãn chú thích bộ phận.** Bấm vào một bộ phận thì hiện tên và chức năng. Ví dụ với lọc trống: lưới lọc 60 µm, ống phun rửa, máng gom cặn, động cơ.
3. **Nguyên lý hoạt động.** Ba đến năm đoạn ngắn, kèm sơ đồ dòng vào ra (nước, khí, cặn).
4. **Máy tính nhanh** kiểu waterkit. Nhập là có kết quả ngay; mỗi kết quả ghi công thức và nguồn ngay dưới. Ví dụ:
   - Lọc trống: tải TSS → lượng cặn/ngày, nước rửa ngược.
   - MBBR: tải TAN, nhiệt độ, độ mặn → diện tích và thể tích giá thể (K1/K3/K5), gió sục.
   - Tháp khử CO₂: lưu lượng, G:L → lưu lượng gió, CO₂ sau tháp, pH sau tháp (dùng hệ carbonat của T1).
   - Bơm: lưu lượng, cột áp, hiệu suất → công suất trục, điện năng/năm.
   - UV: lưu lượng, liều, độ truyền qua UVT → số đèn ước tính.
   - Côn ôxy: lưu lượng, DO vào/ra → kg O₂/ngày, TGP.
   - Khử nitrat: NO₃⁻ vào/ra, lưu lượng → methanol/ngày, kiềm hồi lại.
   - Máy thổi khí: lưu lượng khí, áp, hiệu suất → công suất.
5. **Thông số điển hình.** Một bảng nhỏ ghi rõ nguồn.
6. **Nút "Xem trong quy trình".** Mở `/quy-trinh` và chọn sẵn thiết bị đó, qua query `?chon=biofilter`.

## Trang công cụ `/cong-cu/:id`
- `nh3-tu-do`: TAN, pH, nhiệt độ, độ mặn → % NH₃, NH₃-N, NH₄⁺-N. Có biểu đồ % NH₃ theo pH ở nhiệt độ đang chọn.
- `doi-don-vi`: TAN ↔ NH₃ ↔ NH₄⁺ (theo N hoặc theo ion), NO₂⁻-N ↔ NO₂⁻, NO₃⁻-N ↔ NO₃⁻, kiềm mg/L CaCO₃ ↔ mmol/L ↔ dKH, độ mặn ↔ tỉ trọng gần đúng.
- `tai-thuc-an`: sinh khối, % cho ăn, % đạm → TAN, TSS, O₂, CO₂ theo ngày và theo giờ cao điểm.
- `dong-chay`: thể tích nuôi, số vòng/giờ → lưu lượng; lưu lượng, đường kính ống → vận tốc (tham khảo GB 50013 cho vận tốc khuyến nghị, chỉ trích dẫn).

## Thiết kế
- Giữ bộ màu tối của bản nền (tông xanh thép đậm, nhấn hổ phách) và hai phông IBM Plex Sans/Mono.
- Thẻ thiết bị trên trang chủ và trang danh sách dùng ảnh chụp tĩnh từ chính cảnh 3D: render một lần ra canvas thành dataURL lúc tải, có cache. Không thêm file ảnh.
- Responsive tới 375 px. Khung 3D chiếm hết chiều ngang trên điện thoại.
- Một `WebGLRenderer` cho mỗi trang. Huỷ đúng cách khi rời trang, không rò bộ nhớ khi chuyển route nhiều lần.

## Tiêu chí nghiệm thu
- `npx tsc --noEmit`, `npm test` và `npm run build` đều đạt.
- Mọi route mở được trực tiếp bằng URL khi chạy `npm run dev` và `npm run preview`.
- Đủ 11 trang thiết bị, mỗi trang có 3D, ít nhất một hình động nguyên lý, nhãn bộ phận và máy tính nhanh.
- Đủ 4 công cụ. Test Vitest cho từng hàm tính của máy tính nhanh, kèm ít nhất một giá trị đối chiếu với tài liệu.
- Chuyển qua lại giữa 10 route mà số WebGL context không tăng dần (kiểm bằng `renderer.info` hoặc đếm instance).

## Báo cáo khi xong
- Danh sách file.
- Bảng thiết bị gồm: asset dùng hay dựng khối, hình động gì, máy tính nhanh gì.
- Kết quả ba lệnh kiểm tra.
- Những gì chưa làm được.

Không commit.
