# T3 · Sơ đồ P&ID vận hành và trang tự kiểm

Người giao: Claude (giám sát). Người làm: Codex. Làm sau khi T2 đã được nghiệm thu và commit. Sơ đồ P&ID đặt trong route `/quy-trinh`; tự kiểm mở bằng `/quy-trinh?selftest=1`.

## Mục tiêu

Mục tiêu ban đầu của dự án là "mỗi hệ RAS có một sơ đồ trực quan vận hành". iRAS có trang P&ID tự sinh từ tuyến công nghệ, theo ký hiệu ISA-5.1 (`pid.html`). Dự án này cần một sơ đồ 2D tương tự, nhưng dành cho vận hành: giá trị chạy trực tiếp từ mô phỏng, chung một nguồn dữ liệu với cảnh 3D.

## Ràng buộc
- Như T1: không chép code iRAS (AGPL-3.0), chữ hiển thị tiếng Việt, TypeScript strict, không thêm thư viện runtime.
- Vẽ bằng SVG tự viết trong React. Không dùng thư viện sơ đồ.

## Việc cần làm

### 1. Chế độ xem "Sơ đồ P&ID"
- Đặt nút chuyển "Mô hình 3D" / "Sơ đồ P&ID" ở khung giữa, cùng chỗ với cảnh 3D. Hai chế độ dùng chung `selected` và chung dữ liệu.
- Sinh sơ đồ từ `UNIT_ORDER` và tham số, không vẽ cứng. Thiết bị đang tắt thì vẽ nét đứt và mờ.
- Ký hiệu tối giản theo tinh thần ISA-5.1:
  - Bể và bồn: hình chữ nhật, có mức nước.
  - Lọc trống: hình tròn có lưới.
  - Bơm: hình tròn có tam giác.
  - Tháp khử khí: cột có đệm.
  - UV: ống có tia.
  - Côn ôxy: hình nón.
  - Van: hai tam giác đối đỉnh.
- Đường ống chính nét liền có mũi tên chiều dòng chảy. Nhánh khử nitrat và nhánh tách đạm vẽ nét mảnh. Đường khí (O₂, gió) vẽ nét chấm.
- Mỗi thiết bị có tag kiểu ISA đặt trong vòng tròn, ví dụ `FT-101` (lưu lượng), `AT-201` (pH), `AT-202` (DO), `AT-203` (TAN). Bên cạnh tag hiện giá trị trực tiếp và màu theo ba mức đạt, quá nửa ngưỡng, vượt ngưỡng.
- Bấm vào thiết bị thì chọn thiết bị đó, giống khi bấm trong 3D.
- Dòng chảy động: dùng `stroke-dashoffset` trên ống chính khi bơm chạy. Tôn trọng `prefers-reduced-motion`.
- Có nút "Tải SVG" để xuất sơ đồ ra file `.svg`, dùng Blob và thẻ a download. Chỉ chạy được ở bản local, không cần chạy trong iframe bị khoá.
- Co giãn theo khung, cuộn ngang được trên điện thoại.

### 2. Trang tự kiểm (`?selftest=1`)
Học cách làm của iRAS: thêm tham số URL `?selftest=1` để mở một bảng tự kiểm.
- Chạy một bộ ca cố định: bốn loài × trạng thái ổn định mặc định, cộng hai kịch bản là "mất điện bơm 2 giờ" và "bể vi sinh chín 30%".
- So từng chỉ số then chốt (TAN, NO₂⁻, NO₃⁻, DO, CO₂, pH, NH₃ tự do, Ω) với một bảng chuẩn lưu trong `src/model/baseline.json`, có dung sai.
- Hiển thị bảng gồm tên ca, chỉ số, giá trị chuẩn, giá trị hiện tại, độ lệch và kết quả ĐẠT hoặc LỆCH.
- Thêm script `npm run baseline` để ghi lại `baseline.json` khi mô hình được cố ý thay đổi.
- Test Vitest chạy cùng bộ ca và đối chiếu với `baseline.json`. Test phải đỏ nếu sửa sai một hệ số. Hãy thử một lần với một hệ số bị sửa sai để chứng minh, rồi hoàn lại.

### 3. README tiếng Việt
Viết `README.md` gồm: mục đích, cách chạy (`npm install`, `npm run dev`, `npm test`), cấu trúc thư mục, nguồn mô hình kèm trích dẫn, giới hạn của mô hình, cách thêm asset Blockbench (`npm run assets`), và ghi chú về giấy phép của iRAS.

### 4. Ba điểm còn lại từ nghiệm thu T2
- Bảng "Thông số điển hình" của mỗi thiết bị có ít nhất 3 dòng, mỗi dòng có nguồn. Hiện côn ôxy và vài thiết bị khác chỉ có 1 dòng.
- Sơ đồ "Hành trình của dòng nước" trên trang chủ bắt đầu bằng "Kệ hộp nuôi cua", vì cua là đối tượng mặc định. Bể tròn ghi chú là phương án cho cá và tôm.
- Thêm `prettier` làm devDependency, kèm `.prettierrc` (`printWidth: 120`) và script `npm run format`. Chạy cho `src/`.

## Lưu ý môi trường
- Máy Windows chặn `npx.ps1` và `npm.ps1`, nên dùng `npx.cmd` và `npm.cmd`.
- Không tạo file hay thư mục tạm trong repo. Nếu cần, đặt ở thư mục tạm của hệ thống.

## Tiêu chí nghiệm thu
- `npx tsc --noEmit`, `npm test` và `npm run build` đều đạt.
- Mở `/?selftest=1` thấy toàn bộ ĐẠT.
- Bấm một thiết bị trong P&ID thì panel chi tiết và vòng chọn trong 3D cùng đổi.
- Không có chữ tiếng Anh nào hiển thị cho người dùng, trừ ký hiệu kỹ thuật.

## Báo cáo khi xong
Như T1. Không commit.
