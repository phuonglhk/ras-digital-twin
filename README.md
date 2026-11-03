# Mô hình số hệ thống RAS

Ứng dụng minh hoạ hệ thống nuôi thủy sản tuần hoàn: xem mô hình 3D, sơ đồ P&ID, chất lượng nước dọc tuyến và các tình huống vận hành. Thư viện thiết bị và máy tính hỗ trợ học tập và ước tính sơ bộ.

## Chạy trên máy

```sh
npm install
npm run assets
npm run dev
npm test
```

Trên Windows nếu PowerShell chặn các tập lệnh, dùng `npm.cmd` thay cho `npm`. Mở địa chỉ do máy chủ phát triển cung cấp. Tại `/quy-trinh`, chuyển giữa mô hình 3D và sơ đồ P&ID, chọn thiết bị để xem chi tiết; nút tải SVG hoạt động trên trang cục bộ. Mở `/quy-trinh?selftest=1` để xem bảng đối chiếu 48 chỉ số.

Chạy `npm run baseline` chỉ sau khi chủ ý thay đổi mô hình và đã kiểm tra kết quả: lệnh ghi lại bảng chuẩn dùng chung cho trang tự kiểm và kiểm thử. Chạy `npm run format` để định dạng mã trong `src/`.

## Cấu trúc

- `src/model/`: công thức, tham số loài, mô phỏng, bảng chuẩn và kiểm thử.
- `src/twin/`: dựng cảnh 3D từ tài nguyên Blockbench.
- `src/ui/`: giao diện, sơ đồ SVG, biểu đồ và nội dung thiết bị.
- `assets-src/`: tài nguyên Blockbench nguồn; `tools/import-bbmodel.mjs` chuyển chúng thành `public/models.json` bằng `npm run assets`. Thêm hoặc sửa tài nguyên trong thư mục nguồn rồi chạy lại lệnh này.
- `docs/`: tài liệu và đặc tả công việc.

## Nguồn và giới hạn

Các quan hệ được triển khai độc lập từ tài liệu: Emerson và cộng sự (1975), *Aqueous ammonia equilibrium calculations* (NH₃/NH₄⁺); Khoo và cộng sự (1977), cân bằng amoni trong nước biển; Dickson, Sabine & Christian (2007), *Guide to Best Practices for Ocean CO₂ Measurements* (hệ cacbonat); Benson & Krause (1984), độ hòa tan ôxy; Rusten và cộng sự (2006), động học lọc sinh học MBBR; Timmons & Ebeling (2010), *Recirculating Aquaculture* (tải thức ăn). Thông số và nguồn bổ sung được ghi trên trang thiết bị và trong mã mô hình.

Đây là mô hình khối trộn đều, dùng hệ số và kịch bản minh họa, không dự đoán đầy đủ hệ sinh học thực tế; giá trị đầu vào mẫu không phải khuyến nghị thiết kế. Cần đo thực tế, hiệu chỉnh theo trại và tham khảo chuyên gia trước khi vận hành hoặc thiết kế.

iRAS và waterkit là các dự án tham khảo có giấy phép AGPL-3.0. Dự án này không sao chép mã nguồn của chúng; sơ đồ SVG được tự viết. Các công thức và tài liệu khoa học được ghi nguồn riêng.
