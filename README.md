# Mô hình số hệ thống RAS

Ứng dụng minh họa hệ thống nuôi thủy sản tuần hoàn (RAS), kết hợp mô hình chất lượng nước, cảnh 3D, sơ đồ P&ID, thư viện thiết bị và các công cụ tính. Dự án phục vụ học tập, tìm hiểu quy trình và ước tính sơ bộ các tình huống vận hành.

## Các trang

- `/`: trang chủ, giới thiệu hệ thống và dẫn tới các nội dung chính.
- `/quy-trinh`: mô phỏng toàn hệ, điều chỉnh thông số, xem chất lượng nước dọc tuyến, chuyển giữa cảnh 3D và sơ đồ P&ID, chọn thiết bị và tải sơ đồ SVG.
- `/thiet-bi`: thư viện thiết bị và công cụ.
- `/thiet-bi/:id`: thông tin, vận hành và nguồn tham khảo của thiết bị được chọn.
- `/cong-cu/:id`: công cụ tính cho thiết bị hoặc thông số tương ứng.
- `/xu-ly-nuoc`: danh mục các trang WaterKit tích hợp.
- `/gioi-thieu`: thông tin về dự án, nguồn và giới hạn mô hình.
- `/quy-trinh?selftest=1`: mở quy trình kèm bảng tự kiểm, đối chiếu 48 chỉ số với bảng chuẩn.

## Cài đặt và chạy

Cần Node.js và npm. Tại thư mục dự án, trên Windows chạy:

```powershell
npm.cmd install
npm.cmd run dev
```

Mở địa chỉ do Vite in ra. Các lệnh npm tương ứng trên môi trường khác không cần đuôi `.cmd`:

| Lệnh Windows           | Tác dụng                                                         |
| ---------------------- | ---------------------------------------------------------------- |
| `npm.cmd install`      | Cài các gói phụ thuộc.                                           |
| `npm.cmd run dev`      | Khởi động máy chủ phát triển.                                    |
| `npm.cmd test`         | Chạy bộ kiểm thử một lần.                                        |
| `npm.cmd run build`    | Kiểm tra TypeScript và tạo bản dựng production.                  |
| `npm.cmd run preview`  | Xem bản dựng production cục bộ sau khi build.                    |
| `npm.cmd run baseline` | Ghi lại `src/model/baseline.json` cho trang tự kiểm và kiểm thử. |
| `npm.cmd run format`   | Định dạng mã trong `src/` bằng Prettier.                         |

Chỉ chạy lại `npm.cmd run baseline` sau khi chủ động thay đổi mô hình, đã xem xét và xác nhận kết quả mới: lệnh này ghi đè bảng chuẩn dùng chung, vì vậy không nên dùng chỉ để làm kiểm thử đang lỗi trở nên đạt.

## Cấu trúc dự án

- `src/model/`: công thức hóa học, thông số loài, mô phỏng, công cụ tính, bảng chuẩn và kiểm thử mô hình.
- `src/twin/`: mô hình 3D thiết bị dựng bằng code theo `docs/chuan-mo-hinh-3d.md` (thư viện chi tiết, vật liệu, ánh sáng dùng chung) và cảnh `/quy-trinh`.
- `src/ui/`: các thành phần giao diện, sơ đồ SVG, biểu đồ và nội dung thiết bị.
- `tools/`: công cụ tạo bảng chuẩn và tệp 404 cho bản dựng.
- `assets-src/`: các tệp Blockbench cũ, giữ làm tư liệu; ứng dụng không còn dùng.
- `docs/tasks/`: tài liệu và đặc tả công việc.

## Thêm mô hình 3D thiết bị

Làm theo `docs/chuan-mo-hinh-3d.md`: viết hàm dựng bằng thư viện chi tiết trong `src/twin/parts.ts`, khai báo cổng nối và tên bộ phận, rồi thêm thiết bị vào bảng kiểm trong `src/twin/devices.test.ts`.

## Nguồn mô hình

Các nguồn sau được dẫn trong chú thích mã hoặc thông số thiết bị; phạm vi sử dụng cụ thể nằm cạnh công thức hoặc thông số tương ứng:

- Emerson và cộng sự (1975): cân bằng amoni trong nước ngọt.
- Khoo và cộng sự (1977): hiệu chỉnh cân bằng amoni theo độ mặn.
- Millero (2010): hằng số phân ly hệ carbonat.
- Dickson (1990): hằng số phân ly borat.
- Millero (1995): hằng số phân ly nước.
- Uppström (1974): tổng bo theo độ mặn.
- Dickson và cộng sự (2007), _Guide to Best Practices for Ocean CO₂ Measurements_: cân bằng carbon vô cơ và độ kiềm.
- Benson & Krause (1984), phương trình dùng trong APHA 4500-O: độ hòa tan ôxy bão hòa.
- Van Slyke (1922): sức đệm β tại DIC không đổi.
- Định luật Dalton: ước tính tổng áp suất khí từ ôxy hòa tan.
- Rusten và cộng sự (2006): nitrat hóa theo diện tích giá thể MBBR, r = k·S^0.7.
- Timmons & Ebeling (2010), _Recirculating Aquaculture_: tải ô nhiễm suy từ lượng thức ăn.
- SRAC 453: cột áp tuần hoàn, tỉ lệ khí/nước của tháp khử CO₂ và hiệu suất hấp thụ của côn ôxy.
- NOAA, _North Central Regional Aquaculture Conference_ (1997), mục Alkalinity: khoảng độ kiềm RAS 150–200 mg/L CaCO₃.
- SEAFDEC/AQD, _Farming Mangrove Crab_: khoảng pH nuôi cua Scylla.
- iRAS: tham khảo bố cục hệ thống, ngưỡng chất lượng nước và một số hệ số mô hình.

## Giới hạn và giấy phép

Đây là mô hình minh họa với giả định khối trộn đều; thông số mẫu và kết quả không thay thế đo đạc, thiết kế kỹ thuật hay tư vấn chuyên gia. Một số phép tính xấp xỉ mol/kg ≈ mol/L. Các hệ số dị dưỡng, ozone và tổng áp suất khí (TGP) là các giá trị gần đúng cần được hiệu chỉnh theo điều kiện từng trại.

Dự án phát hành theo [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only). Các trang WaterKit tích hợp có nội dung gốc © Cheng Sun / Dengdeng Technology, được Việt hóa và chỉnh sửa giao diện; mã nguồn gốc tại [WaterKit](https://github.com/chengsunmail/waterkit). iRAS vẫn chỉ là nguồn tham khảo; dự án không sao chép mã nguồn iRAS.

Các trang WaterKit đã tích hợp:

- Thủy lực: `pipe-hydraulic-calculator`, `pipe-hydraulic-pro`, `open-channel-calculator`, `weir-flow-calculator`, `orifice-nozzle-calculator`.
- Công nghệ: `aeration-calculator`, `sludge-production-calculator`, `dosing-calculator`, `activated-sludge-process-calculator`, `mbbr-design`, `ifas-design`, `mbr-design`, `ro-design`.
- Thiết bị: `pump-selection-calculator`, `blower-selection-calculator`.
- Chuyển đổi: `water-quality-unit-converter`.
- Thủy sản: `tailwater`, `aquanor-2027-guide-cn`.
