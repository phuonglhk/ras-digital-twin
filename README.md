# Mô hình số hệ thống RAS

Ứng dụng minh họa hệ thống nuôi thủy sản tuần hoàn (RAS), kết hợp mô hình chất lượng nước, cảnh 3D, sơ đồ P&ID, thư viện thiết bị và các công cụ tính. Dự án phục vụ học tập, tìm hiểu quy trình và ước tính sơ bộ các tình huống vận hành.

## Các trang

- `/`: trang chủ, giới thiệu hệ thống và dẫn tới các nội dung chính.
- `/quy-trinh`: mô phỏng toàn hệ, điều chỉnh thông số, xem chất lượng nước dọc tuyến, chuyển giữa cảnh 3D và sơ đồ P&ID, chọn thiết bị và tải sơ đồ SVG.
- `/thiet-bi`: thư viện thiết bị và công cụ.
- `/thiet-bi/:id`: thông tin, vận hành và nguồn tham khảo của thiết bị được chọn.
- `/cong-cu/:id`: công cụ tính cho thiết bị hoặc thông số tương ứng.
- `/gioi-thieu`: thông tin về dự án, nguồn và giới hạn mô hình.
- `/quy-trinh?selftest=1`: mở quy trình kèm bảng tự kiểm, đối chiếu 48 chỉ số với bảng chuẩn.

## Cài đặt và chạy

Cần Node.js và npm. Tại thư mục dự án, trên Windows chạy:

```powershell
npm.cmd install
npm.cmd run dev
```

Mở địa chỉ do Vite in ra. Các lệnh npm tương ứng trên môi trường khác không cần đuôi `.cmd`:

| Lệnh Windows | Tác dụng |
| --- | --- |
| `npm.cmd install` | Cài các gói phụ thuộc. |
| `npm.cmd run dev` | Khởi động máy chủ phát triển. |
| `npm.cmd test` | Chạy bộ kiểm thử một lần. |
| `npm.cmd run build` | Kiểm tra TypeScript và tạo bản dựng production. |
| `npm.cmd run preview` | Xem bản dựng production cục bộ sau khi build. |
| `npm.cmd run baseline` | Ghi lại `src/model/baseline.json` cho trang tự kiểm và kiểm thử. |
| `npm.cmd run format` | Định dạng mã trong `src/` bằng Prettier. |
| `npm.cmd run assets` | Chuyển tài nguyên Blockbench thành `public/models.json`. |

Chỉ chạy lại `npm.cmd run baseline` sau khi chủ động thay đổi mô hình, đã xem xét và xác nhận kết quả mới: lệnh này ghi đè bảng chuẩn dùng chung, vì vậy không nên dùng chỉ để làm kiểm thử đang lỗi trở nên đạt.

## Cấu trúc dự án

- `src/model/`: công thức hóa học, thông số loài, mô phỏng, công cụ tính, bảng chuẩn và kiểm thử mô hình.
- `src/twin/`: dựng cảnh 3D và sử dụng tài nguyên Blockbench.
- `src/ui/`: các thành phần giao diện, sơ đồ SVG, biểu đồ và nội dung thiết bị.
- `tools/`: công cụ nhập tài nguyên và tạo bảng chuẩn.
- `assets-src/`: các tệp Blockbench nguồn.
- `public/models.json`: dữ liệu mô hình 3D được tạo để ứng dụng tải.
- `docs/tasks/`: tài liệu và đặc tả công việc.

## Thêm tài nguyên Blockbench

1. Đặt tệp `.bbmodel` có định dạng `java_block` vào `assets-src/`; tỉ lệ là 16 đơn vị Blockbench = 1 m.
2. Ánh xạ tên tệp sang khóa dùng trong cảnh tại `NAMES` trong `tools/import-bbmodel.mjs`, rồi dùng khóa đó ở nơi dựng thiết bị nếu cần. Tên tệp được dùng làm khóa mặc định khi không có ánh xạ.
3. Chạy `npm.cmd run assets` để tạo lại `public/models.json`, sau đó kiểm tra mô hình trong ứng dụng.

## Nguồn mô hình

Các nguồn sau được dẫn trong chú thích mã hoặc thông số thiết bị; phạm vi sử dụng cụ thể nằm cạnh công thức hoặc thông số tương ứng:

- Emerson và cộng sự (1975): cân bằng amoni trong nước ngọt.
- Khoo và cộng sự (1977): hiệu chỉnh cân bằng amoni theo độ mặn.
- Millero (2010): hằng số phân ly hệ carbonat.
- Dickson (1990): hằng số phân ly borat.
- Millero (1995): hằng số phân ly nước.
- Uppström (1974): tổng bo theo độ mặn.
- Dickson và cộng sự (2007), *Guide to Best Practices for Ocean CO₂ Measurements*: cân bằng carbon vô cơ và độ kiềm.
- Benson & Krause (1984), phương trình dùng trong APHA 4500-O: độ hòa tan ôxy bão hòa.
- Van Slyke (1922): sức đệm β tại DIC không đổi.
- Định luật Dalton: ước tính tổng áp suất khí từ ôxy hòa tan.
- Rusten và cộng sự (2006): nitrat hóa theo diện tích giá thể MBBR, r = k·S^0.7.
- Timmons & Ebeling (2010), *Recirculating Aquaculture*: tải ô nhiễm suy từ lượng thức ăn.
- SRAC 453: cột áp tuần hoàn, tỉ lệ khí/nước của tháp khử CO₂ và hiệu suất hấp thụ của côn ôxy.
- NOAA, *North Central Regional Aquaculture Conference* (1997), mục Alkalinity: khoảng độ kiềm RAS 150–200 mg/L CaCO₃.
- SEAFDEC/AQD, *Farming Mangrove Crab*: khoảng pH nuôi cua Scylla.
- iRAS: tham khảo bố cục hệ thống, ngưỡng chất lượng nước và một số hệ số mô hình.

## Giới hạn và giấy phép tham khảo

Đây là mô hình minh họa với giả định khối trộn đều; thông số mẫu và kết quả không thay thế đo đạc, thiết kế kỹ thuật hay tư vấn chuyên gia. Một số phép tính xấp xỉ mol/kg ≈ mol/L. Các hệ số dị dưỡng, ozone và tổng áp suất khí (TGP) là các giá trị gần đúng cần được hiệu chỉnh theo điều kiện từng trại.

iRAS và waterkit là các dự án tham khảo mang giấy phép AGPL-3.0. Dự án này không sao chép mã nguồn của chúng; các công thức và phần triển khai được xây dựng độc lập từ tài liệu được dẫn nguồn.
