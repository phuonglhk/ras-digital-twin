# Chuẩn mô hình 3D thiết bị RAS

Áp dụng cho mọi thiết bị dựng trong `src/twin/devices.ts`. Mục tiêu: thiết bị nhìn ra được là thiết bị công nghiệp thật ở mức sơ đồ kỹ thuật, và mọi mô hình theo cùng một bộ quy tắc.

Mô hình dựng bằng code three.js, có tham số. Không tải mô hình hay ảnh texture từ bên ngoài, không sao chép mô hình của hãng nào. Kích thước lấy theo cỡ điển hình cho hệ 10–30 m³/giờ và chỉ để minh hoạ.

## Quy tắc

1. **Đơn vị và trục.** Mét. Trục Y hướng lên. Gốc toạ độ ở tâm đáy thiết bị (hàm `finish()` tự canh). Dòng nước chính đi theo +X: cửa vào phía −X, cửa ra phía +X, trừ khi thiết bị thật khác (bơm đẩy lên trên).
2. **Cổng nối.** Mỗi thiết bị trả về `ports`: tên, loại (`nuoc-vao`, `nuoc-ra`, `khi`, `oxy`, `bun`, `hoa-chat`), vị trí, hướng ra ngoài, DN. Mỗi cổng nước phải có ống cụt kèm mặt bích hoặc rắc co ngay tại vị trí cổng. `inlet` và `outlet` lấy từ hai cổng nước chính.
3. **Tên bộ phận.** Mỗi bộ phận là một `Group` có `name` tiếng Việt không dấu, ví dụ `than-bom`, `dong-co`, `tu-dien`. Nhãn chú thích trên trang thiết bị tra theo tên (`labelEquipmentByName`), không theo chỉ số mesh.
4. **Vật liệu.** Chỉ dùng bảng `PBR` trong `src/twin/materials.ts`. Ngoại lệ: nước (`waterMaterial()`) và vật liệu phát sáng có hoạt cảnh (`glowMaterial()`, đánh dấu `userData.animated`).
5. **Mức chi tiết.** Hàm dựng nhận `"high"` hoặc `"low"`.

   | Mức | Dùng ở | Trụ | Chi tiết nhỏ | Tam giác | Draw call |
   |---|---|---|---|---|---|
   | `high` | trang thiết bị | 32 cạnh | có bu lông, cánh tản nhiệt | ≤ 40.000 | ≤ 40 |
   | `low` | cảnh toàn hệ `/quy-trinh` | 16 cạnh | bỏ | ≤ 6.000 | ≤ 14 |

   `Kit.build()` gộp hình học theo (bộ phận, vật liệu) ở mức cao và theo vật liệu ở mức thấp.
6. **Ánh sáng.** Dùng `src/twin/stage.ts`: `configureRenderer` (sRGB, ACES, bóng mềm), `createEnvironment` (phản xạ cho kim loại), `addStage` (đèn và sàn).
7. **Hoạt cảnh.** `animate(t, running)` là hàm của thời gian `t`. Không cộng dồn theo khung hình, để tốc độ không phụ thuộc tần số màn hình.
8. **Giải phóng.** Trang rời đi thì `dispose` hình học, vật liệu, môi trường. Mỗi trang một WebGL context.

## Thư viện chi tiết (`src/twin/parts.ts`)

Mọi chi tiết dựng dọc trục +Y cục bộ, đặt vào thiết bị bằng `orient(vị trí, hướng, phía trên)`.

- Hình cơ bản: `cyl`, `box`, `dome` (đáy/nắp cong), `ring`, `pipe` (ống qua các điểm, bo cong ở góc).
- Đường ống: `flange`, `nozzle`, `unionStub`, `ballValve`, `gateValve`.
- Đo và điều khiển: `gauge`, `rotameter`, `cabinet`.
- Máy và kết cấu: `motor`, `leg`, `skid`.
- Tiện ích: `bubbles`, `attach`, `measure`, `pipeRadius(DN)`.

## Thêm một thiết bị

1. Viết hàm trong `devices.ts`: tạo `Kit`, gọi `kit.part("ten-bo-phan")` trước mỗi nhóm chi tiết, kết thúc bằng `finish(root, ports, animate)`.
2. Thêm thiết bị vào bảng trong `src/twin/devices.test.ts` (kích thước khung bao, bộ phận bắt buộc). Test kiểm khung bao, cổng, ngân sách tam giác, vật liệu và hoạt cảnh.
3. Khai báo nhãn theo tên bộ phận trong `src/ui/EquipmentView.tsx`.

## Tiến độ chuẩn hoá

| Thiết bị | Trạng thái |
|---|---|
| Bơm tuần hoàn, tách đạm, đèn UV, côn ôxy | Đã chuẩn hoá (đợt 1) |
| Lọc trống, MBBR, tháp khử CO₂, máy thổi khí, khử nitrat, bể nuôi | Đợt 2 |
| Hộp nuôi cua và kệ, cảnh `/thiet-ke` | Đợt 3 |
