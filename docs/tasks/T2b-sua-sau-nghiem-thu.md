# T2b · Sửa sau nghiệm thu T2

Claude đã nghiệm thu T2 trên trình duyệt. Kết quả: **chưa đạt**. Ba lệnh kiểm tra đều qua, nhưng có lỗi chặn và nội dung chưa đúng đề bài. Ràng buộc của T1 và T2 vẫn giữ nguyên: không chép code iRAS hay waterkit, chữ hiển thị tiếng Việt, không commit.

## A. Lỗi chặn: trang `/quy-trinh` sập, cả website trắng trang
- Tái hiện: mở thẳng `http://localhost:5310/quy-trinh` khi chạy dev, StrictMode đang bật.
- Lỗi: `TypeError: Cannot read properties of null (reading 'precision')` trong `new WebGLRenderer` ← `new TwinScene` ← `TwinView.tsx`.
- Nguyên nhân rất có thể: StrictMode chạy effect hai lần. Lần dọn dẹp gọi `forceContextLoss()` trên canvas, lần gắn thứ hai tạo renderer trên chính canvas đã mất context.
- Sửa:
  - Mỗi lần gắn thì tạo canvas mới, hoặc không ép mất context trên canvas sẽ được dùng lại. Áp dụng cho mọi nơi tạo renderer, gồm `TwinScene` và `EquipmentView`.
  - Thêm error boundary cho từng route. Khi lỗi, hiện thông báo tiếng Việt và nút "Tải lại trang", không để cả website trắng.
- Kiểm: mở thẳng `/quy-trinh`; đi `/` → `/thiet-bi/mbbr` → `/quy-trinh` → `/thiet-bi/loc-trong` → `/quy-trinh`. Console không có lỗi. Số WebGL context sống luôn là 1.

## B. Chất lượng code
- Viết lại các file mới cho dễ đọc: mỗi câu lệnh một dòng, tên biến có nghĩa, dòng dài tối đa 120 ký tự. Các file gồm `Site.tsx`, `ui/EquipmentView.tsx`, `ui/catalog.ts`, `model/calculators.ts`, `model/calculators.test.ts` và phần thêm trong `equipment.ts`.
- Được thêm `prettier` làm devDependency, cấu hình `printWidth: 120`, script `npm run format`, và chạy cho toàn bộ `src/`.
- Tách dữ liệu nội dung thiết bị (`catalog`) khỏi component. Mỗi thiết bị một object có kiểu rõ ràng.

## C. Nội dung trang thiết bị phải riêng cho từng máy
Hiện các trang dùng chung hai đoạn khuôn mẫu, sơ đồ "Khí cấp → Tiếp xúc → Khí hoặc cặn ra" cũng dùng chung. Sửa như sau:
- **Nguyên lý:** 3–5 đoạn viết riêng cho từng thiết bị, gồm cách hoạt động, điểm cần chú ý khi thiết kế, sự cố vận hành thường gặp và bảo trì.
- **Sơ đồ dòng vào ra:** viết riêng cho từng máy. Ví dụ lọc trống: nước có cặn vào trong trống → nước sạch qua lưới ra ngoài; nước rửa phun ngược → máng gom → cặn xả. Côn ôxy: nước vào đỉnh, ôxy tinh khiết vào đỉnh → bọt khí bị giữ trong côn → nước giàu ôxy ra đáy.
- **Thông số điển hình:** giá trị trong tài liệu, không phải giá trị mặc định của máy tính. Mỗi dòng ghi nguồn. Ví dụ:
  - Lưới lọc trống 40–100 µm.
  - Giá thể K1 khoảng 500 m²/m³, tỉ lệ nạp 40–67%.
  - Tháp khử CO₂ G:L 5–10.
  - Liều UV 30–100 mJ/cm².
  - Côn ôxy hấp thụ 70–90%.
  - Cột áp bơm RAS 3–10 m.
  
  Không dùng câu nguồn "giá trị minh hoạ của mô hình T1".
- **Số đếm hiển thị số nguyên:** số hộp, số đèn, số con.
- Thêm test Vitest kiểm hai điều: không đoạn nguyên lý nào trùng giữa các thiết bị, và mọi dòng thông số đều có nguồn không rỗng và không chứa "T1".

## D. Các mục Codex tự báo là chưa làm
- **Nhãn bộ phận khi bấm vào 3D phải đúng bộ phận.** Builder gắn `userData.part` cho từng nhóm bộ phận lúc dựng hình. Raycast tìm ngược lên tổ tiên để lấy `part`. Bộ phận được chọn phải nổi bật (đổi màu hoặc viền), và nút tên bộ phận cũng làm nổi bật đúng bộ phận đó trong 3D.
- **Tách đạm:** máy tính có công tắc ozone. Bật lên thì DOM giảm 70% thay vì 40% và có thêm lượng ôxy hoá NO₂⁻, dùng đúng hàm của T1.
- **MBBR:** chọn K1, K3, K5 hoặc tự nhập diện tích riêng.
- **Đổi đơn vị:** đủ các mục trong T2. Gồm TAN, NH₃, NH₄⁺ theo N và theo ion; NO₂⁻-N và NO₂⁻; NO₃⁻-N và NO₃⁻; kiềm mg/L CaCO₃, mmol/L và dKH; độ mặn và tỉ trọng gần đúng. Có test với số đối chiếu, ví dụ 1 mg NO₃⁻-N/L = 4,427 mg NO₃⁻/L.
- **Khử nitrat:** mô hình riêng là bể thiếu khí có máy khuấy chìm và bơm định lượng methanol, không có bọt khí. Hình động là cánh khuấy quay và giọt methanol.
- **Kệ hộp cua:** hình động là nước nhỏ vào từng hộp và chảy trong ống tràn. Không dùng kiểu "cả mô hình chuyển động".
- **Bơm và máy thổi khí:** chế độ cắt lớp nhìn thấy cánh bơm hoặc rotor đang quay.

## E. Trang chủ
- Sơ đồ "Hành trình của dòng nước" phải bắt đầu từ bể nuôi (hoặc kệ hộp cua) và theo đúng `UNIT_ORDER` của mô hình: … bơm → côn ôxy → UV → hồi về. Vẽ thêm nhánh khử nitrat.
- Kiểm tra ảnh thu nhỏ của thẻ thiết bị đều hiện, không có ô trống.

## Tiêu chí nghiệm thu
- Ba lệnh kiểm tra đều đạt.
- Đi tuần tự qua 19 route trong dev, console không có lỗi nào, số WebGL context sống không quá 1.
- Đạt các test mới ở mục C và D.
- Báo cáo kèm danh sách mục đã sửa theo đúng ký hiệu A–E.
