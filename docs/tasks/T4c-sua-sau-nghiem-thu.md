# T4c · Sửa sau nghiệm thu T4

Claude đã kiểm `/thiet-ke` trên trình duyệt. Kết quả: **chưa đạt**. Phần tính toán hợp lý: 100 hộp, Q 150 L/phút, sump tối thiểu 750 L, cột áp bơm 2,76 m, độ đồng đều 96,85%, mỗi hộp thay nước sau 9,17 phút. Ràng buộc của T4 giữ nguyên, không commit.

## A. Quyết định thiết kế nhánh xả cặn (Claude quyết, Codex cài đặt)
Vấn đề Codex nêu là đúng: ống chữ Z từ đáy hộp đi lên ống góp ở mép hộp thì không tự chảy được. Sửa như sau:

1. **Xả cặn liên tục bằng ống tràn có ống bọc khía rãnh ở chân.** Đây là kiểu ống hút đáy (bottom-draw standpipe), mô tả trong Louisiana Sea Grant: "screen mesh around standpipe", "notches at bottom of larger PVC".
   - Ống đứng bên trong (DN21) đặt mực nước.
   - Ống bọc ngoài (DN34) có các rãnh ở chân, đặt ngay trên hố gom cặn. Nước tràn bị hút từ đáy hố gom, mang cặn theo, rồi chảy ra ống góp tràn và thoát ở mép sau hộp.
   - Toàn bộ là tự chảy, vì ống góp đặt thấp hơn mực nước trong hộp.
   - Vì vậy ống góp ở mép sau là **ống góp tràn kiêm xả cặn**. Bỏ ống góp xả cặn riêng ở mép hộp.
2. **Xả rửa định kỳ qua đáy.** Lỗ đáy hố gom → ống chữ Z đi **xuống** → van xả tay (tuỳ chọn mỗi hộp) → **ống thu xả rửa** chạy dưới mỗi tầng, có độ dốc → ống đứng thoát.
   - Đây là nhánh không chạy liên tục. Không cộng vào lưu lượng thiết kế.
   - Ống thu xả rửa phải nằm thấp hơn đáy hộp và cao hơn đỉnh hộp ở tầng dưới. Tự kiểm tra khoảng hở và báo lỗi khi khoảng cách tầng không đủ.
   - Có tuỳ chọn tắt nhánh này cho loại hộp không có van đáy.
3. Cập nhật theo hai thay đổi trên: `decompose`, `bom`, `hydraulics` (Manning cho ống góp tràn kiêm xả cặn và cho ống thu xả rửa), cảnh 3D, chế độ "Một hộp", test đếm tay. Bỏ cảnh báo "không thể xác nhận tự chảy". Thêm kiểm tra cao độ: cảnh báo nếu ống góp tràn cao hơn mực nước hộp, hoặc nếu ống thu xả rửa đi lên ở bất kỳ đoạn nào.

## B. Khung 3D
- **Camera tự bao trọn mô hình** khi mở trang, khi đổi cấu hình và khi bấm "Toàn cảnh" hoặc "Một hộp". Tính từ khung bao `Box3`, kèm lề khoảng 10%. Hiện kệ 2 × 5 × 10 chỉ chiếm khoảng 1/5 khung, còn chế độ một hộp bị cắt mất phần trên.
- **Nền cảnh tối** cho khớp website, giống cảnh `/quy-trinh`, không để nền sáng.
- **Nhãn chú thích:** đổi sang nhãn HTML đặt trên canvas, chiếu toạ độ 3D ra màn hình, cỡ chữ 12–13 px, có đường dẫn tới bộ phận. Không dùng sprite nhỏ. Các nhãn không được đè nhau.
- **Thanh nút và ô chọn lớp phải xuống dòng** trong panel, không bị cắt ở mép phải. Kiểm ở độ rộng 746 px và 375 px.

## C. Các mục còn dở của T4
- **Mục 2:** hạt chạy trong ống theo đúng chiều và tốc độ từng đoạn, dựa trên lưu lượng mỗi đoạn trong `hydraulics`. Nhánh xả rửa chỉ có hạt khi bật nút "Xả rửa".
- **Mục 4:** kiểm từng nút của mạng ống. Mọi đầu ống hoặc nối vào phụ kiện, hoặc có nút bịt. Không còn đoạn hở. Mọi đoạn tự chảy có độ dốc dương theo chiều chảy. Thêm test duyệt đồ thị mạng cho cả ba kiểu bố trí.
- **Mục 7:** đo FPS trong trình duyệt thật bằng `requestAnimationFrame` khi xoay 1000 hộp, hiển thị chỉ số FPS ở góc khi bật `?fps=1`. Nếu dưới 30 FPS thì tự giảm chi tiết khi số hộp lớn hơn 300: bỏ lỗ cửa, bỏ lưới hố gom, giữ phần thân.

## Tiêu chí nghiệm thu
- `npx.cmd tsc --noEmit`, `npm.cmd test` và `npm.cmd run build` đều đạt. Tự kiểm vẫn 48/48.
- Có test cho ống hút đáy, ống thu xả rửa, kiểm cao độ và duyệt đồ thị mạng.
- Claude sẽ kiểm trên trình duyệt:
  - camera bao trọn mô hình;
  - nhãn đọc được và không đè nhau;
  - không tràn ngang ở 746 px và 375 px;
  - không còn cảnh báo tự chảy ở cấu hình mặc định.
