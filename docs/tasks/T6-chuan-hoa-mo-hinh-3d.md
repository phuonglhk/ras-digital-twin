# T6 · Chuẩn hoá mô hình 3D thiết bị RAS

## Vì sao làm
Người dùng nhận xét (2026-11-10): mô hình 3D hiện tại "chưa ổn, còn đơn giản". Hiện trạng:
- Thiết bị dựng bằng vài khối hộp và trụ 12 cạnh, vật liệu Lambert một màu (`src/twin/equipment.ts`).
- Asset Blockbench rất thô: bơm 4 khối, bể 5 khối, kệ 7 khối.
- Ba cảnh (`/quy-trinh`, `/thiet-bi/:id`, `/thiet-ke`) dùng ánh sáng và vật liệu khác nhau.
- Nhãn bộ phận gắn theo **chỉ số mesh** (`labelEquipmentParts(…, indexes)`), dễ lệch khi sửa hình.

Mục tiêu: mọi thiết bị trông như thiết bị công nghiệp thật ở mức sơ đồ kỹ thuật. Người xem phải nhận ra được mặt bích, cửa vào/ra, động cơ, van, chân đỡ. Tất cả dựng theo một bộ quy tắc chung.

## Quyết định của Claude
- **Dựng thủ tục (procedural) bằng three.js**, có tham số. Không tải mô hình GLB/OBJ từ bên ngoài, không dùng ảnh texture ngoài. Texture nếu cần thì vẽ bằng canvas.
- Không sao chép mesh của nhà sản xuất. Kích thước lấy theo cỡ điển hình trong catalogue và ghi rõ là "minh hoạ".
- Giữ nguyên giao diện `Equipment` (`group`, `inlet`, `outlet`, `height`, `water`, `lamp`, `animate`) để mô phỏng hoá nước và cảnh `/quy-trinh` không phải đổi logic.
- Làm theo **ba đợt**. Người dùng yêu cầu (2026-11-10) Claude tự viết code cho việc này, không giao Codex.

## 1. Chuẩn chung (áp dụng cho mọi mô hình)
Ghi các quy tắc này thành `docs/chuan-mo-hinh-3d.md` (tiếng Việt) và tuân thủ trong code.

1. **Đơn vị và trục:** mét; trục Y hướng lên; gốc toạ độ ở tâm đáy thiết bị; dòng nước chính đi theo +X (cửa vào phía −X, cửa ra phía +X) trừ khi thiết bị thật khác.
2. **Cổng nối (port):** mỗi thiết bị khai báo danh sách cổng `{ ten, viTri, huong, dn, loai }`, với `loai` là `nuoc-vao`, `nuoc-ra`, `khi`, `oxy`, `bun`, `hoa-chat`. `inlet`/`outlet` cũ lấy từ hai cổng nước chính. Mỗi cổng phải có ống cụt và mặt bích (hoặc rắc co với DN ≤ 60) nhìn thấy được, tâm trùng `viTri`.
3. **Tên bộ phận:** mỗi bộ phận có nghĩa là một `Group` có `name` tiếng Việt không dấu dạng `than`, `dong-co`, `mat-bich-vao`… Nhãn chú thích tra theo **tên**, không theo chỉ số. Bỏ tham số `indexes`.
4. **Vật liệu:** một bảng vật liệu PBR dùng chung (`MeshStandardMaterial`), đặt trong một tệp:
   - inox (xước nhẹ), thép sơn (xanh công nghiệp, xám), gang đúc (bơm, quạt), uPVC xám, PP/PE trắng đục, HDPE đen, FRP xanh nhạt, kính/acrylic trong, cao su đen, đồng thau (van), nhôm tản nhiệt.
   - Nước giữ `waterMaterial()` nhưng chuyển sang vật liệu vật lý có độ trong.
   - Không tạo vật liệu rời trong từng thiết bị, trừ vật liệu phát sáng có hoạt cảnh.
5. **Mã màu đường ống** (dùng chung cả ba cảnh, có chú giải): nước cấp xanh lam, nước hồi/tràn xanh lục, bùn/xả cặn nâu, khí nén xám nhạt có vòng vàng, ôxy xanh lá có vòng trắng, hoá chất tím. Giữ đúng các màu `/thiet-ke` đang dùng.
6. **Mức chi tiết (LOD):** mỗi hàm dựng nhận `chiTiet: "cao" | "thap"`.
   - `cao` (`"high"` trong code): trang thiết bị đơn và chế độ "Một hộp". Trụ ≥ 32 cạnh, có bu lông, cánh tản nhiệt, tay van. Tối đa 40.000 tam giác và 40 draw call mỗi thiết bị.
   - `thap` (`"low"`): cảnh toàn hệ. Trụ 16 cạnh, bỏ bu lông và chi tiết < 2 cm. Tối đa 6.000 tam giác và 14 draw call.
   - Gộp hình học theo vật liệu (`mergeGeometries`) hoặc dùng `InstancedMesh` cho chi tiết lặp lại.
7. **Ánh sáng và kết xuất dùng chung:** một hàm `taoSanKhau(renderer, scene)` cho cả ba cảnh:
   - sRGB, tone mapping ACES, môi trường phản xạ `RoomEnvironment` qua PMREM;
   - đèn bán cầu + một đèn định hướng có bóng mềm;
   - nền tối khớp website; sàn bê tông nhám có lưới mờ 1 m và nhận bóng.
8. **Hoạt cảnh:** chỉ chạy khi thiết bị đang bật. Dùng thời gian `t`, không cộng dồn theo khung hình (hiện quạt tháp CO₂ cộng `+= 0.35` mỗi khung, sai trên màn 120 Hz).
9. **Giải phóng:** mọi hình học, vật liệu, texture tạo ra phải được `dispose` khi rời trang. Mỗi trang vẫn chỉ một WebGL context.

## 2. Thư viện chi tiết dùng chung (`src/twin/parts.ts`)
Mỗi hàm trả `Group` hoặc `BufferGeometry`, nhận kích thước thật (m hoặc DN):
- **Đường ống:** ống thẳng theo DN, co 90°/45° (uốn cong thật, không gãy góc), tê, côn thu, nút bịt, mặt bích có bu lông, rắc co, kẹp ống, giá đỡ ống.
- **Van:** van bi tay gạt (uPVC), van bướm tay gạt, van cổng, van một chiều, van điện từ.
- **Bình và bể:** thân trụ có đáy/nắp cong (chỏm cầu) hoặc côn, bể chữ nhật có gân tăng cứng và vành mép, cửa người chui, kính quan sát, ống thuỷ.
- **Kết cấu:** khung bệ thép hình (U, hộp), chân đỡ có bản đế và bu lông neo, sàn thao tác lưới thép, lan can, thang.
- **Máy:** động cơ điện (thân có cánh tản nhiệt, nắp quạt, hộp đấu dây, chân đế), hộp giảm tốc, khớp nối có chắn bảo vệ, buồng xoắn bơm ly tâm.
- **Đo và điều khiển:** đồng hồ áp, lưu lượng kế phao (rotameter), đầu dò cảm biến, tủ điện có đèn báo và màn hình, biển tên thiết bị.

## 3. Yêu cầu từng thiết bị
Kích thước là cỡ điển hình cho hệ 10–30 m³/giờ, ghi trong chú thích là minh hoạ. Mỗi thiết bị phải có đủ các bộ phận nêu dưới, đặt tên theo mục 1.3. Nhãn trên trang thiết bị phải trỏ đúng bộ phận.

| Mã (`catalog.ts`) | Thiết bị | Bộ phận bắt buộc |
|---|---|---|
| `loc-trong` | Lọc trống | Bể vỏ inox/PP có nắp mở; trống quay có các tấm lưới và vành đỡ; dàn béc rửa ngược và bơm rửa; máng thu bùn có ống xả; động cơ giảm tốc truyền xích có chắn; cảm biến mức; cửa vào (dọc trục), cửa ra, cửa tràn; tủ điện |
| `tach-dam` | Tách đạm (protein skimmer) | Thân trụ trong suốt trên đế; cổ côn thu bọt; cốc bọt có nắp và ống xả bọt; bơm venturi và đường hút khí có lưu lượng kế; ống ra có van cổng chỉnh mức; cửa vào/ra có rắc co |
| `mbbr` | Bể MBBR | Bể chữ nhật có gân, vành; giá thể K1 dạng bánh xe (instanced) chuyển động khi sục khí; lưới chắn giá thể ở cửa ra; dàn ống sục khí đáy và ống khí xuống có van; cửa vào/ra |
| `thap-khu-co2` | Tháp khử CO₂ | Thân tháp trên hộc chứa; khay phân phối nước; lớp đệm nhìn thấy qua cửa quan sát; quạt ly tâm bên hông có ống gió; cửa thoát khí trên đỉnh có chắn giọt; chân đỡ; cửa vào trên, cửa ra dưới |
| `bom-tuan-hoan` | Bơm ly tâm trục ngang | Buồng xoắn gang; mặt bích hút (dọc trục) và đẩy (hướng lên); khớp nối có chắn; động cơ đầy đủ; bệ thép chung; đồng hồ áp ở cửa đẩy; van và van một chiều |
| `den-uv` | Đèn UV kín | Buồng inox ống nằm ngang trên hai chân kẹp; cửa vào/ra mặt bích lệch hai đầu; nắp đầu giữ đèn có đầu cáp; kính quan sát phát sáng tím khi bật; cảm biến cường độ UV; tủ ballast |
| `con-oxy` | Côn ôxy (Speece) | Côn thép trên chân đỡ; mặt bích trên/dưới; đường ôxy có lưu lượng kế và van kim; đồng hồ áp; bình ôxy có van và bộ giảm áp, xích giữ bình |
| `khu-nitrat` | Bể khử nitrat | Bể kín trụ đứng có nắp; bơm định lượng và bình nguồn carbon; ống tuần hoàn; đầu dò ORP; ống thông hơi; cửa vào/ra |
| `may-thoi-khi` | Máy thổi khí con sò | Thân vòng gang có gân; động cơ; lọc gió hút; bộ giảm thanh; van an toàn; đồng hồ áp; ống mềm chống rung; bệ có đệm cao su |
| `ho-nuoi-cua` | Hộp nuôi cua và kệ | Dùng chung mô hình hộp của `/thiet-ke`: thân hộp có gân, cửa trước, ống tràn có ống bọc, đầu cấp, khoá xếp chồng; kệ xếp chồng kiểu căn hộ |
| `be-tron` | Bể trộn / hộc bơm | Bể chữ nhật có vách ngăn; phao báo mức; cánh khuấy có động cơ; bình và bơm định lượng kiềm; đầu dò pH; cửa vào/ra |
| (bể nuôi) | Bể tròn, bể chữ nhật | Thành FRP có gân vành; ống trung tâm thoát đáy; ống cấp tiếp tuyến; chân đỡ |

Blockbench (`bbmodel.ts`, `public/models.json`, `tools/import-bbmodel.mjs`): nếu sau T6 không còn nơi nào dùng thì gỡ khỏi code và README, giữ `assets-src/` làm tư liệu. Nêu trong báo cáo.

## 4. Ba đợt
- **Đợt 1 (xong 2026-11-10):** mục 1 (chuẩn + tài liệu), mục 2 (thư viện chi tiết), `taoSanKhau` áp cho trang `/thiet-bi/:id`, và bốn thiết bị: `bom-tuan-hoan`, `tach-dam`, `den-uv`, `con-oxy`. Nhãn theo tên cho bốn thiết bị này; các thiết bị còn lại tạm giữ cách cũ nhưng vẫn phải chạy.
- **Đợt 2:** `loc-trong`, `mbbr`, `thap-khu-co2`, `may-thoi-khi`, `khu-nitrat`, `be-tron`, bể nuôi; áp `taoSanKhau` và LOD `thap` cho `/quy-trinh`; ống nối giữa các thiết bị dùng thư viện đường ống và mã màu.
- **Đợt 3:** `ho-nuoi-cua`; `/thiet-ke` dùng chung vật liệu, sân khấu và chi tiết van/rắc co/co từ thư viện; gỡ Blockbench nếu không còn dùng; cập nhật README.

## 5. Kiểm tra tự động (vitest, không cần WebGL)
Với mỗi thiết bị đã chuẩn hoá, ở cả hai mức chi tiết:
- khung bao khớp kích thước khai báo, sai số ≤ 5%; đáy nằm trên mặt y = 0;
- có đủ các bộ phận bắt buộc theo tên; mọi nhãn trong `equipmentContent`/`catalog` tìm thấy bộ phận;
- mỗi cổng nằm trên mặt ngoài khung bao (không lơ lửng, không chìm trong thân) và có mặt bích/rắc co tại đó;
- số tam giác và số draw call không vượt ngân sách ở mục 1.6;
- mọi vật liệu thuộc bảng dùng chung (trừ vật liệu phát sáng được khai báo);
- `animate(t, true)` gọi hai lần cùng `t` cho cùng trạng thái (không cộng dồn theo khung).

## Tiêu chí nghiệm thu mỗi đợt
- `npm.cmd run format`, `npx.cmd tsc --noEmit`, `npm.cmd test`, `npm.cmd run build` đạt; tự kiểm vẫn 48/48. Không commit, không push, không tệp tạm.
- Báo cáo: từng thiết bị có số tam giác và draw call ở hai mức, danh sách bộ phận và cổng; phần nào chưa làm.
- Claude kiểm trên trình duyệt: hình nhận ra được là thiết bị thật, nhãn trỏ đúng bộ phận, hoạt cảnh chạy, không lỗi console, một WebGL context mỗi trang, không tràn ngang ở 375 px, `/quy-trinh` vẫn mượt.
