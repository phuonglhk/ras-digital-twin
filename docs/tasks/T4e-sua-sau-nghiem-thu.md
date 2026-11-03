# T4e · Sửa sau nghiệm thu T4d E–I

T4d E–I đã đạt nghiệm thu và được commit ở `0c47135`. Khi kiểm trên trình duyệt, Claude thấy còn các lỗi dưới đây. Ràng buộc giữ nguyên: giao diện tiếng Việt, không commit, không push, không tạo tệp tạm trong repo.

## A. Đèn UV ước tính quá nhiều đèn (lỗi tính toán)
Công cụ `den-uv` trong `src/model/calculators.ts` dùng hệ số 0,0012 kW·giờ/(m³·mJ/cm²). Với 9 m³/giờ ở liều 40 mJ/cm², công cụ ra 12 đèn 40 W. Với 1000 hộp, tức 90 m³/giờ, công cụ ra 120 đèn (4,8 kW). Con số này cao khoảng 3–4 lần so với mức thường gặp.

Sửa như sau:
1. **Đổi cách ước tính sang công suất xử lý của mỗi đèn.**
   - Gọi `q40` là lưu lượng một đèn 40 W xử lý được ở liều chuẩn 30 mJ/cm² và UVT 90%. Mặc định `q40` = 2,5 m³/giờ. Ghi rõ đây là giả định kiểu catalogue, cần đối chiếu nhà cung cấp.
   - Số đèn = ⌈ Q × (liều / 30) × (hệ số UVT) / q40 ⌉.
   - Hệ số UVT lấy từ một bảng hiệu chỉnh đơn giản, có ghi nguồn. Nếu không tìm được nguồn đáng tin thì dùng 90 / UVT và ghi là gần đúng.
   - Kiểm tay: 9 m³/giờ ở 40 mJ/cm² và UVT 90% cho khoảng 5 đèn.
2. **Hiện `q40` thành ô nhập** trong công cụ `/cong-cu/den-uv` và trong mục Phòng lọc.
3. **Cập nhật test liên quan**, gồm `calculators.test.ts` và test của phòng lọc. Chú thích ngay trong test cách tính tay ra giá trị mong đợi.
4. **Nội dung trang thiết bị UV** (`equipmentContent.ts`) phải khớp với cách tính mới.
5. **Tự kiểm vẫn phải đạt 48/48.** Nếu có mục tự kiểm nào phụ thuộc vào cách tính cũ, báo ra, không được tự sửa ngưỡng.

## B. Khung nhìn "Toàn cảnh"
Ống chính dài khoảng 10 m chạy tới phòng lọc làm khung bao bị kéo rộng. Kết quả là các kệ chỉ chiếm khoảng 1/3 khung và kệ bên trái gần bị cắt.

Sửa như sau:
- Ở "Toàn cảnh", camera chỉ bao các kệ cùng ống đứng và cụm van ở đầu khối, lề khoảng 10%. Đoạn ống chính tới phòng lọc được phép chạy ra ngoài khung.
- Thêm nút "Gồm ống chính" để xem cả tuyến ống tới phòng lọc.
- Khi đổi cấu hình, camera tự bao lại theo cách trên.
- Cấu hình mặc định 2×5×10 và cấu hình 1000 hộp phải nằm trọn trong khung, không bị cắt mép.
- Cuộn chuột trên canvas thì phóng to mô hình, không cuộn trang. Phóng to hướng về vị trí con trỏ.

## C. Định dạng số và nhất quán
- Quy cách thiết bị phòng lọc trong bảng vật tư phải dùng dấu phẩy thập phân như phần còn lại của trang (ví dụ "2,25 m³", "Ø 0,57 m"). Dùng `format.ts`. Riêng tệp CSV và JSON tải về giữ nguyên dạng số máy đọc được.
- Tóm tắt chất lượng nước đang tính theo bộ lọc mặc định của mô hình, nên ở 1000 hộp TAN hiện 1,88 mg/L. Cần tính theo phòng lọc đề xuất: MBBR với diện tích giá thể đã tính và Q của hệ. Nếu chưa làm được thì ghi rõ trên trang rằng tóm tắt đang dùng bộ lọc mặc định, kèm lý do.
- Diện tích sàn cho 1000 hộp: Codex báo 72,24 m², nhưng trang hiện 57,6 m² với cấu hình 25 hộp mỗi tầng × 10 tầng × 4 kệ. Hãy giải thích con số nào đúng và ứng với bố trí nào. Nếu có lỗi tính thì sửa. Có test cho cả hai bố trí.

## Tiêu chí nghiệm thu
- `npm.cmd run format`, `npx.cmd tsc --noEmit`, `npm.cmd test` và `npm.cmd run build` đều đạt. Tự kiểm vẫn 48/48.
- Báo cáo nêu số đèn UV mới cho 100 hộp và cho 1000 hộp.
- Claude sẽ kiểm trên trình duyệt:
  - "Toàn cảnh" bao trọn các kệ ở cả hai cấu hình;
  - phòng lọc ghi số bằng dấu phẩy;
  - không tràn ngang ở 746 px và 375 px.
